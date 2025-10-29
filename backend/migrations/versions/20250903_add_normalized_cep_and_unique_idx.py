"""Add normalized cep generated column and unique index for empreendimentos

Revision ID: 20250903_add_normalized_cep
Revises: <previous>
Create Date: 2025-09-03
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250903_add_normalized_cep_and_unique_idx'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add column cep_normalized (stored generated) - PostgreSQL specific
    op.add_column('empreendimentos', sa.Column('cep_normalized', sa.String(length=20), nullable=True))
    # populate existing rows
    op.execute("UPDATE empreendimentos SET cep_normalized = regexp_replace(coalesce(cep,''), '[^0-9]','','g')")
    # create unique index on tenant_id, lower(nome), cep_normalized for active entries
    op.create_index('uq_empreendimento_tenant_nome_cep', 'empreendimentos', ['tenant_id','nome','cep_normalized'], unique=True)


def downgrade():
    op.drop_index('uq_empreendimento_tenant_nome_cep', table_name='empreendimentos')
    op.drop_column('empreendimentos', 'cep_normalized')
