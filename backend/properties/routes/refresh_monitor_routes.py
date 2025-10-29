"""
Routes para monitoramento e controle do sistema de refresh scheduling
"""
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from ..services.refresh_scheduler_service import RefreshSchedulerService
from ..monitoring import monitor_operation

logger = logging.getLogger(__name__)

refresh_monitor_bp = Blueprint('refresh_monitor', __name__, url_prefix='/api/refresh-monitor')


@refresh_monitor_bp.route('/statistics', methods=['GET'])
@refresh_monitor_bp.route('/stats', methods=['GET'])  # Alias para compatibilidade
@jwt_required()
@monitor_operation("get_refresh_statistics")
def get_statistics():
    """
    Obtém estatísticas do sistema de refresh para o tenant
    
    Returns:
        JSON com estatísticas de schedules e jobs
    """
    try:
        current_user = get_jwt_identity()
        claims = get_jwt()  # Pegar claims completos
        logger.info("Current user from JWT: %s", current_user)
        logger.info("JWT claims: %s", claims)
        
        # O tenant_id está nos claims, não no identity
        tenant_id = claims.get('tenant_id')
        logger.info("Extracted tenant_id from claims: %s", tenant_id)
            
        if not tenant_id:
            logger.error("No tenant_id found in JWT claims")
            return jsonify({'error': 'No tenant ID found in token'}), 400
        
        stats = RefreshSchedulerService.get_schedule_statistics(tenant_id)
        
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error("Error getting refresh statistics: %s", str(e), exc_info=True)
        return jsonify({'error': 'Failed to get statistics', 'details': str(e)}), 500


@refresh_monitor_bp.route('/jobs/pending', methods=['GET'])
@jwt_required()
@monitor_operation("get_pending_jobs_status")
def get_pending_jobs():
    """
    Lista jobs pendentes do tenant
    
    Query params:
        limit: Máximo de jobs a retornar (default: 20)
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')
        
        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400
        
        limit = min(int(request.args.get('limit', 20)), 100)  # Máximo 100
        
        # Buscar jobs pendentes do tenant
        from models import RefreshJob, RefreshSchedule, Property
        jobs = RefreshJob.query.join(Property).outerjoin(RefreshSchedule).filter(
            Property.tenant_id == tenant_id,
            RefreshJob.status == 'pending'
        ).order_by(
            RefreshJob.scheduled_at.asc(),
            RefreshJob.created_at.asc()
        ).limit(limit).all()
        
        jobs_data = []
        for job in jobs:
            job_dict = job.to_dict()
            job_dict['property_title'] = job.property.title if job.property else None
            job_dict['schedule_name'] = job.schedule.name if job.schedule else None
            jobs_data.append(job_dict)
        
        return jsonify({
            'jobs': jobs_data,
            'total_shown': len(jobs_data),
            'limit': limit
        }), 200
        
    except Exception as e:
        logger.error("Error getting pending jobs: %s", str(e))
        return jsonify({'error': 'Failed to get pending jobs'}), 500


@refresh_monitor_bp.route('/jobs/recent', methods=['GET'])
@jwt_required()
@monitor_operation("get_recent_jobs")
def get_recent_jobs():
    """
    Lista jobs recentes do tenant
    
    Query params:
        hours: Últimas X horas (default: 24)
        limit: Máximo de jobs a retornar (default: 50)
        status: Filtrar por status (opcional)
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')
        
        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400
        
        hours = min(int(request.args.get('hours', 24)), 168)  # Máximo 7 dias
        limit = min(int(request.args.get('limit', 50)), 200)  # Máximo 200
        status_filter = request.args.get('status')
        
        from datetime import datetime, timedelta
        from models import RefreshJob, RefreshSchedule, Property
        
        # Calcular data de corte
        cutoff_date = datetime.utcnow() - timedelta(hours=hours)
        
        # Query base
        query = RefreshJob.query.join(Property).outerjoin(RefreshSchedule).filter(
            Property.tenant_id == tenant_id,
            RefreshJob.created_at >= cutoff_date
        )
        
        # Filtrar por status se fornecido
        if status_filter:
            query = query.filter(RefreshJob.status == status_filter)
        
        jobs = query.order_by(RefreshJob.created_at.desc()).limit(limit).all()
        
        jobs_data = []
        for job in jobs:
            job_dict = job.to_dict()
            job_dict['property_title'] = job.property.title if job.property else None
            job_dict['schedule_name'] = job.schedule.name if job.schedule else None
            jobs_data.append(job_dict)
        
        return jsonify({
            'jobs': jobs_data,
            'total_shown': len(jobs_data),
            'hours': hours,
            'limit': limit,
            'status_filter': status_filter
        }), 200
        
    except Exception as e:
        logger.error("Error getting recent jobs: %s", str(e))
        return jsonify({'error': 'Failed to get recent jobs'}), 500


