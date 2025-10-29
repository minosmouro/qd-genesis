"""
Celery tasks for refresh scheduling system
"""
import logging
from datetime import datetime
from celery import shared_task

# pylint: disable=import-error
from properties.services.refresh_scheduler_service import RefreshSchedulerService

logger = logging.getLogger(__name__)


@shared_task(bind=True, name='refresh_scheduler.check_and_execute_schedules')
def check_and_execute_schedules(self):  # pylint: disable=unused-argument
    """
    Task que roda periodicamente para verificar e executar schedules
    Deve ser executada a cada minuto via cron
    """
    from app import create_app
    
    app = create_app()
    with app.app_context():
        try:
            logger.info("Starting scheduled refresh check at %s", datetime.utcnow())
            # Verificar schedules que devem ser executados
            total_checked, executed_schedules = RefreshSchedulerService.check_schedules_to_run()
            if executed_schedules:
                logger.info(
                    "Executed %d schedules out of %d checked",
                    len(executed_schedules), total_checked
                )
                # Logar resultados de cada schedule executado
                for schedule_info in executed_schedules:
                    if schedule_info['success']:
                        logger.info(
                            "Schedule '%s' (ID: %d) executed successfully: %s",
                            schedule_info['schedule_name'],
                            schedule_info['schedule_id'],
                            schedule_info['result'].get('message', '')
                        )
                    else:
                        logger.error(
                            "Schedule '%s' (ID: %d) failed: %s",
                            schedule_info['schedule_name'],
                            schedule_info['schedule_id'],
                            schedule_info['result'].get('error', 'Unknown error')
                        )
            else:
                logger.debug("No schedules to execute at this time (%d checked)", total_checked)
            return {
                'total_checked': total_checked,
                'schedules_executed': len(executed_schedules),
                'executed_schedules': executed_schedules,
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:  # pylint: disable=broad-except
            logger.error("Error in check_and_execute_schedules task: %s", str(e))
            # Re-raise para que o Celery marque como failed
            raise


@shared_task(bind=True, name='refresh_scheduler.process_pending_jobs')
def process_pending_jobs(self, batch_size=10):  # pylint: disable=unused-argument
    """
    Task que processa jobs pendentes de refresh
    """
    from app import create_app
    from models import RefreshJob, Property
    from extensions import db
    from flask import g
    
    app = create_app()
    with app.app_context():
        try:
            # Buscar jobs pendentes
            pending_jobs = RefreshJob.query.filter(
                RefreshJob.status == 'pending'
            ).order_by(
                RefreshJob.scheduled_at.asc(),
                RefreshJob.created_at.asc()
            ).limit(batch_size).all()
            
            if not pending_jobs:
                return {'jobs_processed': 0, 'message': 'No pending jobs'}
                
            jobs_successful = 0
            jobs_failed = 0
            
            for job in pending_jobs:
                try:
                    # Marcar como running
                    job.status = 'running'
                    job.started_at = datetime.utcnow()
                    db.session.commit()
                    
                    # Obter propriedade e tenant_id
                    property_obj = Property.query.get(job.property_id)
                    if not property_obj:
                        raise Exception(f"Property {job.property_id} not found")
                    
                    # CRÍTICO: Importar PropertyService ANTES de definir contexto
                    from properties.services.property_service import PropertyService
                    
                    # Definir tenant_id no contexto Flask
                    g.tenant_id = property_obj.tenant_id
                    
                    # Log para debug
                    logger.info(f"Job {job.id}: Contexto definido - tenant_id={g.tenant_id}, property_id={job.property_id}")
                    
                    # Chamar refresh com contexto correto
                    success, result = PropertyService.refresh_property(job.property_id)
                    
                    if success:
                        job.status = 'completed'
                        job.completed_at = datetime.utcnow()
                        job.error_message = None
                        jobs_successful += 1
                    else:
                        job.status = 'failed'
                        job.completed_at = datetime.utcnow()
                        job.error_message = str(result) if result else 'Refresh failed'
                        jobs_failed += 1
                    
                    db.session.commit()
                    
                except Exception as e:  # pylint: disable=broad-except
                    job.status = 'failed'
                    job.completed_at = datetime.utcnow()
                    job.error_message = str(e)
                    db.session.commit()
                    jobs_failed += 1
                    
            return {
                'jobs_processed': len(pending_jobs),
                'jobs_successful': jobs_successful,
                'jobs_failed': jobs_failed
            }
        except Exception as e:  # pylint: disable=broad-except
            raise


@shared_task(bind=True, name='refresh_scheduler.process_single_job')
def process_single_job(self, job_id):  # pylint: disable=unused-argument
    """
    Task para processar um job específico de refresh
    Usado para refreshes individuais ou prioritários
    Args:
        job_id: ID do job a ser processado
    """
    import time  # pylint: disable=import-outside-toplevel
    start_time = time.time()
    logger.info(
        "[Celery] Iniciando processamento do job %d | timestamp=%s",
        job_id, datetime.utcnow().isoformat()
    )
    logger.debug("[Celery] Payload recebido: job_id=%s", job_id)
    try:
        success, result = RefreshSchedulerService.process_refresh_job(job_id)
        elapsed = time.time() - start_time
        if success:
            logger.info(
                "[Celery] Job %d concluído com sucesso em %.2fs: %s",
                job_id, elapsed, result.get('message', '')
            )
        else:
            logger.error(
                "[Celery] Job %d falhou em %.2fs: %s",
                job_id, elapsed, result.get('error', 'Unknown error')
            )
        logger.debug("[Celery] Resultado do job %d: %s", job_id, result)
        return {
            'job_id': job_id,
            'success': success,
            'result': result,
            'timestamp': datetime.utcnow().isoformat(),
            'elapsed': elapsed
        }
    except Exception as e:  # pylint: disable=broad-except
        elapsed = time.time() - start_time
        logger.error(
            "[Celery] Erro ao processar job %d em %.2fs: %s",
            job_id, elapsed, str(e)
        )
        raise


@shared_task(bind=True, name='refresh_scheduler.cleanup_old_jobs')
def cleanup_old_jobs(self, days_to_keep=30):  # pylint: disable=unused-argument
    """
    Task de limpeza para remover jobs antigos
    Deve rodar diariamente para manter o banco limpo
    Args:
        days_to_keep: Quantos dias de histórico manter
    """
    try:
        # pylint: disable=import-error,import-outside-toplevel
        from models import RefreshJob
        from extensions import db
        from datetime import timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        logger.info("Starting cleanup of refresh jobs older than %s", cutoff_date)
        # Deletar jobs completed/failed mais antigos que cutoff_date
        deleted_count = RefreshJob.query.filter(
            RefreshJob.status.in_(['completed', 'failed']),
            RefreshJob.completed_at < cutoff_date
        ).delete(synchronize_session=False)
        db.session.commit()
        logger.info("Cleanup complete: removed %d old refresh jobs", deleted_count)
        return {
            'jobs_deleted': deleted_count,
            'cutoff_date': cutoff_date.isoformat(),
            'timestamp': datetime.utcnow().isoformat()
        }
    except Exception as e:  # pylint: disable=broad-except
        logger.error("Error in cleanup_old_jobs task: %s", str(e))
        raise


@shared_task(bind=True, name='refresh_scheduler.health_check')
def health_check(self):  # pylint: disable=unused-argument
    """
    Task de health check para monitorar o sistema
    Verifica se há jobs presos, schedules com problemas, etc.
    """
    try:
        # pylint: disable=import-error,import-outside-toplevel
        from models import RefreshJob, RefreshSchedule
        from datetime import timedelta
        logger.info("Starting refresh scheduler health check")
        # Verificar jobs "running" há muito tempo (mais de 1 hora)
        stale_threshold = datetime.utcnow() - timedelta(hours=1)
        stale_jobs = RefreshJob.query.filter(
            RefreshJob.status == 'running',
            RefreshJob.started_at < stale_threshold
        ).all()
        if stale_jobs:
            logger.warning(
                "Found %d stale jobs running for more than 1 hour", len(stale_jobs)
            )
            # Marcar como failed
            for job in stale_jobs:
                job.status = 'failed'
                job.completed_at = datetime.utcnow()
                job.error_message = (
                    'Job timed out - marked as failed by health check'
                )
            # pylint: disable=import-error,import-outside-toplevel
            from extensions import db
            db.session.commit()
        # Contar jobs pendentes
        pending_jobs_count = RefreshJob.query.filter_by(status='pending').count()
        # Contar schedules ativos
        active_schedules_count = RefreshSchedule.query.filter_by(is_active=True).count()
        health_status = {
            'stale_jobs_fixed': len(stale_jobs),
            'pending_jobs_count': pending_jobs_count,
            'active_schedules_count': active_schedules_count,
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'healthy'
        }
        # Definir status baseado nos números
        if len(stale_jobs) > 10:
            health_status['status'] = 'warning'
        if pending_jobs_count > 1000:
            health_status['status'] = 'critical'
        logger.info("Health check complete: %s", health_status['status'])
        return health_status
    except Exception as e:  # pylint: disable=broad-except
        logger.error("Error in health_check task: %s", str(e))
        raise
