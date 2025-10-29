"""Merge all migration roots

Revision ID: 20251021_merge_roots
Revises: 95274d9d616c, 20250903_add_normalized_cep_and_unique_idx, b5d39cdf7f64, fix_datetime_timezone
Create Date: 2025-10-21 06:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251021_merge_roots'
down_revision = ('95274d9d616c', '20250903_add_normalized_cep_and_unique_idx', 'b5d39cdf7f64', 'fix_datetime_timezone')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