@refresh_monitor_bp.route('/jobs', methods=['GET'])  # Rota genérica para jobs
@jwt_required()
@monitor_operation("list_jobs")
def list_jobs():
    """
    Lista jobs do tenant com filtros opcionais
    
    Query params:
        status: Filtrar por status (opcional)
        schedule_id: Filtrar por cronograma (opcional)
        start_date: Data de início (formato ISO)
        end_date: Data de fim (formato ISO)
        page: Página (default: 1)
        per_page: Itens por página (default: 20, máx: 100)
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')
        
        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400
        
        # Parâmetros de filtragem
        status_filter = request.args.get('status')
        schedule_id = request.args.get('schedule_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Parâmetros de paginação
        page = max(int(request.args.get('page', 1)), 1)
        per_page = min(int(request.args.get('per_page', 20)), 100)
        
        from datetime import datetime
        from models import RefreshJob, RefreshSchedule, Property
        
        # Query base
        query = RefreshJob.query.join(Property).outerjoin(RefreshSchedule).filter(
            Property.tenant_id == tenant_id
        )
        
        # Aplicar filtros
        if status_filter:
            query = query.filter(RefreshJob.status == status_filter)
        if schedule_id:
            query = query.filter(RefreshJob.refresh_schedule_id == schedule_id)
        if start_date:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(RefreshJob.created_at >= start_dt)
        if end_date:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(RefreshJob.created_at <= end_dt)
        
        # Executar query paginada
        pagination = query.order_by(RefreshJob.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Formatar dados
        jobs_data = []
        for job in pagination.items:
            job_dict = job.to_dict()
            job_dict['property_title'] = job.property.title if job.property else None
            job_dict['schedule_name'] = job.schedule.name if job.schedule else None
            jobs_data.append(job_dict)
        
        return jsonify({
            'data': jobs_data,
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }), 200
        
    except Exception as e:
        logger.error("Error listing jobs: %s", str(e))
        return jsonify({'error': 'Failed to list jobs'}), 500


@refresh_monitor_bp.route('/jobs/<int:job_id>', methods=['GET'])
@jwt_required()
@monitor_operation("get_job_details")
def get_job(job_id):
    """
    Obtém detalhes de um job específico, garantindo o tenant
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')
        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400
        from models import RefreshJob, Property, RefreshSchedule
        job = RefreshJob.query.join(Property).outerjoin(RefreshSchedule).filter(
            RefreshJob.id == job_id,
            Property.tenant_id == tenant_id
        ).first()
        if not job:
            return jsonify({'error': 'Job not found'}), 404
        data = job.to_dict()
        data['property_title'] = job.property.title if job.property else None
        data['schedule_name'] = job.schedule.name if job.schedule else None
        return jsonify(data), 200
    except Exception as e:
        logger.error("Error getting job details: %s", str(e))
        return jsonify({'error': 'Failed to get job details'}), 500


@refresh_monitor_bp.route('/cleanup', methods=['POST'])
@jwt_required()
@monitor_operation("cleanup_old_jobs")
def cleanup_jobs():
    """
    Remove jobs antigos (completed/failed) anteriores a X dias
    Body: { "days": 30 }
    """
    try:
        days = int((request.get_json(silent=True) or {}).get('days', 30))
        # usa a mesma lógica da task mas síncrona
        from datetime import datetime, timedelta
        from models import RefreshJob
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        deleted_count = RefreshJob.query.filter(
            RefreshJob.status.in_(['completed', 'failed']),
            RefreshJob.completed_at < cutoff_date
        ).delete(synchronize_session=False)
        from extensions import db
        db.session.commit()
        return jsonify({
            'message': f'Removed {deleted_count} old jobs older than {days} days',
            'deleted': deleted_count,
            'days': days
        }), 200
    except Exception as e:
        logger.error("Error cleaning up jobs: %s", str(e))
        return jsonify({'error': 'Failed to cleanup jobs'}), 500


