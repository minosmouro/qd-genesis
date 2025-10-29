"""
Rotas para gestão de planos de assinatura e billing
"""
from flask import Blueprint, request, jsonify, g
from extensions import db
from models import SubscriptionPlan, TenantSubscription, Invoice, BillingInterval, SubscriptionStatus, InvoiceStatus, Tenant
from auth import tenant_required
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta

# Blueprint
subscriptions_bp = Blueprint('subscriptions', __name__, url_prefix='/api/subscriptions')

# Super admin check decorator (reutilizar do tenants.py)
def super_admin_required(fn):
    """Decorator que verifica se o usuário é super admin"""
    from functools import wraps
    from models import User
    
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.tenant_id != 1 or not user.is_admin:
            return jsonify({'error': 'Acesso negado. Apenas super administradores'}), 403
            
        g.current_user = user
        return fn(*args, **kwargs)
    return wrapper


# ============================================================================
# PLANS - CRUD de Planos
# ============================================================================

@subscriptions_bp.route('/plans', methods=['GET'])
@super_admin_required
def list_plans():
    """Listar todos os planos de assinatura"""
    try:
        show_all = request.args.get('show_all', 'false').lower() == 'true'
        
        if show_all:
            plans = SubscriptionPlan.query.order_by(SubscriptionPlan.sort_order).all()
        else:
            plans = SubscriptionPlan.query.filter_by(is_active=True).order_by(SubscriptionPlan.sort_order).all()
        
        return jsonify({
            'plans': [plan.to_dict() for plan in plans],
            'total': len(plans)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500


@subscriptions_bp.route('/plans', methods=['POST'])
@super_admin_required
def create_plan():
    """Criar novo plano de assinatura"""
    try:
        data = request.get_json()
        
        # Validações
        if not data.get('name'):
            return jsonify({'error': 'Nome do plano é obrigatório'}), 400
        
        if not data.get('price_monthly'):
            return jsonify({'error': 'Preço mensal é obrigatório'}), 400
        
        # Criar plano
        plan = SubscriptionPlan(
            name=data['name'],
            description=data.get('description'),
            price_monthly=data['price_monthly'],
            price_quarterly=data.get('price_quarterly'),
            price_yearly=data.get('price_yearly'),
            max_properties=data.get('max_properties', 100),
            max_users=data.get('max_users', 5),
            max_highlights=data.get('max_highlights', 10),
            max_super_highlights=data.get('max_super_highlights', 3),
            has_api_access=data.get('has_api_access', False),
            has_custom_domain=data.get('has_custom_domain', False),
            has_priority_support=data.get('has_priority_support', False),
            has_analytics=data.get('has_analytics', False),
            has_white_label=data.get('has_white_label', False),
            is_public=data.get('is_public', True),
            sort_order=data.get('sort_order', 0)
        )
        
        db.session.add(plan)
        db.session.commit()
        
        return jsonify({
            'message': 'Plano criado com sucesso',
            'plan': plan.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500


@subscriptions_bp.route('/plans/<int:plan_id>', methods=['GET'])
@super_admin_required
def get_plan(plan_id):
    """Buscar detalhes de um plano"""
    try:
        plan = SubscriptionPlan.query.get(plan_id)
        if not plan:
            return jsonify({'error': 'Plano não encontrado'}), 404
        
        # Contar assinaturas ativas neste plano
        active_subscriptions = TenantSubscription.query.filter_by(
            plan_id=plan_id,
            status=SubscriptionStatus.ACTIVE
        ).count()
        
        plan_data = plan.to_dict()
        plan_data['active_subscriptions'] = active_subscriptions
        
        return jsonify(plan_data), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500


@subscriptions_bp.route('/plans/<int:plan_id>', methods=['PUT'])
@super_admin_required
def update_plan(plan_id):
    """Atualizar plano de assinatura"""
    try:
        plan = SubscriptionPlan.query.get(plan_id)
        if not plan:
            return jsonify({'error': 'Plano não encontrado'}), 404
        
        data = request.get_json()
        
        # Atualizar campos
        if 'name' in data:
            plan.name = data['name']
        if 'description' in data:
            plan.description = data['description']
        if 'price_monthly' in data:
            plan.price_monthly = data['price_monthly']
        if 'price_quarterly' in data:
            plan.price_quarterly = data['price_quarterly']
        if 'price_yearly' in data:
            plan.price_yearly = data['price_yearly']
        if 'max_properties' in data:
            plan.max_properties = data['max_properties']
        if 'max_users' in data:
            plan.max_users = data['max_users']
        if 'max_highlights' in data:
            plan.max_highlights = data['max_highlights']
        if 'max_super_highlights' in data:
            plan.max_super_highlights = data['max_super_highlights']
        if 'has_api_access' in data:
            plan.has_api_access = data['has_api_access']
        if 'has_custom_domain' in data:
            plan.has_custom_domain = data['has_custom_domain']
        if 'has_priority_support' in data:
            plan.has_priority_support = data['has_priority_support']
        if 'has_analytics' in data:
            plan.has_analytics = data['has_analytics']
        if 'has_white_label' in data:
            plan.has_white_label = data['has_white_label']
        if 'is_public' in data:
            plan.is_public = data['is_public']
        if 'is_active' in data:
            plan.is_active = data['is_active']
        if 'sort_order' in data:
            plan.sort_order = data['sort_order']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Plano atualizado com sucesso',
            'plan': plan.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500


@subscriptions_bp.route('/plans/<int:plan_id>', methods=['DELETE'])
@super_admin_required
def delete_plan(plan_id):
    """Deletar plano de assinatura"""
    try:
        plan = SubscriptionPlan.query.get(plan_id)
        if not plan:
            return jsonify({'error': 'Plano não encontrado'}), 404
        
        # Verificar se há assinaturas ativas
        active_subs = TenantSubscription.query.filter_by(
            plan_id=plan_id,
            status=SubscriptionStatus.ACTIVE
        ).count()
        
        if active_subs > 0:
            return jsonify({
                'error': f'Não é possível deletar plano com {active_subs} assinatura(s) ativa(s)'
            }), 400
        
        db.session.delete(plan)
        db.session.commit()
        
        return jsonify({'message': 'Plano deletado com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500


# ============================================================================
# SUBSCRIPTIONS - Gerenciar assinaturas dos tenants
# ============================================================================

@subscriptions_bp.route('/tenant/<int:tenant_id>', methods=['GET'])
@super_admin_required
def get_tenant_subscription(tenant_id):
    """Buscar assinatura ativa de um tenant"""
    try:
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant não encontrado'}), 404
        
        # Buscar assinatura ativa
        subscription = TenantSubscription.query.filter_by(
            tenant_id=tenant_id,
            status=SubscriptionStatus.ACTIVE
        ).first()
        
        if not subscription:
            return jsonify({
                'has_subscription': False,
                'tenant': {'id': tenant.id, 'name': tenant.name}
            }), 200
        
        return jsonify({
            'has_subscription': True,
            'subscription': subscription.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500


@subscriptions_bp.route('/tenant/<int:tenant_id>/assign', methods=['POST'])
@super_admin_required
def assign_plan_to_tenant(tenant_id):
    """Atribuir plano a um tenant"""
    try:
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant não encontrado'}), 404
        
        data = request.get_json()
        plan_id = data.get('plan_id')
        billing_interval = data.get('billing_interval', 'monthly')
        trial_days = data.get('trial_days', 0)
        
        if not plan_id:
            return jsonify({'error': 'ID do plano é obrigatório'}), 400
        
        plan = SubscriptionPlan.query.get(plan_id)
        if not plan:
            return jsonify({'error': 'Plano não encontrado'}), 404
        
        # Cancelar assinatura anterior se existir
        old_subscription = TenantSubscription.query.filter_by(
            tenant_id=tenant_id,
            status=SubscriptionStatus.ACTIVE
        ).first()
        
        if old_subscription:
            old_subscription.status = SubscriptionStatus.CANCELED
            old_subscription.canceled_at = datetime.now(timezone.utc)
            old_subscription.ended_at = datetime.now(timezone.utc)
        
        # Calcular valores baseado no intervalo
        interval_enum = BillingInterval(billing_interval)
        if interval_enum == BillingInterval.MONTHLY:
            amount = plan.price_monthly
            period_months = 1
        elif interval_enum == BillingInterval.QUARTERLY:
            amount = plan.price_quarterly or (plan.price_monthly * 3)
            period_months = 3
        else:  # YEARLY
            amount = plan.price_yearly or (plan.price_monthly * 12)
            period_months = 12
        
        # Datas
        now = datetime.now(timezone.utc)
        trial_end = now + timedelta(days=trial_days) if trial_days > 0 else None
        period_start = trial_end if trial_end else now
        period_end = period_start + relativedelta(months=period_months)
        
        # Criar nova assinatura
        subscription = TenantSubscription(
            tenant_id=tenant_id,
            plan_id=plan_id,
            status=SubscriptionStatus.TRIALING if trial_days > 0 else SubscriptionStatus.ACTIVE,
            billing_interval=interval_enum,
            started_at=now,
            current_period_start=period_start,
            current_period_end=period_end,
            trial_end=trial_end,
            amount=amount,
            currency='BRL',
            auto_renew=data.get('auto_renew', True)
        )
        
        db.session.add(subscription)
        db.session.commit()
        
        return jsonify({
            'message': 'Plano atribuído com sucesso',
            'subscription': subscription.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500


@subscriptions_bp.route('/dashboard', methods=['GET'])
@super_admin_required
def get_billing_dashboard():
    """Dashboard financeiro com métricas"""
    try:
        # MRR - Monthly Recurring Revenue
        active_subscriptions = TenantSubscription.query.filter_by(
            status=SubscriptionStatus.ACTIVE
        ).all()
        
        mrr = sum([
            float(sub.amount) if sub.billing_interval == BillingInterval.MONTHLY 
            else float(sub.amount) / 3 if sub.billing_interval == BillingInterval.QUARTERLY
            else float(sub.amount) / 12
            for sub in active_subscriptions
        ])
        
        # ARR - Annual Recurring Revenue
        arr = mrr * 12
        
        # Assinaturas por plano
        subscriptions_by_plan = {}
        for sub in active_subscriptions:
            plan_name = sub.plan.name if sub.plan else 'Sem plano'
            subscriptions_by_plan[plan_name] = subscriptions_by_plan.get(plan_name, 0) + 1
        
        # Receita por plano
        revenue_by_plan = {}
        for sub in active_subscriptions:
            plan_name = sub.plan.name if sub.plan else 'Sem plano'
            monthly_value = float(sub.amount) if sub.billing_interval == BillingInterval.MONTHLY else float(sub.amount) / 3 if sub.billing_interval == BillingInterval.QUARTERLY else float(sub.amount) / 12
            revenue_by_plan[plan_name] = revenue_by_plan.get(plan_name, 0) + monthly_value
        
        # Totais
        total_tenants = Tenant.query.count()
        tenants_with_subscription = len(active_subscriptions)
        tenants_without_subscription = total_tenants - tenants_with_subscription
        
        return jsonify({
            'metrics': {
                'mrr': round(mrr, 2),
                'arr': round(arr, 2),
                'active_subscriptions': len(active_subscriptions),
                'total_tenants': total_tenants,
                'tenants_with_subscription': tenants_with_subscription,
                'tenants_without_subscription': tenants_without_subscription,
                'conversion_rate': round((tenants_with_subscription / total_tenants * 100), 2) if total_tenants > 0 else 0
            },
            'subscriptions_by_plan': subscriptions_by_plan,
            'revenue_by_plan': {k: round(v, 2) for k, v in revenue_by_plan.items()}
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500
