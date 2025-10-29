"""add integration_credentials table

Revision ID: f1f7384dad93
Revises: e3f4g5h6i7
Create Date: 2025-08-26 22:12:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f1f7384dad93'
down_revision = 'e3f4g5h6i7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'integration_credentials',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenant.id'), nullable=False),
        sa.Column('provider', sa.String(length=100), nullable=False),
        sa.Column('token_encrypted', sa.Text(), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('tenant_id', 'provider', name='_tenant_provider_uc')
    )


def downgrade():
    op.drop_table('integration_credentials')
