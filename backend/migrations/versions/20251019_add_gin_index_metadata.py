"""add gin index to metadata for device_id queries

Revision ID: 20251019_add_gin_index
Revises: 20251017_add_is_admin_to_user
Create Date: 2025-10-19 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251019_add_gin_index'
down_revision = '20251017_add_is_admin_to_user'
branch_labels = None
depends_on = None


def upgrade():
    # Adiciona índice funcional para buscas rápidas por device_id no metadata JSON
    # Nota: GIN não funciona diretamente com tipo JSON, apenas com JSONB
    # Por isso criamos índice funcional na expressão (metadata->>'device_id')
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_integration_credentials_device_id 
        ON integration_credentials ((metadata->>'device_id'))
    """)
    
    # Opcional: Índice para device_status também
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_integration_credentials_device_status 
        ON integration_credentials ((metadata->>'device_status'))
    """)


def downgrade():
    op.execute("DROP INDEX IF EXISTS idx_integration_credentials_device_id")
    op.execute("DROP INDEX IF EXISTS idx_integration_credentials_device_status")
