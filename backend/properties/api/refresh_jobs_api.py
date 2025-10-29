"""
API para consulta de jobs de refresh por agendamento.
"""
from flask import Blueprint, jsonify, request
from celery import Celery
from models import RefreshJob, Property, RefreshSchedule

celery_app = Celery()
refresh_jobs_api = Blueprint('refresh_jobs_api', __name__)


@refresh_jobs_api.route('/api/refresh-jobs', methods=['GET'])
def get_refresh_jobs():
    """Retorna lista de jobs de refresh, filtrando por status, agendamento ou propriedade."""
    status = request.args.get('status')
    schedule_id = request.args.get('schedule_id')
    property_id = request.args.get('property_id')
    query = RefreshJob.query

    if status:
        query = query.filter(RefreshJob.status == status)
    if schedule_id:
        query = query.filter(RefreshJob.refresh_schedule_id == schedule_id)
    if property_id:
        query = query.filter(RefreshJob.property_id == property_id)

    jobs = query.order_by(RefreshJob.created_at.desc()).limit(100).all()
    result = []
    for job in jobs:
        prop = Property.query.get(job.property_id)
        schedule = RefreshSchedule.query.get(job.refresh_schedule_id)
        # Dispara a task Celery para jobs pendentes
        if job.status == 'pending':
            print(f"[DEBUG] Disparando Celery para job_id={job.id}")
            celery_app.send_task('refresh_scheduler.process_single_job', args=[job.id])
        # Detecta tipo de erro
        error_type = None
        if job.status == 'failed' and job.error_message:
            if 'CanalPro' in job.error_message or 'canalpro' in job.error_message.lower():
                error_type = 'canalpro'
            else:
                error_type = 'internal'
        result.append({
            'job_id': job.id,
            'property_id': job.property_id,
            'property_name': prop.title if prop else None,
            'schedule_id': job.refresh_schedule_id,
            'schedule_name': schedule.name if schedule else None,
            'status': job.status,
            'refresh_type': job.refresh_type,
            'created_at': job.created_at.isoformat() if job.created_at else None,
            'started_at': job.started_at.isoformat() if job.started_at else None,
            'completed_at': job.completed_at.isoformat() if job.completed_at else None,
            'error_type': error_type,
            'error_message': job.error_message
        })
    return jsonify(result)


@refresh_jobs_api.route('/api/refresh-schedules/<int:schedule_id>/run', methods=['POST'])
def run_schedule_now(schedule_id):
    """
    Executa imediatamente o cronograma, criando e processando jobs para todas as propriedades vinculadas.
    """
    from ..services.refresh_scheduler_service import RefreshSchedulerService
    schedule = RefreshSchedule.query.get(schedule_id)
    if not schedule:
        return jsonify({'error': 'Schedule not found'}), 404
    tenant_id = getattr(schedule, 'tenant_id', 0) or 0
    try:
        success, result = RefreshSchedulerService.execute_schedule_manually(schedule_id, int(tenant_id))
        if success:
            jobs = RefreshJob.query.filter_by(refresh_schedule_id=schedule_id, status='pending').all()
            for job in jobs:
                print(f"[DEBUG] Disparando Celery para job_id={job.id}")
                celery_app.send_task('refresh_scheduler.process_single_job', args=[job.id])
            return jsonify({'message': 'Execução manual disparada com sucesso!', 'result': result}), 200
        return jsonify({'error': 'Falha ao executar manualmente', 'result': result}), 400
    except Exception as e:
        return jsonify({'error': f'Erro inesperado: {str(e)}'}), 500
