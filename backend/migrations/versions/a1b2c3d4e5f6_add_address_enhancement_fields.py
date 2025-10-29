"""add address enhancement fields

Revision ID: a1b2c3d4e5f6
Revises: e3f4g5h6i7
Create Date: 2025-08-30 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'e3f4g5h6i7'
branch_labels = None
dependencies = None


def upgrade():
    # Add enhanced address fields to property table
    # op.add_column('property', sa.Column('address_country', sa.String(length=100), nullable=True, server_default=sa.text("'Brasil'")))
    # op.add_column('property', sa.Column('address_reference', sa.String(length=255), nullable=True))
    # op.add_column('property', sa.Column('address_district', sa.String(length=255), nullable=True))
    # op.add_column('property', sa.Column('zoning_type', sa.String(length=100), nullable=True))
    # op.add_column('property', sa.Column('urban_zone', sa.String(length=100), nullable=True))
    pass


def downgrade():
    # Remove address enhancement columns
    # op.drop_column('property', 'urban_zone')
    # op.drop_column('property', 'zoning_type')
    # op.drop_column('property', 'address_district')
    # op.drop_column('property', 'address_reference')
    # op.drop_column('property', 'address_country')
    pass
