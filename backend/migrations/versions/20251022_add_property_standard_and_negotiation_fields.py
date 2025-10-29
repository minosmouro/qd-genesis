"""Add property_standard and negotiation fields

Revision ID: 20251022_add_property_standard_and_negotiation_fields
Revises: 20251021_merge_roots
Create Date: 2025-10-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20251022_add_property_standard_and_negotiation_fields'
down_revision: Union[str, Sequence[str], None] = '20251021_merge_roots'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add property_standard and negotiation fields."""
    # Add property_standard column
    op.add_column('property', sa.Column('property_standard', sa.String(50), nullable=True))
    
    # Add negotiation fields
    op.add_column('property', sa.Column('accepts_financing', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('property', sa.Column('financing_details', sa.Text(), nullable=True))
    op.add_column('property', sa.Column('accepts_exchange', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('property', sa.Column('exchange_details', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema - Remove property_standard and negotiation fields."""
    # Remove negotiation fields
    op.drop_column('property', 'exchange_details')
    op.drop_column('property', 'accepts_exchange')
    op.drop_column('property', 'financing_details')
    op.drop_column('property', 'accepts_financing')
    
    # Remove property_standard column
    op.drop_column('property', 'property_standard')
