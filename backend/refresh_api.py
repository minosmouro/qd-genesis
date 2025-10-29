"""
API principal para o sistema de Refresh - Endpoint /refresh
Este módulo fornece endpoints diretos para integração com o frontend
"""
import logging
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from datetime import datetime, timedelta
from extensions import db
from models import RefreshSchedule, RefreshJob, Property
from properties.services.refresh_scheduler_service import RefreshSchedulerService

logger = logging.getLogger(__name__)

refresh_api_bp = Blueprint('refresh_api', __name__, url_prefix='/refresh')


@refresh_api_bp.route('/', methods=['GET'])
@jwt_required()
def get_refresh_data():
    """
    Endpoint principal /refresh - Dados consolidados do sistema
    
    Este endpoint fornece todos os dados necessários para o dashboard de refresh,
    incluindo KPIs, estatísticas, cronogramas ativos e jobs recentes.
    
    Returns:
        JSON com dados completos do sistema de refresh
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')
        
        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400
        
        logger.info(f"Getting refresh data for tenant: {tenant_id}")
        
        # Obter estatísticas do sistema
        try:
            stats = RefreshSchedulerService.get_schedule_statistics(tenant_id)
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            stats = {
                'total_schedules': 0,
                'active_schedules': 0,
                'total_properties': 0,
                'jobs_last_24h': {'total': 0, 'completed': 0, 'failed': 0, 'pending': 0}
            }
        
        # Obter cronogramas do tenant
        schedules = RefreshSchedule.query.filter_by(tenant_id=tenant_id).all()
        active_schedules = [s for s in schedules if s.is_active]
        
        # Obter jobs recentes (últimas 24h)
        last_24h = datetime.utcnow() - timedelta(hours=24)
        recent_jobs_query = db.session.query(RefreshJob).join(Property).filter(
            Property.tenant_id == tenant_id,
            RefreshJob.created_at >= last_24h
        ).order_by(RefreshJob.created_at.desc()).limit(50)
        
        recent_jobs = recent_jobs_query.all()
        
        # Calcular KPIs
        total_properties = sum(s.properties.count() for s in active_schedules)
        success_rate = 0
        if stats['jobs_last_24h']['total'] > 0:
            success_rate = round(
                (stats['jobs_last_24h']['completed'] / stats['jobs_last_24h']['total']) * 100
            )
        
        efficiency = 0
        if len(schedules) > 0:
            efficiency = round((len(active_schedules) / len(schedules)) * 100)
        
        # Status do sistema
        system_status = determine_system_status(stats, recent_jobs)
        
        # Próximas execuções
        next_executions = []
        for schedule in active_schedules:
            if schedule.next_run:
                next_executions.append({
                    'schedule_id': schedule.id,
                    'schedule_name': schedule.name,
                    'next_execution': schedule.next_run.isoformat(),
                    'properties_count': schedule.properties.count()
                })
        
        next_executions.sort(key=lambda x: x['next_execution'])
        
        # Dados consolidados
        response_data = {
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat(),
            'tenant_id': tenant_id,
            
            # KPIs principais
            'kpis': {
                'total_schedules': len(schedules),
                'active_schedules': len(active_schedules),
                'total_properties': total_properties,
                'success_rate': success_rate,
                'efficiency': efficiency,
                'jobs_last_24h': stats['jobs_last_24h'],
                'pending_jobs': len([j for j in recent_jobs if j.status == 'pending'])
            },
            
            # Estatísticas detalhadas
            'statistics': stats,
            
            # Status do sistema
            'system_health': system_status,
            
            # Cronogramas ativos
            'schedules': [
                {
                    'id': s.id,
                    'name': s.name,
                    'is_active': s.is_active,
                    'properties_count': s.properties.count(),
                    'next_run': s.next_run.isoformat() if s.next_run else None,
                    'last_run': s.last_run.isoformat() if s.last_run else None,
                    'time_slot': s.time_slot.strftime('%H:%M') if s.time_slot else None,
                    'frequency_days': s.frequency_days
                }
                for s in schedules
            ],
            
            # Próximas execuções
            'next_executions': next_executions[:10],
            
            # Jobs recentes
            'recent_jobs': [
                {
                    'id': j.id,
                    'status': j.status,
                    'property_id': j.property_id,
                    'property_title': j.property.title if j.property else f'Property #{j.property_id}',
                    'schedule_id': j.refresh_schedule_id,
                    'schedule_name': j.schedule.name if j.schedule else None,
                    'created_at': j.created_at.isoformat(),
                    'completed_at': j.completed_at.isoformat() if j.completed_at else None,
                    'error_message': j.error_message
                }
                for j in recent_jobs[:20]
            ],
            
            # Métricas de performance
            'performance': {
                'avg_execution_time': calculate_avg_execution_time(recent_jobs),
                'failure_rate': calculate_failure_rate(recent_jobs),
                'most_active_schedule': get_most_active_schedule(active_schedules) if active_schedules else None,
                'properties_per_schedule': round(total_properties / len(active_schedules)) if active_schedules else 0
            }
        }
        
        logger.info(f"Successfully retrieved refresh data for tenant {tenant_id}")
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error getting refresh data: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Failed to get refresh data',
            'details': str(e),
            'status': 'error',
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@refresh_api_bp.route('/kpis', methods=['GET'])
@jwt_required()
def get_kpis():
    """
    Endpoint específico para KPIs do sistema de refresh
    
    Returns:
        JSON com KPIs consolidados e formatados para exibição
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')
        
        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400
        
        # Obter estatísticas
        stats = RefreshSchedulerService.get_schedule_statistics(tenant_id)
        
        # Calcular KPIs
        success_rate = 0
        if stats['jobs_last_24h']['total'] > 0:
            success_rate = round(
                (stats['jobs_last_24h']['completed'] / stats['jobs_last_24h']['total']) * 100
            )
        
        efficiency = 0
        if stats['total_schedules'] > 0:
            efficiency = round((stats['active_schedules'] / stats['total_schedules']) * 100)
        
        # KPIs formatados para o frontend
        kpis = {
            'total_schedules': {
                'value': stats['total_schedules'],
                'label': 'Total de Cronogramas',
                'icon': 'calendar',
                'trend': 'stable',
                'color': 'primary'
            },
            'active_schedules': {
                'value': stats['active_schedules'],
                'label': 'Cronogramas Ativos',
                'icon': 'activity',
                'trend': 'up' if stats['active_schedules'] > 0 else 'stable',
                'color': 'success'
            },
            'success_rate': {
                'value': success_rate,
                'label': 'Taxa de Sucesso (24h)',
                'icon': 'target',
                'trend': 'up' if success_rate >= 90 else 'down' if success_rate < 70 else 'stable',
                'color': 'success' if success_rate >= 90 else 'warning' if success_rate >= 70 else 'danger',
                'suffix': '%'
            },
            'efficiency': {
                'value': efficiency,
                'label': 'Eficiência do Sistema',
                'icon': 'zap',
                'trend': 'up' if efficiency >= 80 else 'stable',
                'color': 'primary',
                'suffix': '%'
            },
            'total_properties': {
                'value': stats['total_properties'],
                'label': 'Propriedades Ativas',
                'icon': 'home',
                'trend': 'stable',
                'color': 'secondary'
            },
            'jobs_today': {
                'value': stats['jobs_last_24h']['total'],
                'label': 'Jobs Executados (24h)',
                'icon': 'bar-chart',
                'trend': 'up' if stats['jobs_last_24h']['total'] > 0 else 'stable',
                'color': 'primary'
            }
        }
        
        return jsonify({
            'status': 'success',
            'kpis': kpis,
            'summary': {
                'total_kpis': len(kpis),
                'healthy_kpis': len([k for k in kpis.values() if k['color'] in ['success', 'primary']]),
                'warning_kpis': len([k for k in kpis.values() if k['color'] == 'warning']),
                'critical_kpis': len([k for k in kpis.values() if k['color'] == 'danger'])
            },
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting KPIs: {str(e)}")
        return jsonify({
            'error': 'Failed to get KPIs',
            'details': str(e)
        }), 500


@refresh_api_bp.route('/health', methods=['GET'])
@jwt_required()
def get_health():
    """
    Endpoint de health check do sistema de refresh
    
    Returns:
        JSON com status de saúde do sistema
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')
        
        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400
        
        # Verificar status do Celery
        celery_status = 'disconnected'
        celery_workers = 0
        try:
            from celery_app import celery
            inspect = celery.control.inspect()
            stats = inspect.stats()
            if stats and len(stats) > 0:
                celery_status = 'connected'
                celery_workers = len(stats)
        except Exception as e:
            logger.warning(f"Celery check failed: {e}")
        
        # Verificar jobs pendentes
        pending_jobs = RefreshJob.query.join(Property).filter(
            Property.tenant_id == tenant_id,
            RefreshJob.status == 'pending'
        ).count()
        
        # Verificar cronogramas ativos
        active_schedules = RefreshSchedule.query.filter_by(
            tenant_id=tenant_id,
            is_active=True
        ).count()
        
        # Determinar status geral
        overall_status = 'healthy'
        issues = []
        
        if celery_status == 'disconnected':
            overall_status = 'error'
            issues.append('Celery worker desconectado')
        
        if pending_jobs > 20:
            overall_status = 'warning' if overall_status == 'healthy' else overall_status
            issues.append(f'{pending_jobs} jobs pendentes na fila')
        
        if active_schedules == 0:
            overall_status = 'warning' if overall_status == 'healthy' else overall_status
            issues.append('Nenhum cronograma ativo')
        
        health_data = {
            'status': overall_status,
            'celery_status': celery_status,
            'celery_workers': celery_workers,
            'pending_jobs': pending_jobs,
            'active_schedules': active_schedules,
            'issues': issues,
            'last_check': datetime.utcnow().isoformat(),
            'tenant_id': tenant_id
        }
        
        return jsonify(health_data), 200
        
    except Exception as e:
        logger.error(f"Error getting health status: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Failed to get health status',
            'details': str(e)
        }), 500


def determine_system_status(stats, recent_jobs):
    """Determina o status geral do sistema baseado nas estatísticas"""
    status = 'healthy'
    issues = []
    
    # Verificar taxa de sucesso
    if stats['jobs_last_24h']['total'] > 0:
        success_rate = (stats['jobs_last_24h']['completed'] / stats['jobs_last_24h']['total']) * 100
        if success_rate < 70:
            status = 'warning'
            issues.append(f'Taxa de sucesso baixa: {success_rate:.1f}%')
    
    # Verificar jobs com falha
    if stats['jobs_last_24h']['failed'] > stats['jobs_last_24h']['completed']:
        status = 'error'
        issues.append('Mais jobs falharam do que foram concluídos')
    
    # Verificar Celery
    try:
        from celery_app import celery
        inspect = celery.control.inspect()
        if not inspect or not inspect.stats():
            status = 'error'
            issues.append('Celery worker desconectado')
    except Exception:
        status = 'error'
        issues.append('Celery worker desconectado')
    
    return {
        'status': status,
        'issues': issues,
        'last_check': datetime.utcnow().isoformat()
    }


def calculate_avg_execution_time(jobs):
    """Calcula tempo médio de execução dos jobs"""
    completed_jobs = [j for j in jobs if j.status == 'completed' and j.completed_at and j.created_at]
    
    if not completed_jobs:
        return 0
    
    total_time = 0
    for job in completed_jobs:
        duration = (job.completed_at - job.created_at).total_seconds()
        total_time += duration
    
    return round(total_time / len(completed_jobs), 2)


def calculate_failure_rate(jobs):
    """Calcula taxa de falha dos jobs"""
    if not jobs:
        return 0
    
    failed_jobs = len([j for j in jobs if j.status == 'failed'])
    return round((failed_jobs / len(jobs)) * 100, 2)


def get_most_active_schedule(schedules):
    """Encontra o cronograma mais ativo"""
    if not schedules:
        return None
    
    most_active = max(schedules, key=lambda s: s.properties.count())
    return {
        'id': most_active.id,
        'name': most_active.name,
        'properties_count': most_active.properties.count()
    }