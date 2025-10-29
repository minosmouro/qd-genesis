"""Script para criar usuário e tenant (idempotente).
Uso: python backend/scripts/create_user.py
Este script criará o tenant 'tenant_dev' se não existir e o usuário com os dados abaixo.
"""

import os
import sys
# Garantir que a pasta `backend` esteja no sys.path para que imports como `extensions` funcionem
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from extensions import db
from models import User, Tenant
from werkzeug.security import generate_password_hash

EMAIL = 'consultor.eliezer@gmail.com'
PASSWORD = os.environ.get('CRM_DEFAULT_PASSWORD', 'ChangeMe123!')
USERNAME = EMAIL.split('@')[0]
TENANT_NAME = 'tenant_dev'

app = create_app()
with app.app_context():
    tenant = Tenant.query.filter_by(name=TENANT_NAME).first()
    if not tenant:
        tenant = Tenant(name=TENANT_NAME)
        db.session.add(tenant)
        db.session.commit()
        print(f'Created tenant id={tenant.id} name={tenant.name}')
    else:
        print(f'Tenant exists id={tenant.id} name={tenant.name}')

    user = User.query.filter_by(email=EMAIL, tenant_id=tenant.id).first()
    if user:
        print(f'User already exists id={user.id} username={user.username} email={user.email}')
    else:
        hashed = generate_password_hash(PASSWORD)
        user = User(username=USERNAME, email=EMAIL, password=hashed, tenant_id=tenant.id)
        db.session.add(user)
        db.session.commit()
        print(f'Created user id={user.id} username={user.username} email={user.email}')