@refresh_monitor_bp.route('/manual-trigger', methods=['POST'])
@jwt_required()
@monitor_operation("manual_trigger_schedule")
def manual_trigger():
    """
    Dispara manualmente a execução de um schedule
    
    Body:
    {
        "schedule_id": 123
    }
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')
        
        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400
        
        data = request.get_json()
        if not data or 'schedule_id' not in data:
            return jsonify({'error': 'schedule_id is required'}), 400
        
        schedule_id = data['schedule_id']
        
        # Verificar se schedule existe e pertence ao tenant
        from models import RefreshSchedule
        schedule = RefreshSchedule.query.filter_by(
            id=schedule_id,
            tenant_id=tenant_id
        ).first()
        
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        # Executar schedule manualmente
        from datetime import datetime
        success, result = RefreshSchedulerService._execute_schedule(schedule, datetime.utcnow())
        
        if success:
            return jsonify({
                'message': f'Schedule "{schedule.name}" triggered manually',
                'result': result
            }), 200
        else:
            return jsonify({
                'error': f'Failed to trigger schedule "{schedule.name}"',
                'result': result
            }), 400
        
    except Exception as e:
        logger.error("Error in manual trigger: %s", str(e))
        return jsonify({'error': 'Failed to trigger schedule'}), 500


@refresh_monitor_bp.route('/force-job', methods=['POST'])
@jwt_required()
@monitor_operation("force_process_job")
def force_process_job():
    """
    Força o processamento imediato de um job específico
    
    Body:
    {
        "job_id": 456
    }
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')
        
        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400
        
        data = request.get_json()
        if not data or 'job_id' not in data:
            return jsonify({'error': 'job_id is required'}), 400
        
        job_id = data['job_id']
        
        # Verificar se job existe e pertence ao tenant
        from models import RefreshJob, Property
        job = RefreshJob.query.join(Property).filter(
            RefreshJob.id == job_id,
            Property.tenant_id == tenant_id
        ).first()
        
        if not job:
            return jsonify({'error': 'Job not found'}), 404
        
        # Processar job imediatamente
        success, result = RefreshSchedulerService.process_refresh_job(job_id)
        
        if success:
            return jsonify({
                'message': f'Job {job_id} processed successfully',
                'result': result
            }), 200
        else:
            return jsonify({
                'error': f'Failed to process job {job_id}',
                'result': result
            }), 400
        
    except Exception as e:
        logger.error("Error forcing job processing: %s", str(e))
        return jsonify({'error': 'Failed to process job'}), 500


@refresh_monitor_bp.route('/system-status', methods=['GET'])
@refresh_monitor_bp.route('/health', methods=['GET'])  # Alias para compatibilidade
@jwt_required()
@monitor_operation("get_system_status")
def get_system_status():
    """
    Obtém status geral do sistema de refresh scheduling
    """
    try:
        from datetime import datetime, timedelta
        from models import RefreshJob, RefreshSchedule
        
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')
        
        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400
        
        # Status dos schedules
        active_schedules = RefreshSchedule.query.filter_by(
            tenant_id=tenant_id,
            is_active=True
        ).count()
        
        # Jobs das últimas horas
        last_hour = datetime.utcnow() - timedelta(hours=1)
        recent_jobs = RefreshJob.query.join(RefreshSchedule).filter(
            RefreshSchedule.tenant_id == tenant_id,
            RefreshJob.created_at >= last_hour
        ).all()
        
        # Contadores
        jobs_by_status = {}
        for job in recent_jobs:
            status = job.status
            jobs_by_status[status] = jobs_by_status.get(status, 0) + 1
        
        # Próximos schedules
        now = datetime.utcnow()
        today_schedules = RefreshSchedule.query.filter_by(
            tenant_id=tenant_id,
            is_active=True
        ).all()
        
        next_executions = []
        for schedule in today_schedules:
            # Calcular próxima execução (simplificado)
            next_time = datetime.combine(now.date(), schedule.time_slot)
            if next_time <= now:
                next_time = datetime.combine(
                    (now + timedelta(days=1)).date(), 
                    schedule.time_slot
                )
            
            next_executions.append({
                'schedule_id': schedule.id,
                'schedule_name': schedule.name,
                'next_execution': next_time.isoformat(),
                'properties_count': schedule.properties.count()
            })
        
        # Ordenar por próxima execução
        next_executions.sort(key=lambda x: x['next_execution'])
        
        # Verificar status do Celery
        celery_status = 'disconnected'
        try:
            from celery_app import celery
            # Tentar fazer uma operação simples para verificar conectividade
            inspect = celery.control.inspect()
            stats = inspect.stats()
            if stats and len(stats) > 0:
                celery_status = 'connected'
        except (ImportError, ConnectionError, TimeoutError, ValueError) as e:
            logger.error("Error getting system status: %s", e)
            return jsonify({
                'error': 'Failed to get system status',
                'status': 'error',
                'celery_status': 'disconnected',
                'pending_jobs': 0
            }), 500
        
        return jsonify({
            'status': 'healthy' if celery_status == 'connected' else 'warning',
            'celery_status': celery_status,
            'pending_jobs': jobs_by_status.get('pending', 0),
            'active_schedules': active_schedules,
            'jobs_last_hour': jobs_by_status,
            'next_executions': next_executions[:5],
            'system_time': now.isoformat(),
            'issues': [] if celery_status == 'connected' else ['Celery worker desconectado']
        }), 200
        
    except Exception as e:
        logger.error("Error getting system status: %s", str(e))
        return jsonify({
            'error': 'Failed to get system status',
            'status': 'error'
        }), 500


