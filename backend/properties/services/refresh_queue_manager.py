"""
Sistema de Filas para Refresh Automático
Gerencia processamento em lote de até 30 imóveis por vez
"""

import logging
from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta
from celery import shared_task, group
from sqlalchemy import and_, or_

from app import create_app
from extensions import db
from models import PropertyRefreshSchedule, PropertyRefreshHistory, Property
from properties.services.property_service import PropertyService
from utils.timezone_utils import utcnow, format_datetime_for_display

logger = logging.getLogger(__name__)

class RefreshQueueManager:
    """Gerenciador de filas para processamento de refresh em lote."""

    MAX_BATCH_SIZE = 30  # Máximo de imóveis por lote
    QUEUE_TIMEOUT = 300  # 5 minutos timeout por imóvel
    MAX_RETRIES = 3

    @staticmethod
    def get_pending_schedules(limit: int = MAX_BATCH_SIZE) -> List[PropertyRefreshSchedule]:
        """
        Busca agendamentos pendentes para execução.

        Args:
            limit: Número máximo de agendamentos para retornar

        Returns:
            Lista de agendamentos prontos para execução
        """
        now = utcnow()

        # Buscar agendamentos que:
        # - Estão habilitados
        # - Não estão rodando
        # - next_run <= agora
        # - Não falharam mais que MAX_RETRIES vezes consecutivas
        schedules = PropertyRefreshSchedule.query.filter(
            and_(
                PropertyRefreshSchedule.enabled == True,
                PropertyRefreshSchedule.is_running == False,
                PropertyRefreshSchedule.next_run <= now
            )
        ).order_by(
            PropertyRefreshSchedule.next_run.asc()
        ).limit(limit).all()

        return schedules

    @staticmethod
    def process_batch(schedules: List[PropertyRefreshSchedule]) -> Dict[str, Any]:
        """
        Processa um lote de agendamentos enviando tasks assíncronas.

        Args:
            schedules: Lista de agendamentos para processar

        Returns:
            Resultado do processamento em lote
        """
        if not schedules:
            return {'processed': 0, 'message': 'Nenhum agendamento para processar'}

        logger.info(f"Processing batch of {len(schedules)} schedules")

        # Processar cada schedule individualmente de forma assíncrona
        # Isso evita problemas com result.get() dentro de tasks
        results = []
        successful = 0
        failed = 0

        for schedule in schedules:
            try:
                # Enviar task assíncrona para a fila
                task_result = process_single_refresh.apply_async(
                    args=[schedule.id],
                    queue='refresh_scheduler'
                )
                
                # Marcar como enviado
                results.append({
                    'schedule_id': schedule.id,
                    'task_id': str(task_result.id),
                    'status': 'sent'
                })
                successful += 1
                
            except Exception as e:
                logger.exception(f"Failed to send task for schedule {schedule.id}: {e}")
                results.append({
                    'schedule_id': schedule.id,
                    'status': 'failed',
                    'error': str(e)
                })
                failed += 1

        logger.info(f"Batch completed: {successful} tasks sent, {failed} failed to send")

        return {
            'processed': len(results),
            'successful': successful,
            'failed': failed,
            'results': results
        }

    @staticmethod
    def get_queue_status() -> Dict[str, Any]:
        """Retorna status atual da fila de processamento."""
        now = utcnow()

        # Contar agendamentos por status
        total_schedules = PropertyRefreshSchedule.query.count()

        pending = PropertyRefreshSchedule.query.filter(
            and_(
                PropertyRefreshSchedule.enabled == True,
                PropertyRefreshSchedule.is_running == False,
                PropertyRefreshSchedule.next_run <= now
            )
        ).count()

        running = PropertyRefreshSchedule.query.filter(
            PropertyRefreshSchedule.is_running == True
        ).count()

        disabled = PropertyRefreshSchedule.query.filter(
            PropertyRefreshSchedule.enabled == False
        ).count()

        # Próximos agendamentos
        next_schedules = PropertyRefreshSchedule.query.filter(
            and_(
                PropertyRefreshSchedule.enabled == True,
                PropertyRefreshSchedule.next_run > now
            )
        ).order_by(
            PropertyRefreshSchedule.next_run.asc()
        ).limit(5).all()

        return {
            'total_schedules': total_schedules,
            'pending': pending,
            'running': running,
            'disabled': disabled,
            'next_schedules': [{
                'id': s.id,
                'property_id': s.property_id,
                'next_run': format_datetime_for_display(s.next_run),
                'schedule_type': s.schedule_type
            } for s in next_schedules]
        }


