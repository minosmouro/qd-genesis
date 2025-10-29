#!/usr/bin/env python3
"""
Script auxiliar para exportação de imóveis para Canal Pro

Este script facilita o uso do exportador, permitindo configuração via arquivo .env
e execução interativa.

Uso:
    python scripts/export_to_canalpro.py
"""

import os
import sys
import uuid
from pathlib import Path

# Adicionar backend ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

def load_env_file():
    """Carrega variáveis de ambiente do arquivo .env se existir"""
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        from dotenv import load_dotenv
        load_dotenv(env_path)
        print(f"✅ Variáveis carregadas do arquivo {env_path}")

def main():
    """Função principal do script auxiliar"""
    print("🏠 Exportação de Imóveis para Canal Pro")
    print("=" * 50)

    # Tentar carregar .env
    load_env_file()

    # Verificar se existem credenciais no sistema
    try:
        from app import create_app
        from models import IntegrationCredentials

        app = create_app()
        with app.app_context():
            cred = IntegrationCredentials.query.filter_by(
                tenant_id=1,
                provider='gandalf'
            ).first()

            if not cred:
                print("❌ Credenciais do Canal Pro não encontradas no sistema")
                print("\nPara configurar as credenciais:")
                print("1. Execute o login interativo: python scripts/login_interactive.py")
                print("2. Ou use o sistema de autenticação existente")
                print("\n🔐 Modo Interativo:")
                print("Será solicitado email e senha para fazer login")

                # Modo interativo para primeira configuração
                email = input("Digite seu email do Canal Pro: ")
                password = input("Digite sua senha do Canal Pro: ")
                device_id = input("Digite o ID do dispositivo (ou pressione Enter para gerar): ") or str(uuid.uuid4())

                os.environ['GANDALF_EMAIL'] = email
                os.environ['GANDALF_PASSWORD'] = password
                os.environ['GANDALF_DEVICE_ID'] = device_id

                print("\nExecute: python scripts/login_interactive.py para configurar as credenciais")
                return

            print("✅ Credenciais encontradas no sistema")

    except Exception as e:
        print(f"❌ Erro ao verificar credenciais: {e}")
        return

    # Variáveis opcionais
    optional_vars = {
        'GANDALF_PUBLISHER_ID': '119007',
        'GANDALF_ODIN_ID': '49262cbf-1279-1804-c045-8f950d084c70',
        'GANDALF_CONTRACT_ID': '517f13eb-6730-4b6b-3c92-9e657428a0a0'
    }

    for var, default in optional_vars.items():
        if not os.environ.get(var):
            os.environ[var] = default

    print("\n🚀 Iniciando exportação...")

    # Importar e executar o exportador
    try:
        from integrations.canalpro_exporter import main as exporter_main
        exporter_main()
    except ImportError as e:
        print(f"❌ Erro ao importar o exportador: {e}")
        print("Verifique se o arquivo integrations/canalpro_exporter.py existe")
    except Exception as e:
        print(f"❌ Erro durante a exportação: {e}")

if __name__ == '__main__':
    main()
