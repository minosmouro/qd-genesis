"""Add idempotency keys table for empreendimentos creation

Revision ID: 20250903_add_idempotency_table
Revises: 20250903_add_normalized_cep_and_unique_idx
Create Date: 2025-09-03
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250903_add_idempotency_table'
down_revision = '20250903_add_normalized_cep_and_unique_idx'
branch_labels = None
depends_on = None


def upgrade():
    # op.create_table(
    #     'idempotency_keys',
    #     sa.Column('id', sa.String(length=255), primary_key=True),
    #     sa.Column('tenant_id', sa.Integer(), nullable=False),
    #     sa.Column('endpoint', sa.String(length=255), nullable=False),
    #     sa.Column('resource_id', sa.Integer(), nullable=True),
    #     sa.Column('status', sa.String(length=50), nullable=False, server_default='in_progress'),
    #     sa.Column('response', sa.JSON(), nullable=True),
    #     sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    #     sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    # )
    # op.create_index('idx_idempotency_tenant', 'idempotency_keys', ['tenant_id'])
    pass


def downgrade():
    # op.drop_index('idx_idempotency_tenant', table_name='idempotency_keys')
    # op.drop_table('idempotency_keys')
    pass
