#!/usr/bin/env python3
"""
SCRIPT DE EMERGÊNCIA PARA CORREÇÃO IMEDIATA DO BANCO DE DADOS

Este script resolve o erro:
(psycopg2.errors.UndefinedColumn) column property.address_country does not exist

INSTRUÇÕES:
1. Execute este script: python scripts/fix_db_now.py
2. Se não funcionar, execute os comandos SQL manualmente
"""

import os
import sys
from pathlib import Path

# Adicionar backend ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

def main():
    print("🚨 CORREÇÃO IMEDIATA DO ERRO DE BANCO DE DADOS")
    print("=" * 60)
    print()

    print("❌ ERRO ATUAL:")
    print("column property.address_country does not exist")
    print()

    print("✅ SOLUÇÃO:")
    print("Adicionar as colunas faltantes ao banco de dados")
    print()

    # Comandos SQL que precisam ser executados
    sql_commands = [
        "ALTER TABLE property ADD COLUMN IF NOT EXISTS address_country VARCHAR(100) DEFAULT 'Brasil';",
        "ALTER TABLE property ADD COLUMN IF NOT EXISTS address_reference VARCHAR(255);",
        "ALTER TABLE property ADD COLUMN IF NOT EXISTS address_district VARCHAR(255);",
        "ALTER TABLE property ADD COLUMN IF NOT EXISTS zoning_type VARCHAR(100);",
        "ALTER TABLE property ADD COLUMN IF NOT EXISTS urban_zone VARCHAR(100);"
    ]

    print("📋 COMANDOS SQL PARA EXECUTAR:")
    print("-" * 40)

    for i, cmd in enumerate(sql_commands, 1):
        print(f"{i}. {cmd}")

    print()
    print("🔧 OPÇÕES PARA EXECUTAR:")
    print("-" * 40)

    print("OPÇÃO 1 - VIA TERMINAL (Mais Fácil):")
    print("1. Abra o terminal/cmd")
    print("2. Execute cada comando abaixo:")
    print()

    for cmd in sql_commands:
        print(f"   psql -U postgres -d gandalf -c \"{cmd}\"")

    print()
    print("OPÇÃO 2 - VIA pgAdmin/DBeaver:")
    print("1. Abra pgAdmin ou DBeaver")
    print("2. Conecte-se ao banco 'gandalf'")
    print("3. Abra Query Tool")
    print("4. Cole e execute cada comando SQL acima")
    print()

    print("OPÇÃO 3 - VIA Docker (se usar container):")
    print("1. Execute:")
    print("   docker exec -it seu_container_postgres psql -U postgres -d gandalf")
    print("2. Cole os comandos SQL acima")
    print()

    print("🎯 APÓS EXECUTAR OS COMANDOS:")
    print("-" * 40)
    print("1. Reinicie a aplicação Flask")
    print("2. Recarregue a página no navegador")
    print("3. O erro será resolvido!")
    print()

    print("📞 SUPORTE:")
    print("-" * 40)
    print("Se ainda tiver problemas:")
    print("1. Verifique se o PostgreSQL está rodando")
    print("2. Confirme o nome do banco de dados")
    print("3. Verifique as credenciais de acesso")
    print()

    print("🚀 PRONTO PARA CORREÇÃO!")
    print("Execute os comandos SQL acima e o problema será resolvido.")

if __name__ == "__main__":
    main()