@refresh_monitor_bp.route('/schedules/<int:schedule_id>/run', methods=['POST'])
@jwt_required()
@monitor_operation("run_schedule_manually")
def run_schedule_manually(schedule_id):
    """
    Executa um cronograma específico manualmente
    
    Args:
        schedule_id: ID do cronograma a ser executado
    
    Returns:
        JSON com resultado da execução
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')
        
        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400
        
        from models import RefreshSchedule
        
        # Verificar se o cronograma existe e pertence ao tenant
        schedule = RefreshSchedule.query.filter_by(
            id=schedule_id,
            tenant_id=tenant_id
        ).first()
        
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        if not schedule.is_active:
            return jsonify({'error': 'Schedule is not active'}), 400
        
        # Executar o cronograma manualmente
        from ..services.refresh_scheduler_service import RefreshSchedulerService
        success, result = RefreshSchedulerService.execute_schedule_manually(schedule_id, tenant_id)
        
        if success:
            return jsonify({
                'message': f'Schedule "{schedule.name}" executed successfully',
                'schedule_id': schedule_id,
                'jobs_created': result.get('jobs_created', 0),
                'properties_processed': result.get('properties_processed', 0)
            }), 200
        else:
            return jsonify({
                'error': 'Failed to execute schedule',
                'details': result.get('error', 'Unknown error')
            }), 500
            
    except Exception as e:
        logger.error("Error executing schedule manually: %s", str(e))
        return jsonify({'error': 'Failed to execute schedule'}), 500


@refresh_monitor_bp.route('/schedules/<int:schedule_id>/stop', methods=['POST'])
@jwt_required()
@monitor_operation("stop_schedule_jobs")
def stop_schedule_jobs(schedule_id):
    """
    Para todos os jobs pendentes de um cronograma específico
    
    Args:
        schedule_id: ID do cronograma
    
    Returns:
        JSON com resultado da operação
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')
        
        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400
        
        from models import RefreshSchedule, RefreshJob
        from extensions import db
        
        # Verificar se o cronograma existe e pertence ao tenant
        schedule = RefreshSchedule.query.filter_by(
            id=schedule_id,
            tenant_id=tenant_id
        ).first()
        
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        # Parar jobs pendentes do cronograma
        stopped_jobs = RefreshJob.query.filter(
            RefreshJob.refresh_schedule_id == schedule_id,
            RefreshJob.status == 'pending'
        ).update({'status': 'cancelled'})
        
        db.session.commit()
        
        return jsonify({
            'message': f'Stopped {stopped_jobs} pending jobs for schedule "{schedule.name}"',
            'schedule_id': schedule_id,
            'jobs_stopped': stopped_jobs
        }), 200
            
    except Exception as e:
        logger.error("Error stopping schedule jobs: %s", str(e))
        db.session.rollback()
        return jsonify({'error': 'Failed to stop schedule jobs'}), 500
