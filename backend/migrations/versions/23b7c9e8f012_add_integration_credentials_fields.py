"""add integration_credentials fields

Revision ID: 23b7c9e8f012
Revises: f1f7384dad93
Create Date: 2025-08-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '23b7c9e8f012'
down_revision = 'f1f7384dad93'
branch_labels = None
depends_on = None


def upgrade():
    # Adiciona colunas que o modelo espera
    op.add_column('integration_credentials', sa.Column('refresh_token_encrypted', sa.Text(), nullable=True))
    op.add_column('integration_credentials', sa.Column('last_validated_at', sa.DateTime(), nullable=True))
    op.add_column('integration_credentials', sa.Column('last_validated_ok', sa.Boolean(), nullable=True))


def downgrade():
    # Remove as colunas adicionadas
    op.drop_column('integration_credentials', 'last_validated_ok')
    op.drop_column('integration_credentials', 'last_validated_at')
    op.drop_column('integration_credentials', 'refresh_token_encrypted')
