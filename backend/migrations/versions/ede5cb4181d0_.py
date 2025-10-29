"""empty message

Revision ID: ede5cb4181d0
Revises: 20250828_add_canalpro_fields, a1b2c3d4e5f6
Create Date: 2025-09-01 17:31:10.033562

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ede5cb4181d0'
down_revision: Union[str, Sequence[str], None] = ('20250828_add_canalpro_fields', 'a1b2c3d4e5f6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
