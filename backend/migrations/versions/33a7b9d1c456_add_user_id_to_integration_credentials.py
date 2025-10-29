"""add user_id to integration_credentials

Revision ID: 33a7b9d1c456
Revises: 23b7c9e8f012
Create Date: 2025-08-27 15:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '33a7b9d1c456'
down_revision = '23b7c9e8f012'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('integration_credentials', sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=True))


def downgrade():
    op.drop_column('integration_credentials', 'user_id')
