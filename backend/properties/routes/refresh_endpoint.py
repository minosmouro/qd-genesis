"""
Endpoint específico para /refresh - Integração 100% com banco de dados
Este endpoint fornece dados consolidados do sistema de refresh para KPIs e relatórios
"""
import logging
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from datetime import datetime, timedelta
from extensions import db
from models import RefreshSchedule, RefreshJob, Property
from ..services.refresh_scheduler_service import RefreshSchedulerService
from ..monitoring import monitor_operation

logger = logging.getLogger(__name__)

refresh_endpoint_bp = Blueprint('refresh_endpoint', __name__, url_prefix='/refresh')


@refresh_endpoint_bp.route('/', methods=['GET'])
@jwt_required()
@monitor_operation("get_refresh_dashboard_data")
def get_refresh_dashboard():
    """
    Endpoint principal /refresh - Retorna dados consolidados do sistema
    
    Returns:
        JSON com todas as informações necessárias para o dashboard de refresh
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')
        
        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400
        
        # Obter estatísticas completas
        stats = RefreshSchedulerService.get_schedule_statistics(tenant_id)
        
        # Obter cronogramas ativos
        active_schedules = RefreshSchedule.query.filter_by(
            tenant_id=tenant_id,
            is_active=True
        ).all()
        
        # Obter jobs recentes (últimas 24h)
        last_24h = datetime.utcnow() - timedelta(hours=24)
        recent_jobs = RefreshJob.query.join(Property).filter(
            Property.tenant_id == tenant_id,
            RefreshJob.created_at >= last_24h
        ).order_by(RefreshJob.created_at.desc()).limit(50).all()
        
        # Obter próximas execuções
        next_executions = []
        for schedule in active_schedules:
            if schedule.next_run:
                next_executions.append({
                    'schedule_id': schedule.id,
                    'schedule_name': schedule.name,
                    'next_execution': schedule.next_run.isoformat(),
                    'properties_count': schedule.properties.count()
                })
        
        # Ordenar por próxima execuç��o
        next_executions.sort(key=lambda x: x['next_execution'])
        
        # Calcular KPIs avançados
        total_properties = sum(s.properties.count() for s in active_schedules)
        success_rate = 0
        if stats['jobs_last_24h']['total'] > 0:
            success_rate = round(
                (stats['jobs_last_24h']['completed'] / stats['jobs_last_24h']['total']) * 100
            )
        
        # Status do sistema
        system_health = 'healthy'
        issues = []
        
        # Verificar problemas
        if stats['jobs_last_24h']['failed'] > stats['jobs_last_24h']['completed']:
            system_health = 'warning'
            issues.append('Alta taxa de falhas nas últimas 24h')
        
        if len([s for s in active_schedules if not s.next_run]) > 0:
            system_health = 'warning'
            issues.append('Cronogramas ativos sem próxima execução definida')
        
        # Verificar Celery
        celery_status = 'disconnected'
        try:
            from celery_app import celery
            inspect = celery.control.inspect()
            if inspect and inspect.stats():
                celery_status = 'connected'
        except Exception:
            system_health = 'error'
            issues.append('Celery worker desconectado')
        
        # Dados consolidados para o dashboard
        dashboard_data = {
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat(),
            'tenant_id': tenant_id,
            
            # KPIs Principais
            'kpis': {
                'total_schedules': stats['total_schedules'],
                'active_schedules': stats['active_schedules'],
                'total_properties': total_properties,
                'success_rate': success_rate,
                'jobs_last_24h': stats['jobs_last_24h'],
                'pending_jobs': len([j for j in recent_jobs if j.status == 'pending'])
            },
            
            # Estatísticas detalhadas
            'statistics': stats,
            
            # Status do sistema
            'system_health': {
                'status': system_health,
                'celery_status': celery_status,
                'issues': issues,
                'last_check': datetime.utcnow().isoformat()
            },
            
            # Cronogramas ativos
            'active_schedules': [
                {
                    'id': s.id,
                    'name': s.name,
                    'properties_count': s.properties.count(),
                    'next_run': s.next_run.isoformat() if s.next_run else None,
                    'last_run': s.last_run.isoformat() if s.last_run else None,
                    'is_active': s.is_active
                }
                for s in active_schedules
            ],
            
            # Próximas execuções
            'next_executions': next_executions[:10],
            
            # Jobs recentes
            'recent_jobs': [
                {
                    'id': j.id,
                    'status': j.status,
                    'property_id': j.property_id,
                    'property_title': j.property.title if j.property else None,
                    'schedule_id': j.refresh_schedule_id,
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
                'most_active_schedule': get_most_active_schedule(active_schedules),
                'properties_per_schedule': round(total_properties / len(active_schedules)) if active_schedules else 0
            }
        }
        
        return jsonify(dashboard_data), 200
        
    except Exception as e:
        logger.error("Error getting refresh dashboard data: %s", str(e), exc_info=True)
        return jsonify({
            'error': 'Failed to get refresh dashboard data',
            'details': str(e),
            'status': 'error'
        }), 500


@refresh_endpoint_bp.route('/kpis', methods=['GET'])
@jwt_required()
@monitor_operation("get_refresh_kpis")
def get_refresh_kpis():
    """
    Endpoint específico para KPIs do sistema de refresh
    
    Returns:
        JSON com KPIs consolidados
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
        
        # KPIs consolidados
        kpis = {
            'total_schedules': {
                'value': stats['total_schedules'],
                'label': 'Total de Cronogramas',
                'trend': 'stable',
                'color': 'primary'
            },
            'active_schedules': {
                'value': stats['active_schedules'],
                'label': 'Cronogramas Ativos',
                'trend': 'up' if stats['active_schedules'] > 0 else 'stable',
                'color': 'success'
            },
            'success_rate': {
                'value': success_rate,
                'label': 'Taxa de Sucesso (24h)',
                'trend': 'up' if success_rate >= 90 else 'down' if success_rate < 70 else 'stable',
                'color': 'success' if success_rate >= 90 else 'warning' if success_rate >= 70 else 'danger'
            },
            'efficiency': {
                'value': efficiency,
                'label': 'Eficiência do Sistema',
                'trend': 'up' if efficiency >= 80 else 'stable',
                'color': 'primary'
            },
            'total_properties': {
                'value': stats['total_properties'],
                'label': 'Propriedades Ativas',
                'trend': 'stable',
                'color': 'secondary'
            },
            'jobs_today': {
                'value': stats['jobs_last_24h']['total'],
                'label': 'Jobs Executados (24h)',
                'trend': 'up' if stats['jobs_last_24h']['total'] > 0 else 'stable',
                'color': 'primary'
            }
        }
        
        return jsonify({
            'status': 'success',
            'kpis': kpis,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error("Error getting refresh KPIs: %s", str(e))
        return jsonify({'error': 'Failed to get KPIs'}), 500


@refresh_endpoint_bp.route('/reports', methods=['GET'])
@jwt_required()
@monitor_operation("get_refresh_reports")
def get_refresh_reports():
    """
    Endpoint para relatórios do sistema de refresh
    
    Returns:
        JSON com dados para relatórios
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')
        
        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400
        
        # Relatório de performance por cronograma
        schedules = RefreshSchedule.query.filter_by(tenant_id=tenant_id).all()
        
        schedule_reports = []
        for schedule in schedules:
            # Jobs do cronograma nas últimas 24h
            last_24h = datetime.utcnow() - timedelta(hours=24)
            jobs = RefreshJob.query.filter(
                RefreshJob.refresh_schedule_id == schedule.id,
                RefreshJob.created_at >= last_24h
            ).all()
            
            completed = len([j for j in jobs if j.status == 'completed'])
            failed = len([j for j in jobs if j.status == 'failed'])
            total = len(jobs)
            
            schedule_reports.append({
                'schedule_id': schedule.id,
                'schedule_name': schedule.name,
                'is_active': schedule.is_active,
                'properties_count': schedule.properties.count(),
                'jobs_24h': {
                    'total': total,
                    'completed': completed,
                    'failed': failed,
                    'success_rate': round((completed / total) * 100) if total > 0 else 0
                },
                'last_run': schedule.last_run.isoformat() if schedule.last_run else None,
                'next_run': schedule.next_run.isoformat() if schedule.next_run else None
            })
        
        return jsonify({
            'status': 'success',
            'reports': {
                'schedule_performance': schedule_reports,
                'generated_at': datetime.utcnow().isoformat()
            }
        }), 200
        
    except Exception as e:
        logger.error("Error getting refresh reports: %s", str(e))
        return jsonify({'error': 'Failed to get reports'}), 500


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