"""Add missing property columns

Revision ID: 529efd8a87d3
Revises: ede5cb4181d0
Create Date: 2025-09-01 18:23:29.078239

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '529efd8a87d3'
down_revision: Union[str, Sequence[str], None] = 'ede5cb4181d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add missing columns to property table
    # op.add_column('property', sa.Column('price_rent', sa.Numeric(), nullable=True))
    # op.add_column('property', sa.Column('condo_fee_exempt', sa.Boolean(), nullable=True))
    # op.add_column('property', sa.Column('iptu_exempt', sa.Boolean(), nullable=True))
    # op.add_column('property', sa.Column('category', sa.String(100), nullable=True))
    # op.add_column('property', sa.Column('building_name', sa.String(255), nullable=True))
    # op.add_column('property', sa.Column('features', sa.JSON(), nullable=True))
    # op.add_column('property', sa.Column('custom_features', sa.Text(), nullable=True))
    # op.add_column('property', sa.Column('condo_features', sa.JSON(), nullable=True))
    pass


def downgrade() -> None:
    """Downgrade schema."""
    # Remove the added columns
    # op.drop_column('property', 'custom_condo_features')
    # op.drop_column('property', 'condo_features')
    # op.drop_column('property', 'custom_features')
    # op.drop_column('property', 'features')
    # op.drop_column('property', 'building_name')
    # op.drop_column('property', 'category')
    # op.drop_column('property', 'iptu_exempt')
    # op.drop_column('property', 'condo_fee_exempt')
    # op.drop_column('property', 'price_rent')
    pass
