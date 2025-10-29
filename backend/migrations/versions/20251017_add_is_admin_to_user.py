"""Add is_admin field to user table

Revision ID: 20251017_add_is_admin_to_user
Revises: 20250909_add_refresh_schedule_system
Create Date: 2025-10-17
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251017_add_is_admin_to_user'
down_revision = '20250909_add_refresh_schedule_system'
branch_labels = None
depends_on = None


def upgrade():
    """Add is_admin column to user table for super admin permissions"""
    op.add_column('user', sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    """Remove is_admin column from user table"""
    op.drop_column('user', 'is_admin')
