"""Add refresh_operations table

Revision ID: 4a7cbc0ba277
Revises: dc2a450e8e47
Create Date: 2025-09-16 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4a7cbc0ba277'
down_revision = 'dc2a450e8e47'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'refresh_operations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'in_progress', 'completed', 'failed', name='refresh_status_enum'), nullable=False),
        sa.Column('backup_data', sa.JSON(), nullable=True),
        sa.Column('original_remote_id', sa.String(length=100), nullable=True),
        sa.Column('new_remote_id', sa.String(length=100), nullable=True),
        sa.Column('started_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('completed_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['property_id'], ['property.id'], ondelete='CASCADE')
    )
    op.create_index(op.f('ix_refresh_operations_property_id'), 'refresh_operations', ['property_id'], unique=False)
    op.create_index(op.f('ix_refresh_operations_status'), 'refresh_operations', ['status'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_refresh_operations_status'), table_name='refresh_operations')
    op.drop_index(op.f('ix_refresh_operations_property_id'), table_name='refresh_operations')
    op.drop_table('refresh_operations')
    sa.Enum(name='refresh_status_enum').drop(op.get_bind(), checkfirst=False)