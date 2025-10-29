"""
Admin Dashboard Routes - B2B Management
Rotas para o painel administrativo do dono do CRM
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, desc, text
from datetime import datetime, timedelta
from models import db, Tenant, User, Property
from utils.auth import admin_required
import logging

logger = logging.getLogger(__name__)

admin_dashboard_bp = Blueprint('admin_dashboard', __name__)

@admin_dashboard_bp.route('/api/admin/dashboard/overview', methods=['GET'])
@jwt_required()
@admin_required
def dashboard_overview():
    """
    Métricas principais para o dashboard executivo.
    """
    try:
        logger.debug('dashboard_overview headers: %s', dict(request.headers))
        logger.debug('dashboard_overview cookies: %s', request.cookies)

        total_tenants = db.session.query(func.count(Tenant.id)).scalar() or 0
        active_tenants = db.session.query(func.count(Tenant.id)).filter(Tenant.is_active.is_(True)).scalar() or 0
        new_tenants_30d = db.session.query(func.count(Tenant.id)).filter(
            Tenant.created_at >= datetime.utcnow() - timedelta(days=30)
        ).scalar() or 0

        total_users = db.session.query(func.count(User.id)).scalar() or 0
        total_properties = db.session.query(func.count(Property.id)).scalar() or 0

        return jsonify({
            'success': True,
            'data': {
                'tenants': {
                    'total': total_tenants,
                    'active': active_tenants,
                    'new_30d': new_tenants_30d,
                    'growth_rate': 0.0,
                },
                'users': {
                    'total': total_users,
                    'active': total_users,
                    'new_30d': 0,
                    'avg_per_tenant': round(total_users / max(total_tenants, 1), 2) if total_tenants else 0,
                },
                'properties': {
                    'total': total_properties,
                    'active': total_properties,
                    'new_30d': 0,
                    'avg_per_tenant': round(total_properties / max(total_tenants, 1), 2) if total_tenants else 0,
                },
                'tenant_distribution': {
                    'PF': db.session.query(func.count(Tenant.id)).filter(Tenant.tenant_type == 'PF').scalar() or 0,
                    'PJ': db.session.query(func.count(Tenant.id)).filter(Tenant.tenant_type == 'PJ').scalar() or 0,
                },
            }
        })

    except Exception as e:
        logger.error(f"Erro ao buscar overview do dashboard: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Erro interno do servidor: {str(e)}'
        }), 500

@admin_dashboard_bp.route('/api/admin/dashboard/tenants', methods=['GET'])
@jwt_required()
@admin_required
def dashboard_tenants():
    """Lista detalhada de tenants com métricas de cada um."""
    try:
        logger.debug('dashboard_tenants headers: %s', dict(request.headers))
        logger.debug('dashboard_tenants cookies: %s', request.cookies)

        tenants_query = (
            db.session.query(
                Tenant.id,
                Tenant.name,
                Tenant.tenant_type,
                Tenant.email,
                Tenant.phone,
                Tenant.creci,
                Tenant.is_active,
                Tenant.created_at,
                Tenant.updated_at,
                func.count(User.id).label('users_count'),
                func.count(Property.id).label('properties_count')
            )
            .outerjoin(User, Tenant.id == User.tenant_id)
            .outerjoin(Property, Tenant.id == Property.tenant_id)
            .group_by(
                Tenant.id,
                Tenant.name,
                Tenant.tenant_type,
                Tenant.email,
                Tenant.phone,
                Tenant.creci,
                Tenant.is_active,
                Tenant.created_at,
                Tenant.updated_at
            )
            .order_by(desc(Tenant.created_at))
        )

        tenants_data = tenants_query.all()

        result = []
        for tenant in tenants_data:
            users_count = tenant.users_count or 0
            properties_count = tenant.properties_count or 0

            users_score = min(users_count * 20, 50)
            properties_score = min(properties_count * 2, 40)
            base_score = 10
            health_score = min(users_score + properties_score + base_score, 100)

            if health_score >= 80:
                health_status = 'excellent'
            elif health_score >= 60:
                health_status = 'good'
            elif health_score >= 40:
                health_status = 'warning'
            else:
                health_status = 'critical'

            result.append({
                'id': tenant.id,
                'name': tenant.name,
                'tenant_type': tenant.tenant_type,
                'email': tenant.email,
                'phone': tenant.phone,
                'creci': tenant.creci,
                'is_active': tenant.is_active,
                'created_at': tenant.created_at.isoformat() if tenant.created_at else None,
                'updated_at': tenant.updated_at.isoformat() if tenant.updated_at else None,
                'users_count': users_count,
                'properties_count': properties_count,
                'health_score': health_score,
                'health_status': health_status,
            })

        return jsonify({'success': True, 'data': result})

    except Exception as e:
        logger.error(f"Erro ao buscar tenants do dashboard: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Erro interno do servidor: {str(e)}'
        }), 500

@admin_dashboard_bp.route('/api/admin/dashboard/activity', methods=['GET'])
@jwt_required()
@admin_required
def dashboard_activity():
    """
    Feed de atividades recentes (versão simplificada)
    """
    try:
        # Como não temos timestamps adequados, vamos retornar dados simulados
        activities = []
        
        # Buscar alguns tenants e usuários para simular atividades
        tenants = db.session.query(Tenant).limit(3).all()
        users = db.session.query(User, Tenant).join(Tenant).limit(5).all()
        
        # Simular algumas atividades
        for i, tenant in enumerate(tenants):
            activities.append({
                'type': 'new_tenant',
                'timestamp': (datetime.utcnow() - timedelta(days=i)).isoformat(),
                'description': f"Tenant criado: {tenant.name}",
                'tenant_id': tenant.id,
                'tenant_name': tenant.name,
                'tenant_type': 'PJ'
            })
        
        for i, (user, tenant) in enumerate(users):
            activities.append({
                'type': 'new_user',
                'timestamp': (datetime.utcnow() - timedelta(hours=i)).isoformat(),
                'description': f"Usuário criado: {user.username} ({tenant.name})",
                'tenant_id': tenant.id,
                'tenant_name': tenant.name,
                'user_id': user.id,
                'username': user.username
            })
        
        # Ordenar por timestamp
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify({
            'success': True,
            'data': activities[:10]  # Limitar a 10 atividades
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar atividades do dashboard: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Erro interno do servidor: {str(e)}'
        }), 500

@admin_dashboard_bp.route('/api/admin/dashboard/stats/growth', methods=['GET'])
@jwt_required()
@admin_required
def dashboard_growth_stats():
    """
    Estatísticas de crescimento dos últimos 12 meses
    - Tenants por mês
    - Usuários por mês
    - Propriedades por mês
    """
    try:
        # Dados dos últimos 12 meses
        twelve_months_ago = datetime.utcnow() - timedelta(days=365)
        
        # Growth de tenants por mês
        tenant_growth = db.session.query(
            func.date_trunc('month', Tenant.created_at).label('month'),
            func.count(Tenant.id).label('count')
        ).filter(
            Tenant.created_at >= twelve_months_ago
        ).group_by(func.date_trunc('month', Tenant.created_at))\
         .order_by(func.date_trunc('month', Tenant.created_at)).all()
        
        # Growth de usuários por mês
        user_growth = db.session.query(
            func.date_trunc('month', User.created_at).label('month'),
            func.count(User.id).label('count')
        ).filter(
            User.created_at >= twelve_months_ago
        ).group_by(func.date_trunc('month', User.created_at))\
         .order_by(func.date_trunc('month', User.created_at)).all()
        
        # Growth de propriedades por mês
        property_growth = db.session.query(
            func.date_trunc('month', Property.created_at).label('month'),
            func.count(Property.id).label('count')
        ).filter(
            Property.created_at >= twelve_months_ago
        ).group_by(func.date_trunc('month', Property.created_at))\
         .order_by(func.date_trunc('month', Property.created_at)).all()
        
        return jsonify({
            'success': True,
            'data': {
                'tenants': [
                    {
                        'month': growth.month.isoformat() if growth.month else None,
                        'count': growth.count
                    } for growth in tenant_growth
                ],
                'users': [
                    {
                        'month': growth.month.isoformat() if growth.month else None,
                        'count': growth.count
                    } for growth in user_growth
                ],
                'properties': [
                    {
                        'month': growth.month.isoformat() if growth.month else None,
                        'count': growth.count
                    } for growth in property_growth
                ]
            }
        })
        
    except Exception as e:
        logger.error(f"Erro ao buscar estatísticas de crescimento: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

def calculate_tenant_health_score(tenant):
    """
    Calcula um health score simplificado para o tenant
    Baseado em: número de usuários, propriedades, última atividade
    """
    score = 0
    
    # Base score se está ativo
    if tenant.is_active:
        score += 40
    
    # Score por número de usuários
    users_count = tenant.users_count or 0
    if users_count >= 5:
        score += 30
    elif users_count >= 2:
        score += 20
    elif users_count >= 1:
        score += 10
    
    # Score por número de propriedades
    properties_count = tenant.properties_count or 0
    if properties_count >= 50:
        score += 20
    elif properties_count >= 10:
        score += 15
    elif properties_count >= 1:
        score += 10
    
    # Score por atividade recente
    if tenant.last_activity:
        days_since_activity = (datetime.utcnow() - tenant.last_activity).days
        if days_since_activity <= 1:
            score += 10
        elif days_since_activity <= 7:
            score += 7
        elif days_since_activity <= 30:
            score += 3
    
    return min(score, 100)  # Max 100

def get_health_status(score):
    """
    Converte score numérico em status
    """
    if score >= 80:
        return 'excellent'
    elif score >= 60:
        return 'good' 
    elif score >= 40:
        return 'warning'
    else:
        return 'critical'