"""Add unit and block columns to property table

Revision ID: a1b2c3d4e6f7_add_unit_block
Revises: 529efd8a87d3
Create Date: 2025-09-02 15:30:00.000000
"""
from alembic import op
import sqlalchemy as sa
from typing import Union, Sequence

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e6f7_add_unit_block'
down_revision: Union[str, Sequence[str], None] = '529efd8a87d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # op.add_column('property', sa.Column('unit', sa.String(length=50), nullable=True))
    # op.add_column('property', sa.Column('block', sa.String(length=50), nullable=True))
    pass


def downgrade() -> None:
    # op.drop_column('property', 'block')
    # op.drop_column('property', 'unit')
    pass