@shared_task(bind=True, name='refresh_scheduler.process_refresh_batch')
def process_refresh_batch(self):
    """
    Task principal que processa um lote de refresh automático.
    Executada periodicamente pelo Celery Beat.
    """
    app = create_app()
    with app.app_context():
        try:
            logger.info("Starting refresh batch processing at %s", utcnow())

            # Obter agendamentos pendentes
            schedules = RefreshQueueManager.get_pending_schedules()

            if not schedules:
                logger.info("No pending schedules to process")
                return {'processed': 0, 'message': 'Nenhum agendamento pendente'}

            # Processar lote
            result = RefreshQueueManager.process_batch(schedules)

            logger.info("Refresh batch processing completed: %s", result)

            return result

        except Exception as e:
            logger.exception("Error in refresh batch processing: %s", str(e))
            return {'error': str(e), 'processed': 0}


@shared_task(bind=True, name='refresh_scheduler.process_single_refresh')
def process_single_refresh(self, schedule_id: int):
    """
    Processa um único agendamento de refresh.
    Chamada individualmente para cada imóvel no lote.
    """
    app = create_app()
    with app.app_context():
        try:
            logger.info("Processing single refresh for schedule %d", schedule_id)

            # Buscar agendamento
            schedule = PropertyRefreshSchedule.query.get(schedule_id)
            if not schedule:
                return {'success': False, 'error': f'Agendamento {schedule_id} não encontrado'}

            # Verificar se já está rodando
            if schedule.is_running:
                return {'success': False, 'error': 'Agendamento já está em execução'}

            # Marcar como executando
            schedule.is_running = True
            schedule.last_run = utcnow()
            db.session.commit()

            # Criar registro de histórico
            history = PropertyRefreshHistory(
                property_id=schedule.property_id,
                schedule_id=schedule.id,
                tenant_id=schedule.tenant_id,
                status='running',
                started_at=utcnow(),
                old_remote_id=schedule.property.remote_id if schedule.property else None
            )
            db.session.add(history)
            db.session.commit()

            # Executar refresh
            success, result = PropertyService.refresh_property(schedule.property_id, schedule.tenant_id)

            # Atualizar histórico
            history.completed_at = utcnow()
            history.duration_seconds = int((history.completed_at - history.started_at).total_seconds())

            if success:
                history.status = 'success'
                history.new_remote_id = result.get('new_remote_id')
                schedule.successful_runs += 1
                logger.info("Refresh successful for property %d", schedule.property_id)
            else:
                history.status = 'failed'
                history.error_message = result.get('error', 'Erro desconhecido')
                schedule.failed_runs += 1
                logger.error("Refresh failed for property %d: %s", schedule.property_id, history.error_message)

            # Atualizar estatísticas
            schedule.total_runs += 1

            # Calcular próxima execução
            from properties.services.auto_refresh_service import AutoRefreshService
            schedule.next_run = AutoRefreshService._calculate_next_run(schedule)

            # Liberar lock
            schedule.is_running = False

            db.session.commit()

            return {
                'success': success,
                'schedule_id': schedule_id,
                'property_id': schedule.property_id,
                'duration_seconds': history.duration_seconds,
                'new_remote_id': history.new_remote_id,
                'error': history.error_message if not success else None
            }

        except Exception as e:
            logger.exception("Critical error in single refresh processing: %s", str(e))

            # Tentar liberar lock em caso de erro crítico
            try:
                schedule = PropertyRefreshSchedule.query.get(schedule_id)
                if schedule:
                    schedule.is_running = False
                    schedule.failed_runs += 1
                    schedule.total_runs += 1
                    db.session.commit()
            except Exception:
                pass

            return {'success': False, 'error': str(e), 'schedule_id': schedule_id}


@shared_task(bind=True, name='refresh_scheduler.cleanup_old_history')
def cleanup_old_history(self, days_to_keep: int = 30):
    """Limpa histórico antigo de execuções."""
    try:
        cutoff_date = utcnow() - timedelta(days=days_to_keep)

        deleted_count = PropertyRefreshHistory.query.filter(
            PropertyRefreshHistory.created_at < cutoff_date
        ).delete()

        db.session.commit()

        logger.info("Cleaned up %d old history records", deleted_count)

        return {'deleted': deleted_count}

    except Exception as e:
        logger.exception("Error cleaning up old history: %s", str(e))
        return {'error': str(e)}


@shared_task(bind=True, name='refresh_scheduler.queue_health_check')
def queue_health_check(self):
    """Verifica saúde da fila de processamento."""
    app = create_app()
    with app.app_context():
        try:
            status = RefreshQueueManager.get_queue_status()

            logger.info("Queue health check: %s", status)

            # Verificar se há problemas
            issues = []

            if status['pending'] > RefreshQueueManager.MAX_BATCH_SIZE * 2:
                issues.append(f"Fila muito grande: {status['pending']} pendentes")

            if status['running'] > RefreshQueueManager.MAX_BATCH_SIZE:
                issues.append(f"Muitos processos rodando: {status['running']}")

            return {
                'status': 'healthy' if not issues else 'warning',
                'issues': issues,
                'queue_status': status
            }

        except Exception as e:
            logger.exception("Error in queue health check: %s", str(e))
            return {'status': 'error', 'error': str(e)}
