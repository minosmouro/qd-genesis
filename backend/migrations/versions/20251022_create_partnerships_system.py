"""Create partnerships system tables

Revision ID: 20251022_partnerships
Revises: 
Create Date: 2025-10-22 20:40:00.000000

This migration creates the infrastructure for the Partnerships Module,
allowing tenants to share properties with other tenants for collaborative marketing.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '20251022_partnerships'
down_revision = None  # Update this with the actual previous revision
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create partnerships table (tenant-to-tenant relationships)
    op.create_table(
        'tenant_partnership',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_tenant_id', sa.Integer(), nullable=False),
        sa.Column('partner_tenant_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('commission_percentage', sa.Numeric(5, 2), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['owner_tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['partner_tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('owner_tenant_id', 'partner_tenant_id', name='uq_partnership_tenants')
    )
    
    # Indexes for partnerships
    op.create_index('ix_tenant_partnership_owner', 'tenant_partnership', ['owner_tenant_id'])
    op.create_index('ix_tenant_partnership_partner', 'tenant_partnership', ['partner_tenant_id'])
    op.create_index('ix_tenant_partnership_status', 'tenant_partnership', ['status'])
    
    # 2. Create property_sharing table (property-level sharing)
    op.create_table(
        'property_sharing',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('owner_tenant_id', sa.Integer(), nullable=False),
        sa.Column('shared_with_tenant_id', sa.Integer(), nullable=True),  # NULL = share with all partners
        sa.Column('sharing_type', sa.String(20), nullable=False, server_default='partnership'),
        sa.Column('can_edit', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('can_export', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('commission_override', sa.Numeric(5, 2), nullable=True),
        sa.Column('custom_terms', sa.Text(), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['property_id'], ['property.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['owner_tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['shared_with_tenant_id'], ['tenant.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('property_id', 'shared_with_tenant_id', name='uq_property_sharing')
    )
    
    # Indexes for property sharing
    op.create_index('ix_property_sharing_property', 'property_sharing', ['property_id'])
    op.create_index('ix_property_sharing_owner', 'property_sharing', ['owner_tenant_id'])
    op.create_index('ix_property_sharing_shared_with', 'property_sharing', ['shared_with_tenant_id'])
    op.create_index('ix_property_sharing_active', 'property_sharing', ['is_active'])
    
    # 3. Add sharing columns to property table
    op.add_column('property', sa.Column('sharing_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('property', sa.Column('sharing_scope', sa.String(20), nullable=False, server_default='none'))
    op.add_column('property', sa.Column('sharing_commission', sa.Numeric(5, 2), nullable=True))
    
    # 4. Create activity log table for audit trail
    op.create_table(
        'property_sharing_activity',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('sharing_id', sa.Integer(), nullable=True),
        sa.Column('actor_tenant_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('details', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['property_id'], ['property.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sharing_id'], ['property_sharing.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['actor_tenant_id'], ['tenant.id'], ondelete='CASCADE')
    )
    
    op.create_index('ix_sharing_activity_property', 'property_sharing_activity', ['property_id'])
    op.create_index('ix_sharing_activity_created', 'property_sharing_activity', ['created_at'])


def downgrade():
    # Drop tables in reverse order
    op.drop_table('property_sharing_activity')
    
    op.drop_column('property', 'sharing_commission')
    op.drop_column('property', 'sharing_scope')
    op.drop_column('property', 'sharing_enabled')
    
    op.drop_table('property_sharing')
    op.drop_table('tenant_partnership')
