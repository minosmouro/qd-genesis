"""
Revision ID: 20250904_merge_heads
Revises: 20250903_add_normalized_cep_and_unique_idx, 20250909_add_refresh_schedule_system
Create Date: 2025-09-13 16:30:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250904_merge_heads'
down_revision = ('20250903_add_normalized_cep_and_unique_idx', '20250909_add_refresh_schedule_system')
branch_labels = None
depends_on = None

def upgrade():
    pass

def downgrade():
    pass
