"""Add refresh schedule system

Revision ID: 20250909_add_refresh_schedule_system
Revises: 20250828_add_canalpro_fields
Create Date: 2025-09-09 10:00:00.000000

"""
# pylint: disable=no-member
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = '20250909_add_refresh_schedule_system'
down_revision = '20250828_add_canalpro_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Criar tabela refresh_schedule
    op.create_table(
        'refresh_schedule',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('time_slot', sa.Time(), nullable=False),
        sa.Column('frequency_days', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenant.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Criar index para consultas frequentes
    op.create_index('idx_refresh_schedule_tenant_active', 'refresh_schedule', ['tenant_id', 'is_active'])
    op.create_index('idx_refresh_schedule_time_active', 'refresh_schedule', ['time_slot', 'is_active'])
    
    # Criar tabela de relacionamento many-to-many
    op.create_table(
        'refresh_schedule_properties',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('refresh_schedule_id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('added_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['refresh_schedule_id'], ['refresh_schedule.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['property_id'], ['property.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Criar constraint unique para evitar duplicatas
    op.create_index('idx_unique_schedule_property', 'refresh_schedule_properties', 
                   ['refresh_schedule_id', 'property_id'], unique=True)
    
    # Expandir tabela refresh_job existente (se não existir, criar)
    try:
        # Tentar adicionar colunas à tabela existente
        op.add_column('refresh_job', sa.Column('refresh_schedule_id', sa.Integer(), nullable=True))
        op.add_column('refresh_job', sa.Column('scheduled_at', sa.DateTime(), nullable=True))
        op.add_column('refresh_job', sa.Column('refresh_type', sa.String(length=20), nullable=False, server_default='manual'))
        op.add_column('refresh_job', sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'))
        
        # Adicionar foreign key
        op.create_foreign_key('fk_refresh_job_schedule', 'refresh_job', 'refresh_schedule', 
                             ['refresh_schedule_id'], ['id'], ondelete='SET NULL')
        
    except Exception:
        # Se tabela não existir, criar completa
        op.create_table(
            'refresh_job',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('property_id', sa.Integer(), nullable=False),
            sa.Column('refresh_schedule_id', sa.Integer(), nullable=True),
            sa.Column('scheduled_at', sa.DateTime(), nullable=True),
            sa.Column('refresh_type', sa.String(length=20), nullable=False, server_default='manual'),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.ForeignKeyConstraint(['property_id'], ['property.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['refresh_schedule_id'], ['refresh_schedule.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )
    
    # Índices para performance
    op.create_index('idx_refresh_job_scheduled', 'refresh_job', ['scheduled_at', 'status'])
    op.create_index('idx_refresh_job_property_status', 'refresh_job', ['property_id', 'status'])


def downgrade():
    # Remover índices
    op.drop_index('idx_refresh_job_property_status', table_name='refresh_job')
    op.drop_index('idx_refresh_job_scheduled', table_name='refresh_job')
    op.drop_index('idx_unique_schedule_property', table_name='refresh_schedule_properties')
    op.drop_index('idx_refresh_schedule_time_active', table_name='refresh_schedule')
    op.drop_index('idx_refresh_schedule_tenant_active', table_name='refresh_schedule')
    
    # Remover tabelas
    op.drop_table('refresh_schedule_properties')
    op.drop_table('refresh_schedule')
    
    # Tentar remover colunas da refresh_job (se existir)
    try:
        op.drop_constraint('fk_refresh_job_schedule', 'refresh_job', type_='foreignkey')
        op.drop_column('refresh_job', 'status')
        op.drop_column('refresh_job', 'refresh_type')
        op.drop_column('refresh_job', 'scheduled_at')
        op.drop_column('refresh_job', 'refresh_schedule_id')
    except Exception:
        # Se não conseguir, pode ser que a tabela seja nova - dropar inteira
        op.drop_table('refresh_job')
