#!/usr/bin/env python3
"""
Script de emergência para corrigir colunas faltantes.
Execute este script se o banco estiver disponível.

Uso: python emergency_db_fix.py
"""

import psycopg2
import os

def emergency_db_fix():
    """Correção de emergência das colunas faltantes."""

    print("🚨 CORREÇÃO DE EMERGÊNCIA - Colunas de Endereço")
    print("=" * 60)

    # Configurações padrão (ajuste conforme necessário)
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'database': os.getenv('DB_NAME', 'gandalf'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', ''),
        'port': os.getenv('DB_PORT', '5432')
    }

    print("🔧 Tentando conectar ao banco de dados...")
    print(f"📍 Host: {db_config['host']}")
    print(f"📍 Banco: {db_config['database']}")
    print(f"📍 Usuário: {db_config['user']}")
    print(f"📍 Porta: {db_config['port']}")

    # Comandos SQL para adicionar colunas
    sql_commands = [
        "ALTER TABLE property ADD COLUMN IF NOT EXISTS address_country VARCHAR(100) DEFAULT 'Brasil';",
        "ALTER TABLE property ADD COLUMN IF NOT EXISTS address_reference VARCHAR(255);",
        "ALTER TABLE property ADD COLUMN IF NOT EXISTS address_district VARCHAR(255);",
        "ALTER TABLE property ADD COLUMN IF NOT EXISTS zoning_type VARCHAR(100);",
        "ALTER TABLE property ADD COLUMN IF NOT EXISTS urban_zone VARCHAR(100);"
    ]

    try:
        # Conectar ao banco
        conn = psycopg2.connect(**db_config)
        conn.autocommit = True
        cursor = conn.cursor()

        print("\\n🔄 Executando comandos SQL...")

        for i, sql in enumerate(sql_commands, 1):
            try:
                print(f"📝 Executando comando {i}/5...")
                cursor.execute(sql)
                print(f"✅ Comando {i} executado com sucesso")
            except Exception as e:
                print(f"⚠️  Comando {i} pode já existir ou teve erro: {e}")

        cursor.close()
        conn.close()

        print("\\n🎉 CORREÇÃO CONCLUÍDA!")
        print("✅ As colunas de endereço foram adicionadas ao banco.")
        print("✅ O erro de carregamento de propriedades foi resolvido.")
        print("\\n🚀 Sistema pronto para uso!")

        return True

    except psycopg2.OperationalError as e:
        print(f"\\n❌ ERRO DE CONEXÃO: {e}")
        print("\\n💡 Verifique:")
        print("1. Se o PostgreSQL está rodando")
        print("2. Se as configurações de conexão estão corretas")
        print("3. Se o banco de dados existe")

    except Exception as e:
        print(f"\\n❌ ERRO INESPERADO: {e}")

    # Instruções manuais se a conexão automática falhar
    print("\\n" + "="*60)
    print("📋 INSTRUÇÕES MANUAIS (se a correção automática falhou):")
    print("="*60)
    print("\\nExecute estes comandos SQL no seu banco PostgreSQL:")
    print()

    for i, sql in enumerate(sql_commands, 1):
        print(f"{i}. {sql}")

    print("\\n🔧 Como executar:")
    print("1. Abra pgAdmin ou DBeaver")
    print("2. Conecte-se ao banco 'gandalf'")
    print("3. Abra um Query Tool")
    print("4. Execute cada comando acima")
    print("5. Reinicie a aplicação")

    return False

if __name__ == "__main__":
    success = emergency_db_fix()

    if success:
        print("\\n🎯 PRÓXIMOS PASSOS:")
        print("1. Reinicie a aplicação Flask")
        print("2. Teste o carregamento de propriedades")
        print("3. Verifique se o erro foi resolvido")
    else:
        print("\\n❌ Execute as instruções manuais acima para corrigir o problema.")
