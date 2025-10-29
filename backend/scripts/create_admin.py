"""Script para criar um usuário admin simples para teste"""
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from extensions import db
from models import User, Tenant
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    tenant = Tenant.query.filter_by(name='tenant_dev').first()
    if not tenant:
        tenant = Tenant(name='tenant_dev')
        db.session.add(tenant)
        db.session.commit()
        print(f'Created tenant: {tenant.name}')
    
    # Criar usuário admin simples
    admin = User.query.filter_by(username='admin', tenant_id=tenant.id).first()
    if admin:
        # Atualizar senha
        admin.password = generate_password_hash('admin123')
        db.session.commit()
        print('Updated admin password to: admin123')
    else:
        admin = User(
            username='admin',
            email='admin@test.com',
            password=generate_password_hash('admin123'),
            tenant_id=tenant.id
        )
        db.session.add(admin)
        db.session.commit()
        print('Created admin user with password: admin123')
