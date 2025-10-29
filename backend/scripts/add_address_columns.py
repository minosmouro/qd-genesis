"""Script simples para adicionar campos de endereço ao banco de dados.

Execute este script quando o banco de dados estiver disponível:
python scripts/add_address_columns.py
"""

def add_address_columns_sql():
    """Gera SQL para adicionar os novos campos de endereço."""
    sql_commands = [
        # Adicionar coluna address_country com valor padrão 'Brasil'
        """
        ALTER TABLE property
        ADD COLUMN IF NOT EXISTS address_country VARCHAR(100) DEFAULT 'Brasil';
        """,

        # Adicionar coluna address_reference
        """
        ALTER TABLE property
        ADD COLUMN IF NOT EXISTS address_reference VARCHAR(255);
        """,

        # Adicionar coluna address_district
        """
        ALTER TABLE property
        ADD COLUMN IF NOT EXISTS address_district VARCHAR(255);
        """,

        # Adicionar coluna zoning_type
        """
        ALTER TABLE property
        ADD COLUMN IF NOT EXISTS zoning_type VARCHAR(100);
        """,

        # Adicionar coluna urban_zone
        """
        ALTER TABLE property
        ADD COLUMN IF NOT EXISTS urban_zone VARCHAR(100);
        """
    ]

    return sql_commands


def main():
    """Função principal para executar a atualização."""
    print("🔧 Script para adicionar campos de endereço ao banco de dados")
    print("=" * 60)

    sql_commands = add_address_columns_sql()

    print("📋 Comandos SQL que serão executados:")
    print()

    for i, sql in enumerate(sql_commands, 1):
        print(f"{i}. {sql.strip()}")

    print()
    print("💡 Para executar estes comandos:")
    print("1. Conecte-se ao seu banco PostgreSQL")
    print("2. Execute cada comando SQL acima")
    print("3. Ou use uma ferramenta como pgAdmin/DBeaver")
    print()
    print("✅ Após executar, os novos campos estarão disponíveis:")
    print("   - address_country (país, padrão: 'Brasil')")
    print("   - address_reference (referência do endereço)")
    print("   - address_district (distrito/sub-região)")
    print("   - zoning_type (tipo de zoneamento)")
    print("   - urban_zone (zona urbana)")


if __name__ == "__main__":
    main()
