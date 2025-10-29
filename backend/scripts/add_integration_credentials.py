"""Script para inserir IntegrationCredentials de teste para tenant 1.
Uso: PYTHONPATH=/app python backend/scripts/add_integration_credentials.py
"""
from app import create_app
from extensions import db
from models import IntegrationCredentials, Tenant
from utils.crypto import encrypt_token

app = create_app()
with app.app_context():
    tenant = Tenant.query.filter_by(name='tenant_dev').first()
    if not tenant:
        tenant = Tenant.query.first()
    if not tenant:
        print('No tenant found, aborting')
    else:
        # token retirado dos scripts de teste em /testes
        token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTYyOTk3NjAsInVzZXJfbmFtZSI6InJpY2FyZG8xMGNvcnJldG9yQGdtYWlsLmNvbSIsImF1dGhvcml0aWVzIjpbIlJPTEVfU0lURSIsIlNJVEUiXSwianRpIjoiZmE1YWM0MTYtZDUwYy00NTkzLTkxZDctZDdlZmNlYjUyNDA1IiwiY2xpZW50X2lkIjoiY2FuYWxwcm8iLCJzY29wZSI6WyJyZWFkIl19._MTmq8iqkPJmOtJkXdE4O7-kBgu3lDsN6Ojv9ibDwJA'
        metadata = {
            'publisher_id': '119007',
            'odin_id': '49262cbf-1279-1804-c045-8f950d084c70',
            'contract_id': '517f13eb-6730-4b6b-3c92-9e657428a0a0',
            'client_id': 'CANALPRO_WEB',
            'company': 'ZAP_OLX'
        }
        existing = IntegrationCredentials.query.filter_by(tenant_id=tenant.id, provider='gandalf').first()
        if existing:
            print('IntegrationCredentials already exists id=', existing.id)
        else:
            encrypted = encrypt_token(token)
            creds = IntegrationCredentials(tenant_id=tenant.id, provider='gandalf', token_encrypted=encrypted, metadata_json=metadata)
            db.session.add(creds)
            db.session.commit()
            print('Created IntegrationCredentials id=', creds.id)
