"""add property integration fields

Revision ID: e3f4g5h6i7
Revises: d2e3f4g5h6
Create Date: 2025-08-26 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'e3f4g5h6i7'
down_revision = 'd2e3f4g5h6'
branch_labels = None
dependencies = None


def upgrade():
    # Add integration/processing columns to property
    op.add_column('property', sa.Column('image_urls', sa.JSON(), nullable=True))
    op.add_column('property', sa.Column('status', sa.String(length=50), nullable=False, server_default=sa.text("'pending'")))
    op.add_column('property', sa.Column('remote_id', sa.String(length=255), nullable=True))
    op.add_column('property', sa.Column('error', sa.Text(), nullable=True))


def downgrade():
    # Remove columns added in upgrade
    op.drop_column('property', 'error')
    op.drop_column('property', 'remote_id')
    op.drop_column('property', 'status')
    op.drop_column('property', 'image_urls')
