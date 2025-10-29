"""Script para listar usuários disponíveis no banco"""
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from extensions import db
from models import User, Tenant

app = create_app()
with app.app_context():
    print("=== USUÁRIOS CADASTRADOS ===")
    users = User.query.all()
    for user in users:
        tenant = Tenant.query.get(user.tenant_id)
        print(f"ID: {user.id}")
        print(f"Username: {user.username}")
        print(f"Email: {user.email}")
        print(f"Tenant ID: {user.tenant_id}")
        print(f"Tenant Name: {tenant.name if tenant else 'N/A'}")
        print("---")
    
    print("\n=== CREDENCIAIS DE INTEGRAÇÃO ===")
    from models import IntegrationCredentials
    creds = IntegrationCredentials.query.all()
    for cred in creds:
        print(f"Provider: {cred.provider}")
        print(f"Tenant ID: {cred.tenant_id}")
        print(f"User ID: {cred.user_id if hasattr(cred, 'user_id') else 'N/A'}")
        print(f"Tem token?: {'Sim' if cred.token_encrypted else 'Não'}")
        print("---")
