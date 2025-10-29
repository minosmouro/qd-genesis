"""Add password column to user and composite unique constraint for property

Revision ID: c1a2b3d4e5f6
Revises: 9fa3422b2f62
Create Date: 2025-08-26 19:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '9fa3422b2f62'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create composite unique constraint on property (external_id + tenant_id)
    with op.batch_alter_table('property', schema=None) as batch_op:
        # Add composite unique constraint
        batch_op.create_unique_constraint('_external_tenant_uc', ['external_id', 'tenant_id'])


def downgrade() -> None:
    # Drop composite unique constraint from property
    with op.batch_alter_table('property', schema=None) as batch_op:
        batch_op.drop_constraint('_external_tenant_uc', type_='unique')
