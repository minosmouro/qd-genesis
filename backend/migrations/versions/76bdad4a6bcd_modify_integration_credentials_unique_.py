"""modify_integration_credentials_unique_constraint

Revision ID: 76bdad4a6bcd
Revises: 33a7b9d1c456
Create Date: 2025-08-27 15:10:14.526752

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '76bdad4a6bcd'
down_revision: Union[str, Sequence[str], None] = '33a7b9d1c456'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove o constraint antigo
    op.drop_constraint('_tenant_provider_uc', 'integration_credentials', type_='unique')
    # Adiciona o novo constraint incluindo user_id
    op.create_unique_constraint('_tenant_provider_user_uc', 'integration_credentials', ['tenant_id', 'provider', 'user_id'])


def downgrade() -> None:
    # Remove o novo constraint
    op.drop_constraint('_tenant_provider_user_uc', 'integration_credentials', type_='unique')
    # Restaura o constraint antigo
    op.create_unique_constraint('_tenant_provider_uc', 'integration_credentials', ['tenant_id', 'provider'])
