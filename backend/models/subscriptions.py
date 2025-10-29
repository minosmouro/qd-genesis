"""
Modelos para Sistema de Planos e Assinaturas
Gerenciamento de monetização do Business Center
"""
from extensions import db
from datetime import datetime, timezone
from sqlalchemy import Enum
import enum


class BillingInterval(enum.Enum):
    """Intervalos de cobrança"""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class SubscriptionStatus(enum.Enum):
    """Status da assinatura"""
    ACTIVE = "active"
    TRIALING = "trialing"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    EXPIRED = "expired"


class InvoiceStatus(enum.Enum):
    """Status da fatura"""
    DRAFT = "draft"
    OPEN = "open"
    PAID = "paid"
    VOID = "void"
    UNCOLLECTIBLE = "uncollectible"


class SubscriptionPlan(db.Model):
    """Planos de assinatura disponíveis"""
    __tablename__ = 'subscription_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # Ex: "Básico", "Profissional", "Enterprise"
    description = db.Column(db.Text)
    
    # Preços
    price_monthly = db.Column(db.Numeric(10, 2), nullable=False)
    price_quarterly = db.Column(db.Numeric(10, 2))
    price_yearly = db.Column(db.Numeric(10, 2))
    
    # Limites do plano
    max_properties = db.Column(db.Integer, default=100)
    max_users = db.Column(db.Integer, default=5)
    max_highlights = db.Column(db.Integer, default=10)
    max_super_highlights = db.Column(db.Integer, default=3)
    
    # Features
    has_api_access = db.Column(db.Boolean, default=False)
    has_custom_domain = db.Column(db.Boolean, default=False)
    has_priority_support = db.Column(db.Boolean, default=False)
    has_analytics = db.Column(db.Boolean, default=False)
    has_white_label = db.Column(db.Boolean, default=False)
    
    # Metadados
    is_active = db.Column(db.Boolean, default=True)
    is_public = db.Column(db.Boolean, default=True)  # Visível para novos clientes
    sort_order = db.Column(db.Integer, default=0)  # Ordem de exibição
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relacionamentos
    subscriptions = db.relationship('TenantSubscription', back_populates='plan', lazy='dynamic')
    
    def __repr__(self):
        return f'<SubscriptionPlan {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price_monthly': float(self.price_monthly) if self.price_monthly else None,
            'price_quarterly': float(self.price_quarterly) if self.price_quarterly else None,
            'price_yearly': float(self.price_yearly) if self.price_yearly else None,
            'limits': {
                'max_properties': self.max_properties,
                'max_users': self.max_users,
                'max_highlights': self.max_highlights,
                'max_super_highlights': self.max_super_highlights
            },
            'features': {
                'api_access': self.has_api_access,
                'custom_domain': self.has_custom_domain,
                'priority_support': self.has_priority_support,
                'analytics': self.has_analytics,
                'white_label': self.has_white_label
            },
            'is_active': self.is_active,
            'is_public': self.is_public,
            'sort_order': self.sort_order,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class TenantSubscription(db.Model):
    """Assinatura de um tenant a um plano"""
    __tablename__ = 'tenant_subscriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('subscription_plans.id'), nullable=False)
    
    # Status e datas
    status = db.Column(Enum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE, nullable=False)
    billing_interval = db.Column(Enum(BillingInterval), default=BillingInterval.MONTHLY, nullable=False)
    
    # Datas importantes
    started_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    current_period_start = db.Column(db.DateTime, nullable=False)
    current_period_end = db.Column(db.DateTime, nullable=False)
    trial_end = db.Column(db.DateTime)  # Se estiver em trial
    canceled_at = db.Column(db.DateTime)
    ended_at = db.Column(db.DateTime)
    
    # Valores
    amount = db.Column(db.Numeric(10, 2), nullable=False)  # Valor da assinatura
    currency = db.Column(db.String(3), default='BRL')
    
    # Metadados
    auto_renew = db.Column(db.Boolean, default=True)
    notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relacionamentos
    tenant = db.relationship('Tenant', backref='subscriptions')
    plan = db.relationship('SubscriptionPlan', back_populates='subscriptions')
    invoices = db.relationship('Invoice', back_populates='subscription', lazy='dynamic')
    
    def __repr__(self):
        return f'<TenantSubscription tenant={self.tenant_id} plan={self.plan_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'plan_id': self.plan_id,
            'plan_name': self.plan.name if self.plan else None,
            'status': self.status.value if self.status else None,
            'billing_interval': self.billing_interval.value if self.billing_interval else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'current_period_start': self.current_period_start.isoformat() if self.current_period_start else None,
            'current_period_end': self.current_period_end.isoformat() if self.current_period_end else None,
            'trial_end': self.trial_end.isoformat() if self.trial_end else None,
            'canceled_at': self.canceled_at.isoformat() if self.canceled_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'amount': float(self.amount) if self.amount else None,
            'currency': self.currency,
            'auto_renew': self.auto_renew,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Invoice(db.Model):
    """Faturas geradas para assinaturas"""
    __tablename__ = 'invoices'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)  # Ex: INV-2024-001
    subscription_id = db.Column(db.Integer, db.ForeignKey('tenant_subscriptions.id'), nullable=False)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)
    
    # Status e valores
    status = db.Column(Enum(InvoiceStatus), default=InvoiceStatus.DRAFT, nullable=False)
    amount_subtotal = db.Column(db.Numeric(10, 2), nullable=False)
    amount_tax = db.Column(db.Numeric(10, 2), default=0)
    amount_discount = db.Column(db.Numeric(10, 2), default=0)
    amount_total = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='BRL')
    
    # Datas
    issue_date = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    due_date = db.Column(db.DateTime, nullable=False)
    paid_at = db.Column(db.DateTime)
    voided_at = db.Column(db.DateTime)
    
    # Período coberto
    period_start = db.Column(db.DateTime, nullable=False)
    period_end = db.Column(db.DateTime, nullable=False)
    
    # Informações de pagamento
    payment_method = db.Column(db.String(50))  # Ex: "credit_card", "boleto", "pix"
    payment_reference = db.Column(db.String(200))  # Referência externa do pagamento
    
    # Metadados
    description = db.Column(db.Text)
    notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relacionamentos
    subscription = db.relationship('TenantSubscription', back_populates='invoices')
    tenant = db.relationship('Tenant', backref='invoices')
    
    def __repr__(self):
        return f'<Invoice {self.invoice_number}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'subscription_id': self.subscription_id,
            'tenant_id': self.tenant_id,
            'status': self.status.value if self.status else None,
            'amount_subtotal': float(self.amount_subtotal) if self.amount_subtotal else None,
            'amount_tax': float(self.amount_tax) if self.amount_tax else None,
            'amount_discount': float(self.amount_discount) if self.amount_discount else None,
            'amount_total': float(self.amount_total) if self.amount_total else None,
            'currency': self.currency,
            'issue_date': self.issue_date.isoformat() if self.issue_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'voided_at': self.voided_at.isoformat() if self.voided_at else None,
            'period_start': self.period_start.isoformat() if self.period_start else None,
            'period_end': self.period_end.isoformat() if self.period_end else None,
            'payment_method': self.payment_method,
            'payment_reference': self.payment_reference,
            'description': self.description,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
