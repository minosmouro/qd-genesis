"""Add empreendimento_audit_log table

Revision ID: 20251017_add_empreendimento_audit
Revises: 20251017_add_is_admin_to_user
Create Date: 2025-10-17
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251017_add_empreendimento_audit'
down_revision = '20251017_add_is_admin_to_user'
branch_labels = None
depends_on = None


def upgrade():
    """Create audit log table for empreendimento changes"""
    op.create_table(
        'empreendimento_audit_log',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('empreendimento_id', sa.Integer(), sa.ForeignKey('empreendimentos.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id', ondelete='SET NULL'), nullable=True),
        sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenant.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(50), nullable=False),  # 'create', 'update', 'delete'
        sa.Column('field_name', sa.String(100), nullable=True),  # Campo específico alterado
        sa.Column('old_value', postgresql.JSON, nullable=True),  # Valor anterior
        sa.Column('new_value', postgresql.JSON, nullable=True),  # Novo valor
        sa.Column('changes', postgresql.JSON, nullable=True),  # Todas as mudanças (se múltiplos campos)
        sa.Column('ip_address', sa.String(45), nullable=True),  # IP do usuário
        sa.Column('user_agent', sa.String(500), nullable=True),  # Browser info
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    
    # Índices para consultas rápidas
    op.create_index('idx_audit_empreendimento', 'empreendimento_audit_log', ['empreendimento_id'])
    op.create_index('idx_audit_user', 'empreendimento_audit_log', ['user_id'])
    op.create_index('idx_audit_tenant', 'empreendimento_audit_log', ['tenant_id'])
    op.create_index('idx_audit_created', 'empreendimento_audit_log', ['created_at'])


def downgrade():
    """Drop audit log table"""
    op.drop_index('idx_audit_created', table_name='empreendimento_audit_log')
    op.drop_index('idx_audit_tenant', table_name='empreendimento_audit_log')
    op.drop_index('idx_audit_user', table_name='empreendimento_audit_log')
    op.drop_index('idx_audit_empreendimento', table_name='empreendimento_audit_log')
    op.drop_table('empreendimento_audit_log')
