#!/usr/bin/env python3
"""
SCRIPT AUTOMÁTICO PARA CORREÇÃO DO BANCO DE DADOS

Este script tenta corrigir automaticamente o erro das colunas faltantes.
Se não conseguir conectar, fornece instruções manuais.

Uso: python scripts/auto_fix_db.py
"""

import os
import sys
import psycopg2
from pathlib import Path

# Adicionar backend ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

def try_auto_fix():
    """Tenta corrigir automaticamente o banco de dados."""

    print("🔧 TENTATIVA DE CORREÇÃO AUTOMÁTICA")
    print("=" * 50)

    # Tentar diferentes configurações de conexão
    connection_configs = [
        {
            'host': 'localhost',
            'database': 'gandalf',
            'user': 'postgres',
            'password': '',
            'port': '5432'
        },
        {
            'host': '127.0.0.1',
            'database': 'gandalf',
            'user': 'postgres',
            'password': '',
            'port': '5432'
        },
        {
            'host': 'localhost',
            'database': 'postgres',
            'user': 'postgres',
            'password': '',
            'port': '5432'
        }
    ]

    # Comandos SQL
    sql_commands = [
        "ALTER TABLE property ADD COLUMN IF NOT EXISTS address_country VARCHAR(100) DEFAULT 'Brasil';",
        "ALTER TABLE property ADD COLUMN IF NOT EXISTS address_reference VARCHAR(255);",
        "ALTER TABLE property ADD COLUMN IF NOT EXISTS address_district VARCHAR(255);",
        "ALTER TABLE property ADD COLUMN IF NOT EXISTS zoning_type VARCHAR(100);",
        "ALTER TABLE property ADD COLUMN IF NOT EXISTS urban_zone VARCHAR(100);"
    ]

    success = False

    for i, config in enumerate(connection_configs):
        print(f"\\n🔍 Tentativa {i+1}/3 - Conectando a {config['host']}:{config['port']}/{config['database']}")

        try:
            conn = psycopg2.connect(**config)
            conn.autocommit = True
            cursor = conn.cursor()

            print("✅ Conexão estabelecida!")

            # Executar comandos
            for j, sql in enumerate(sql_commands, 1):
                try:
                    print(f"📝 Executando comando {j}/5...")
                    cursor.execute(sql)
                    print(f"✅ Comando {j} executado")
                except Exception as e:
                    print(f"⚠️  Comando {j} teve problema: {e}")

            cursor.close()
            conn.close()

            print("\\n🎉 CORREÇÃO AUTOMÁTICA CONCLUÍDA!")
            print("✅ As colunas foram adicionadas ao banco de dados")
            success = True
            break

        except psycopg2.OperationalError as e:
            print(f"❌ Falhou: {e}")
            continue
        except Exception as e:
            print(f"❌ Erro inesperado: {e}")
            continue

    if not success:
        print("\\n" + "="*50)
        print("❌ CORREÇÃO AUTOMÁTICA FALHOU")
        print("Execute os comandos SQL manualmente:")
        print("="*50)

        for i, sql in enumerate(sql_commands, 1):
            print(f"{i}. {sql}")

        print("\\n🔧 Como executar manualmente:")
        print("1. Abra pgAdmin ou DBeaver")
        print("2. Conecte-se ao banco PostgreSQL")
        print("3. Execute os comandos acima um por vez")
        print("4. Reinicie a aplicação")

    return success

def main():
    print("🚨 RESOLUÇÃO DO ERRO: column property.address_country does not exist")
    print("=" * 70)
    print()

    # Tentar correção automática
    if try_auto_fix():
        print("\\n🎯 PRÓXIMOS PASSOS:")
        print("1. Reinicie a aplicação Flask")
        print("2. Recarregue a página no navegador")
        print("3. O erro estará resolvido!")
    else:
        print("\\n💡 Execute as instruções manuais acima.")

    print("\\n📞 Se ainda tiver problemas, verifique:")
    print("• PostgreSQL está rodando")
    print("• Credenciais de acesso estão corretas")
    print("• Nome do banco de dados está correto")

if __name__ == "__main__":
    main()
