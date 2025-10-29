"""Script para criptografar tokens existentes em integration_credentials que estejam em texto plano.
Uso: python backend/scripts/encrypt_existing_tokens.py
"""
from app import create_app
from extensions import db
from models import IntegrationCredentials
from utils.crypto import encrypt_token

app = create_app()
with app.app_context():
    rows = IntegrationCredentials.query.all()
    updated = 0
    for row in rows:
        try:
            # heurística simples: Fernet tokens costumam ter 4 partes separadas por '.' ou terminam com '='; nosso token de exemplo contém '.' mas é JWT.
            # Detectar se já parece estar criptografado tentativa: Fernet produz base64 sem dots, mas para simplificar, checamos se o campo contém ' ' (espaço) ou '{' (json) => assumimos texto plano
            token = row.token_encrypted or ''
            if not token:
                continue
            if token.count('.') == 2:
                # JWT -> criptografar
                row.token_encrypted = encrypt_token(token)
                updated += 1
            # caso contrario assume-se já criptografado
        except Exception as e:
            print('Failed to encrypt row id=', row.id, 'error=', e)
    if updated:
        db.session.commit()
    print('Updated', updated, 'rows')
