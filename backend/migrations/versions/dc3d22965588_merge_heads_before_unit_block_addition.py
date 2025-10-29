"""merge heads before unit block addition

Revision ID: dc3d22965588
Revises: 5b717a38a119, a1b2c3d4e6f7_add_unit_block
Create Date: 2025-09-02 15:44:54.114759

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dc3d22965588'
down_revision: Union[str, Sequence[str], None] = ('5b717a38a119', 'a1b2c3d4e6f7_add_unit_block')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
