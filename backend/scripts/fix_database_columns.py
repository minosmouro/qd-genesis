#!/usr/bin/env python3
"""
Script para corrigir o erro de colunas faltantes no banco de dados.
Execute este script para adicionar as colunas de endereço que estão causando o erro.

Uso: python fix_database_columns.py
"""

import os
import sys
from pathlib import Path

# Adicionar backend ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

def fix_database_columns():
    """Adiciona as colunas faltantes ao banco de dados."""

    print("🔧 Corrigindo colunas faltantes no banco de dados...")
    print("=" * 60)

    # Verificar se as variáveis de ambiente estão configuradas
    required_env_vars = ['DATABASE_URL']
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]

    if missing_vars:
        print(f"❌ Variáveis de ambiente faltando: {', '.join(missing_vars)}")
        print("\n💡 Verifique se o arquivo .env está configurado corretamente.")
        return False

    try:
        # Tentar importar e usar SQLAlchemy
        from app import create_app
        from models import db

        print("🔄 Criando aplicação Flask...")
        app = create_app()

        print("🔄 Conectando ao banco de dados...")
        with app.app_context():
            print("🔄 Verificando colunas existentes...")

            # Verificar quais colunas já existem
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            existing_columns = [col['name'] for col in inspector.get_columns('property')]

            columns_to_add = {
                'address_country': 'VARCHAR(100) DEFAULT \'Brasil\'',
                'address_reference': 'VARCHAR(255)',
                'address_district': 'VARCHAR(255)',
                'zoning_type': 'VARCHAR(100)',
                'urban_zone': 'VARCHAR(100)'
            }

            columns_added = []

            for col_name, col_type in columns_to_add.items():
                if col_name not in existing_columns:
                    print(f"📝 Adicionando coluna '{col_name}'...")
                    try:
                        # Usar SQLAlchemy para adicionar coluna
                        sql = f'ALTER TABLE property ADD COLUMN {col_name} {col_type}'
                        db.engine.execute(sql)
                        columns_added.append(col_name)
                        print(f"✅ Coluna '{col_name}' adicionada com sucesso")
                    except Exception as e:
                        print(f"❌ Erro ao adicionar coluna '{col_name}': {e}")
                else:
                    print(f"ℹ️  Coluna '{col_name}' já existe")

            if columns_added:
                print(f"\n🎉 {len(columns_added)} colunas foram adicionadas com sucesso!")
                print("Colunas adicionadas:", ", ".join(columns_added))
                print("\n✅ O erro de carregamento de propriedades foi resolvido!")
                return True
            else:
                print("\nℹ️  Todas as colunas já existem no banco de dados.")
                print("Se ainda está tendo erro, verifique se o cache do SQLAlchemy precisa ser limpo.")
                return True

    except ImportError as e:
        print(f"❌ Erro de importação: {e}")
        print("\n💡 Verifique se todas as dependências estão instaladas:")
        print("pip install -r requirements.txt")
        return False

    except Exception as e:
        print(f"❌ Erro ao conectar ao banco: {e}")
        print("\n💡 Possíveis soluções:")
        print("1. Verifique se o banco PostgreSQL está rodando")
        print("2. Verifique as configurações em .env")
        print("3. Execute os comandos SQL manualmente")
        print("\n📋 Comandos SQL manuais:")
        print("ALTER TABLE property ADD COLUMN IF NOT EXISTS address_country VARCHAR(100) DEFAULT 'Brasil';")
        print("ALTER TABLE property ADD COLUMN IF NOT EXISTS address_reference VARCHAR(255);")
        print("ALTER TABLE property ADD COLUMN IF NOT EXISTS address_district VARCHAR(255);")
        print("ALTER TABLE property ADD COLUMN IF NOT EXISTS zoning_type VARCHAR(100);")
        print("ALTER TABLE property ADD COLUMN IF NOT EXISTS urban_zone VARCHAR(100);")
        return False

if __name__ == "__main__":
    success = fix_database_columns()

    if success:
        print("\n🚀 Sistema pronto! As melhorias de endereço estão ativas:")
        print("   • Validação automática de CEP")
        print("   • Endereços mais completos no Gandalf")
        print("   • Informações de referência para compradores")
        print("   • Geocodificação aprimorada")
    else:
        print("\n❌ Falha na correção automática.")
        print("Execute os comandos SQL manualmente conforme mostrado acima.")
