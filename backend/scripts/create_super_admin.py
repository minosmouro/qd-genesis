#!/usr/bin/env python3
"""
Script para criar usuário Super Admin no banco de dados.
Uso: docker exec -it quadradois-backend-1 python /app/scripts/create_super_admin.py
"""

import sys
import os

# Adicionar o diretório backend ao path
sys.path.insert(0, '/app/backend')
os.chdir('/app/backend')

from app import create_app
from extensions import db
from models import User, Tenant
from werkzeug.security import generate_password_hash

# Credenciais do Super Admin
ADMIN_EMAIL = 'consultor.eliezer@gmail.com'
ADMIN_PASSWORD = '@Epbaa090384!@#$'
ADMIN_USERNAME = 'admin'
TENANT_NAME = 'Quadradois'

flask_app = create_app()

with flask_app.app_context():
    print("=" * 60)
    print("🔧 CRIANDO SUPER ADMIN")
    print("=" * 60)
    
    # 1. Criar ou obter tenant
    tenant = Tenant.query.filter_by(name=TENANT_NAME).first()
    if not tenant:
        tenant = Tenant(name=TENANT_NAME)
        db.session.add(tenant)
        db.session.commit()
        print(f"✅ Tenant '{TENANT_NAME}' criado (ID: {tenant.id})")
    else:
        print(f"✅ Tenant '{TENANT_NAME}' já existe (ID: {tenant.id})")
    
    # 2. Verificar se admin já existe
    existing_admin = User.query.filter_by(email=ADMIN_EMAIL, tenant_id=tenant.id).first()
    
    if existing_admin:
        print(f"⚠️  Usuário com email {ADMIN_EMAIL} já existe!")
        print(f"   Atualizando credenciais...")
        
        # Atualizar credenciais
        existing_admin.username = ADMIN_USERNAME
        existing_admin.password = generate_password_hash(ADMIN_PASSWORD)
        existing_admin.is_admin = True
        db.session.commit()
        
        print("=" * 60)
        print("✅ SUPER ADMIN ATUALIZADO COM SUCESSO!")
        print("=" * 60)
        print(f"📧 Email:    {ADMIN_EMAIL}")
        print(f"🔑 Senha:    {ADMIN_PASSWORD}")
        print(f"👤 Username: {ADMIN_USERNAME}")
        print(f"🏢 Tenant:   {TENANT_NAME} (ID: {tenant.id})")
        print(f"⭐ Role:     Super Admin (is_admin=True)")
        print("=" * 60)
    else:
        # Criar novo usuário admin
        admin_user = User(
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            password=generate_password_hash(ADMIN_PASSWORD),
            tenant_id=tenant.id,
            is_admin=True
        )
        db.session.add(admin_user)
        db.session.commit()
        
        print("=" * 60)
        print("✅ SUPER ADMIN CRIADO COM SUCESSO!")
        print("=" * 60)
        print(f"📧 Email:    {ADMIN_EMAIL}")
        print(f"🔑 Senha:    {ADMIN_PASSWORD}")
        print(f"👤 Username: {ADMIN_USERNAME}")
        print(f"🏢 Tenant:   {TENANT_NAME} (ID: {tenant.id})")
        print(f"⭐ Role:     Super Admin (is_admin=True)")
        print("=" * 60)
        print()
        print("🌐 Acesse: http://localhost:3000")
        print("=" * 60)
