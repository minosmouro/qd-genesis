"""
Migração Alembic: Atualiza todos os campos de data/hora para TIMESTAMP WITH TIME ZONE
"""
# pylint: disable=no-member
from alembic import op
import sqlalchemy as sa

# Revisão e dependências
revision = 'fix_datetime_timezone'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Property
    op.alter_column(
        'property', 'published_at',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )
    op.alter_column(
        'property', 'delivered_at',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )
    op.alter_column(
        'property', 'created_at',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )
    op.alter_column(
        'property', 'updated_at',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )

    # IntegrationCredentials
    op.alter_column(
        'integration_credentials', 'last_validated_at',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )
    op.alter_column(
        'integration_credentials', 'created_at',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )
    op.alter_column(
        'integration_credentials', 'updated_at',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )
    op.alter_column(
        'integration_credentials', 'expires_at',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )

    # RefreshSchedule
    op.alter_column(
        'refresh_schedule', 'next_run',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )
    op.alter_column(
        'refresh_schedule', 'last_run',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )
    op.alter_column(
        'refresh_schedule', 'created_at',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )
    op.alter_column(
        'refresh_schedule', 'updated_at',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )

    # RefreshScheduleProperty
    op.alter_column(
        'refresh_schedule_properties', 'added_at',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )

    # RefreshJob
    op.alter_column(
        'refresh_job', 'scheduled_at',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )
    op.alter_column(
        'refresh_job', 'created_at',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )
    op.alter_column(
        'refresh_job', 'updated_at',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )
    op.alter_column(
        'refresh_job', 'started_at',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )
    op.alter_column(
        'refresh_job', 'completed_at',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False)
    )

def downgrade():
    # Reverte para TIMESTAMP WITHOUT TIME ZONE
    op.alter_column(
        'property', 'published_at',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )
    op.alter_column(
        'property', 'delivered_at',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )
    op.alter_column(
        'property', 'created_at',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )
    op.alter_column(
        'property', 'updated_at',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )

    op.alter_column(
        'integration_credentials', 'last_validated_at',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )
    op.alter_column(
        'integration_credentials', 'created_at',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )
    op.alter_column(
        'integration_credentials', 'updated_at',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )
    op.alter_column(
        'integration_credentials', 'expires_at',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )

    op.alter_column(
        'refresh_schedule', 'next_run',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )
    op.alter_column(
        'refresh_schedule', 'last_run',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )
    op.alter_column(
        'refresh_schedule', 'created_at',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )
    op.alter_column(
        'refresh_schedule', 'updated_at',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )

    op.alter_column(
        'refresh_schedule_properties', 'added_at',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )

    op.alter_column(
        'refresh_job', 'scheduled_at',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )
    op.alter_column(
        'refresh_job', 'created_at',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )
    op.alter_column(
        'refresh_job', 'updated_at',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )
    op.alter_column(
        'refresh_job', 'started_at',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )
    op.alter_column(
        'refresh_job', 'completed_at',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True)
    )
