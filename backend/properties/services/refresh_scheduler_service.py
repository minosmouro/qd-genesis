"""
Refresh Scheduler Service - Motor de agendamento automático de refreshes

PADRÃO GLOBAL: Todas as datas/hora do projeto são UTC offset-aware
Use sempre datetime.now(timezone.utc) para garantir UTC
Ao receber datas do frontend, converter para UTC antes de salvar
Ao serializar datas, sempre usar ISO 8601 com sufixo 'Z'
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Tuple
from sqlalchemy import text
from flask import g
from models import RefreshSchedule, RefreshJob, Property
from extensions import db
from ..monitoring import monitor_operation
from .property_service import PropertyService

logger = logging.getLogger(__name__)


class RefreshSchedulerService:
    """Serviço responsável por agendar refreshes automáticos"""

    @staticmethod
    def check_schedules_to_run() -> Tuple[int, List[Dict[str, Any]]]:
        """
        Verifica quais schedules devem ser executados agora

        Returns:
            Tuple[int, List[Dict]]: (total_schedules_processed, schedules_executed)
        """
        try:
            current_time = datetime.now(timezone.utc)
            start_time = (current_time - timedelta(minutes=2)).time()
            end_time = (current_time + timedelta(minutes=2)).time()

            # Buscar schedules ativos que já passaram do horário de execução
            schedules = RefreshSchedule.query.filter(
                RefreshSchedule.is_active.is_(True),
                RefreshSchedule.next_run <= current_time
            ).all()

            executed_schedules = []

            for schedule in schedules:
                # Verificar se deve executar baseado na frequência
                should_run = RefreshSchedulerService._should_schedule_run(schedule, current_time)

                if should_run:
                    success, result = RefreshSchedulerService._execute_schedule(schedule, current_time)
                    executed_schedules.append({
                        'schedule_id': schedule.id,
                        'schedule_name': schedule.name,
                        'success': success,
                        'result': result
                    })

            logger.info(
                "Checked %d schedules, executed %d",
                len(schedules), len(executed_schedules)
            )

            return len(schedules), executed_schedules

        except Exception as e:  # pylint: disable=broad-except
            logger.error("Error checking schedules to run: %s", str(e))
            return 0, []

    @staticmethod
    def _should_schedule_run(schedule: RefreshSchedule, current_time: datetime) -> bool:
        """
        Determina se um schedule deve ser executado baseado na frequência

        Args:
            schedule: Schedule a verificar
            current_time: Horário atual

        Returns:
            bool: True se deve executar
        """
        try:
            # Se é diário (frequency_days = 1), sempre executa
            if schedule.frequency_days == 1:
                return True

            # Para outras frequências, verificar quando foi a última execução
            last_job = RefreshJob.query.filter(
                RefreshJob.refresh_schedule_id == schedule.id,
                RefreshJob.status.in_(['completed', 'running'])
            ).order_by(RefreshJob.created_at.desc()).first()

            if not last_job:
                # Nunca executou, pode executar
                return True

            # Verificar se passou tempo suficiente desde a última execução
            days_since_last = (current_time - last_job.created_at).days

            return days_since_last >= schedule.frequency_days

        except Exception as e:  # pylint: disable=broad-except
            logger.error("Error checking if schedule %d should run: %s", schedule.id, str(e))
            return False

    @staticmethod
    @monitor_operation("execute_schedule")
    def _execute_schedule(schedule: RefreshSchedule, execution_time: datetime) -> Tuple[bool, Dict[str, Any]]:
        """
        Executa um schedule criando jobs para todas as propriedades

        Args:
            schedule: Schedule a executar
            execution_time: Horário de execução

        Returns:
            Tuple[bool, Dict]: (sucesso, resultado)
        """
        try:
            # Buscar propriedades do schedule
            properties = schedule.properties.all()

            if not properties:
                return True, {
                    'message': f'Schedule "{schedule.name}" has no properties',
                    'jobs_created': 0
                }

            jobs_created = 0
            jobs_skipped = 0

            for prop in properties:
                # Verificar se já tem job pendente para esta propriedade
                existing_pending = RefreshJob.query.filter(
                    RefreshJob.property_id == prop.id,
                    RefreshJob.status == 'pending'
                ).first()

                if existing_pending:
                    jobs_skipped += 1
                    logger.debug(
                        "Skipping property %d - already has pending job",
                        prop.id
                    )
                    continue

                # Criar job agendado
                job = RefreshJob()
                job.property_id = prop.id
                job.refresh_schedule_id = schedule.id
                job.scheduled_at = execution_time
                job.refresh_type = 'scheduled'
                job.status = 'pending'
                db.session.add(job)
                jobs_created += 1

            # Atualizar next_run para o próximo agendamento usando função utilitária
            from utils.schedule_utils import calculate_next_run
            schedule.next_run = calculate_next_run(schedule)
            schedule.last_run = execution_time
            db.session.commit()

            logger.info(
                "Schedule %d (%s) executed: %d jobs created, %d skipped",
                schedule.id, schedule.name, jobs_created, jobs_skipped
            )

            return True, {
                'message': f'Schedule "{schedule.name}" executed successfully',
                'jobs_created': jobs_created,
                'jobs_skipped': jobs_skipped,
                'total_properties': len(properties)
            }

        except Exception as e:  # pylint: disable=broad-except
            db.session.rollback()
            logger.error("Error executing schedule %d: %s", schedule.id, str(e))
            return False, {
                'error': f'Failed to execute schedule: {str(e)}'
            }

    @staticmethod
    def get_pending_jobs(limit: int = 50) -> List[RefreshJob]:
        """
        Busca jobs pendentes para execução

        Args:
            limit: Máximo de jobs a retornar

        Returns:
            List[RefreshJob]: Jobs pendentes
        """
        try:
            jobs = RefreshJob.query.filter(
                RefreshJob.status == 'pending'
            ).order_by(
                RefreshJob.scheduled_at.asc(),
                RefreshJob.created_at.asc()
            ).limit(limit).all()

            return jobs

        except Exception as e:  # pylint: disable=broad-except
            logger.error("Error getting pending jobs: %s", str(e))
            return []

    @staticmethod
    @monitor_operation("process_refresh_job")
    def process_refresh_job(job_id: int) -> Tuple[bool, Dict[str, Any]]:
        """
        Processa um job individual de refresh

        Args:
            job_id: ID do job

        Returns:
            Tuple[bool, Dict]: (sucesso, resultado)
        """
        try:
            job = RefreshJob.query.get(job_id)
            if not job:
                return False, {'error': 'Job not found'}

            if job.status != 'pending':
                return False, {'error': f'Job status is {job.status}, expected pending'}

            # Marcar como executando
            job.status = 'running'
            job.started_at = datetime.now(timezone.utc)
            db.session.commit()

            # Executar refresh real
            success, refresh_result = RefreshSchedulerService._perform_property_refresh_with_details(job.property_id)

            if success:
                job.status = 'completed'
                job.completed_at = datetime.now(timezone.utc)
                job.error_message = None

                logger.info(
                    "Refresh job %d completed successfully for property %d",
                    job_id, job.property_id
                )

                result = {
                    'message': 'Refresh completed successfully',
                    'property_id': job.property_id,
                    'job_id': job_id,
                    'refresh_details': refresh_result
                }
            else:
                job.status = 'failed'
                job.completed_at = datetime.now(timezone.utc)
                job.error_message = refresh_result.get('error', 'Refresh operation failed') if isinstance(refresh_result, dict) else 'Refresh operation failed'

                logger.error(
                    "Refresh job %d failed for property %d",
                    job_id, job.property_id
                )

                result = {
                    'error': 'Refresh operation failed',
                    'property_id': job.property_id,
                    'job_id': job_id,
                    'refresh_details': refresh_result
                }

            db.session.commit()
            return success, result

        except Exception as e:  # pylint: disable=broad-except
            # Marcar job como failed se houver erro
            try:
                if 'job' in locals() and job:
                    job.status = 'failed'
                    job.completed_at = datetime.now(timezone.utc)
                    job.error_message = str(e)
                    db.session.commit()
            except Exception:  # pylint: disable=broad-except
                pass

            logger.error("Error processing refresh job %d: %s", job_id, str(e))
            return False, {'error': f'Failed to process job: {str(e)}'}

    @staticmethod
    def _perform_property_refresh_with_details(property_id: int) -> Tuple[bool, Dict[str, Any]]:
        """
        Executa o refresh de uma propriedade usando PropertyService com detalhes

        Args:
            property_id: ID da propriedade

        Returns:
            Tuple[bool, Dict]: (sucesso, detalhes_da_execução)
        """
        try:
            # Buscar propriedade
            prop = Property.query.get(property_id)
            if not prop:
                error_msg = f"Property {property_id} not found for refresh"
                logger.error(error_msg)
                return False, {'error': error_msg}

            logger.info(
                "Performing refresh for property %d (%s)", property_id, prop.title
            )

            # Usar o método real de refresh que faz delete + create no CanalPro
            g.tenant_id = prop.tenant_id

            success, result = PropertyService.refresh_property(property_id)

            if success:
                logger.info(
                    "Property %d refresh completed successfully: %s",
                    property_id, result.get('message', 'Success')
                )
                return True, result
            logger.error(
                "Property %d refresh failed: %s",
                property_id, result.get('error', 'Unknown error')
            )
            return False, result

        except Exception as e:  # pylint: disable=broad-except
            error_msg = "Error performing refresh for property %d: %s" % (property_id, str(e))
            logger.error(error_msg)
            return False, {'error': error_msg, 'exception': str(e)}

    @staticmethod
    @monitor_operation("get_schedule_statistics")
    def get_schedule_statistics(tenant_id: int) -> Dict[str, Any]:
        """
        Obtém estatísticas dos schedules de um tenant

        Args:
            tenant_id: ID do tenant

        Returns:
            Dict[str, Any]: Estatísticas
        """
        try:
            # Contar schedules ativos e inativos
            active_schedules = RefreshSchedule.query.filter_by(
                tenant_id=tenant_id,
                is_active=True
            ).count()

            inactive_schedules = RefreshSchedule.query.filter_by(
                tenant_id=tenant_id,
                is_active=False
            ).count()

            # Jobs das últimas 24h
            yesterday = datetime.utcnow() - timedelta(days=1)
            recent_jobs = RefreshJob.query.join(RefreshSchedule).filter(
                RefreshSchedule.tenant_id == tenant_id,
                RefreshJob.created_at >= yesterday
            ).all()

            # Estatísticas dos jobs
            jobs_completed = sum(1 for job in recent_jobs if job.status == 'completed')
            jobs_failed = sum(1 for job in recent_jobs if job.status == 'failed')
            jobs_pending = sum(1 for job in recent_jobs if job.status == 'pending')
            # jobs_running = sum(1 for job in recent_jobs if job.status == 'running')

            # Contar total de propriedades com schedules ativos
            total_properties = 0
            try:
                active_schedule_ids = [s.id for s in RefreshSchedule.query.filter_by(
                    tenant_id=tenant_id, is_active=True
                ).all()]
                if active_schedule_ids:
                    # Contar propriedades únicas nos schedules ativos
                    result = db.session.execute(text(
                        """
                        SELECT COUNT(DISTINCT rsp.property_id)
                        FROM refresh_schedule_properties rsp
                        WHERE rsp.refresh_schedule_id IN :schedule_ids
                        """
                    ), {"schedule_ids": tuple(active_schedule_ids)})
                    total_properties = result.scalar() or 0
            except Exception as e:  # pylint: disable=broad-except
                logger.warning(
                    "Error counting properties in active schedules: %s",
                    str(e)
                )

            return {
                'total_schedules': active_schedules + inactive_schedules,
                'active_schedules': active_schedules,
                'total_properties': total_properties,
                'jobs_last_24h': {
                    'total': len(recent_jobs),
                    'completed': jobs_completed,
                    'failed': jobs_failed,
                    'pending': jobs_pending
                },
                'schedules_by_status': {
                    'active': active_schedules,
                    'inactive': inactive_schedules
                },
                'success_rate': round(jobs_completed / len(recent_jobs) * 100, 1) if recent_jobs else 0
            }

        except Exception as e:  # pylint: disable=broad-except
            logger.error(
                "Error getting schedule statistics: %s",
                str(e)
            )
            return {
                'total_schedules': 0,
                'active_schedules': 0,
                'total_properties': 0,
                'jobs_last_24h': {
                    'total': 0,
                    'completed': 0,
                    'failed': 0,
                    'pending': 0
                },
                'schedules_by_status': {
                    'active': 0,
                    'inactive': 0
                },
                'success_rate': 0
            }

    @staticmethod
    @monitor_operation("execute_schedule_manually")
    def execute_schedule_manually(schedule_id: int, tenant_id: int) -> Tuple[bool, Dict[str, Any]]:
        """
        Executa um cronograma específico manualmente, criando jobs para todas as propriedades

        Args:
            schedule_id: ID do cronograma
            tenant_id: ID do tenant

        Returns:
            Tuple[bool, Dict]: (sucesso, resultado)
        """
        try:
            schedule = RefreshSchedule.query.filter_by(
                id=schedule_id,
                tenant_id=tenant_id,
                is_active=True
            ).first()
            if not schedule:
                return False, {'error': 'Schedule not found or inactive'}

            # Buscar propriedades do cronograma
            properties = schedule.properties.all()
            logger.info(
                "Found %d properties in schedule %d",
                len(properties), schedule_id
            )

            if not properties:
                logger.warning(
                    "No properties found in schedule %d",
                    schedule_id
                )
                return False, {'error': 'No properties in schedule'}

            jobs_created = 0
            current_time = datetime.utcnow()

            # Criar jobs para todas as propriedades do cronograma
            for property_obj in properties:
                # Verificar se já existe um job pendente para esta propriedade
                existing_job = RefreshJob.query.filter_by(
                    property_id=property_obj.id,
                    status='pending'
                ).first()

                if not existing_job:
                    new_job = RefreshJob()
                    new_job.property_id = property_obj.id
                    new_job.refresh_schedule_id = schedule_id
                    new_job.scheduled_at = current_time
                    new_job.refresh_type = 'manual'
                    new_job.status = 'pending'

                    db.session.add(new_job)
                    jobs_created += 1

            db.session.commit()

            logger.info(
                "Manually executed schedule %d: %d jobs created",
                schedule_id, jobs_created
            )

            return True, {
                'jobs_created': jobs_created,
                'properties_processed': len(properties),
                'schedule_name': schedule.name,
                'executed_at': current_time.isoformat()
            }

        except Exception as e:  # pylint: disable=broad-except
            db.session.rollback()
            logger.error(
                "Error executing schedule manually: %s",
                str(e)
            )
            return False, {'error': f'Failed to execute schedule: {str(e)}'}
