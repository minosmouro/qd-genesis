"""Make password NOT NULL after backfill

Revision ID: d2e3f4g5h6
Revises: c1a2b3d4e5f6
Create Date: 2025-08-26 19:45:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd2e3f4g5h6'
down_revision: Union[str, Sequence[str], None] = 'c1a2b3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Depending on DB, using batch_alter_table to alter column nullability
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.alter_column('password', existing_type=sa.String(length=255), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.alter_column('password', existing_type=sa.String(length=255), nullable=True)
