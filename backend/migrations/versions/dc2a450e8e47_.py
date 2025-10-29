"""empty message

Revision ID: dc2a450e8e47
Revises: 20250903_add_idempotency_table, 20250904_merge_heads, b5d39cdf7f64, dc3d22965588, fix_datetime_timezone
Create Date: 2025-09-16 12:40:51.094025

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dc2a450e8e47'
down_revision: Union[str, Sequence[str], None] = ('20250903_add_idempotency_table', '20250904_merge_heads', 'b5d39cdf7f64', 'dc3d22965588', 'fix_datetime_timezone')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
