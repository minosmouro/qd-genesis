"""add_property_code_column_manual

Revision ID: 5b717a38a119
Revises: 529efd8a87d3
Create Date: 2025-09-02 09:10:33.470501

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5b717a38a119'
down_revision: Union[str, Sequence[str], None] = '529efd8a87d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Adicionar coluna property_code na tabela property
    # op.add_column('property', sa.Column('property_code', sa.String(length=50), nullable=True))
    # Criar índice na coluna property_code
    # op.create_index('ix_property_property_code', 'property', ['property_code'])
    # Adicionar constraint única composta (property_code, tenant_id)
    # op.create_unique_constraint('_property_code_tenant_uc', 'property', ['property_code', 'tenant_id'])
    pass


def downgrade() -> None:
    """Downgrade schema."""
    # Remover constraint única
    # op.drop_constraint('_property_code_tenant_uc', 'property', type_='unique')
    # Remover índice
    # op.drop_index('ix_property_property_code', table_name='property')
    pass
