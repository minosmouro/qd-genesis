#!/usr/bin/env python3
"""
Script para inicializar o sistema CRM com tenant master e super admin
Executa: python scripts/init_system.py
"""
import sys
import os

# Adicionar o diretório parent ao path para imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from extensions import db
from models import User, Tenant
from werkzeug.security import generate_password_hash
from app import create_app
import click

def create_master_tenant():
    """Criar tenant master se não existir"""
    master_tenant = Tenant.query.filter_by(id=1).first()
    
    if not master_tenant:
        master_tenant = Tenant(name="Master Admin")
        db.session.add(master_tenant)
        db.session.flush()
        
        # Forçar ID = 1 para master tenant
        if master_tenant.id != 1:
            db.session.execute("UPDATE tenant SET id = 1 WHERE name = 'Master Admin'")
            db.session.flush()
            
        print("✅ Tenant Master criado com ID = 1")
    else:
        print("✅ Tenant Master já existe")
        
    return master_tenant

def create_super_admin(username="admin", email="admin@quadradois.com", password="admin123"):
    """Criar super admin se não existir"""
    super_admin = User.query.filter_by(tenant_id=1, is_admin=True).first()
    
    if not super_admin:
        hashed_password = generate_password_hash(password)
        super_admin = User(
            username=username,
            email=email,
            password=hashed_password,
            tenant_id=1,
            is_admin=True
        )
        db.session.add(super_admin)
        print(f"✅ Super Admin criado: {username} / {email}")
        print(f"🔑 Password: {password}")
    else:
        print(f"✅ Super Admin já existe: {super_admin.username}")
        
    return super_admin

def create_demo_tenants():
    """Criar tenants demo para testes"""
    demo_tenants = [
        {
            'name': 'Imobiliária Silva & Santos', 
            'admin_username': 'admin_silva',
            'admin_email': 'admin@silvasantos.com',
            'admin_password': 'silva123'
        },
        {
            'name': 'Corretora Prime Imóveis',
            'admin_username': 'admin_prime', 
            'admin_email': 'admin@primeиmoveis.com',
            'admin_password': 'prime123'
        },
        {
            'name': 'Grupo Residencial Plus',
            'admin_username': 'admin_plus',
            'admin_email': 'admin@residencialplus.com', 
            'admin_password': 'plus123'
        }
    ]
    
    created_tenants = []
    
    for tenant_data in demo_tenants:
        # Verificar se tenant já existe
        existing = Tenant.query.filter_by(name=tenant_data['name']).first()
        if existing:
            print(f"⚠️ Tenant já existe: {tenant_data['name']}")
            continue
            
        # Criar tenant
        new_tenant = Tenant(name=tenant_data['name'])
        db.session.add(new_tenant)
        db.session.flush()
        
        # Criar admin do tenant
        hashed_password = generate_password_hash(tenant_data['admin_password'])
        admin_user = User(
            username=tenant_data['admin_username'],
            email=tenant_data['admin_email'],
            password=hashed_password,
            tenant_id=new_tenant.id,
            is_admin=True
        )
        db.session.add(admin_user)
        
        created_tenants.append({
            'tenant': new_tenant,
            'admin': admin_user,
            'credentials': tenant_data
        })
        
        print(f"✅ Tenant criado: {tenant_data['name']}")
        print(f"   👤 Admin: {tenant_data['admin_username']} / {tenant_data['admin_email']}")
        print(f"   🔑 Password: {tenant_data['admin_password']}")
        
    return created_tenants

def create_demo_users():
    """Criar usuários demo para cada tenant"""
    demo_users_template = [
        {'username': 'corretor1', 'email': 'corretor1@{domain}', 'password': 'corretor123', 'is_admin': False},
        {'username': 'corretor2', 'email': 'corretor2@{domain}', 'password': 'corretor123', 'is_admin': False},
        {'username': 'corretor3', 'email': 'corretor3@{domain}', 'password': 'corretor123', 'is_admin': False},
        {'username': 'supervisor', 'email': 'supervisor@{domain}', 'password': 'supervisor123', 'is_admin': True},
    ]
    
    # Pegar todos os tenants (exceto master)
    tenants = Tenant.query.filter(Tenant.id != 1).all()
    
    for tenant in tenants:
        domain = tenant.name.lower().replace(' ', '').replace('&', '').replace('imobiliária', '').replace('corretora', '').replace('grupo', '') + '.com'
        
        print(f"\n📋 Criando usuários para {tenant.name}:")
        
        for user_template in demo_users_template:
            username = f"{user_template['username']}"
            email = user_template['email'].format(domain=domain)
            
            # Verificar se já existe
            existing = User.query.filter_by(username=username, tenant_id=tenant.id).first()
            if existing:
                continue
                
            hashed_password = generate_password_hash(user_template['password'])
            new_user = User(
                username=username,
                email=email,
                password=hashed_password,
                tenant_id=tenant.id,
                is_admin=user_template['is_admin']
            )
            db.session.add(new_user)
            
            role = "Admin" if user_template['is_admin'] else "Corretor"
            print(f"   👤 {role}: {username} / {email} (senha: {user_template['password']})")

@click.command()
@click.option('--demo', is_flag=True, help='Criar dados demo para testes')
@click.option('--admin-password', default='admin123', help='Senha do super admin')
def init_system(demo, admin_password):
    """Inicializar sistema CRM com tenants e usuários"""
    
    print("🚀 Inicializando Sistema CRM Quadra Dois")
    print("=" * 50)
    
    app = create_app()
    with app.app_context():
        try:
            # Criar tabelas se não existirem
            db.create_all()
            print("✅ Tabelas do banco verificadas/criadas")
            
            # 1. Criar tenant master
            master_tenant = create_master_tenant()
            
            # 2. Criar super admin  
            super_admin = create_super_admin(password=admin_password)
            
            # 3. Criar tenants demo se solicitado
            if demo:
                print("\n📊 Criando dados DEMO:")
                print("-" * 30)
                created_tenants = create_demo_tenants()
                create_demo_users()
            
            # Commit todas as alterações
            db.session.commit()
            
            print("\n" + "=" * 50)
            print("🎉 Sistema inicializado com sucesso!")
            print("\n📋 CREDENCIAIS DE ACESSO:")
            print("-" * 30)
            print(f"🔑 SUPER ADMIN:")
            print(f"   Username: admin")
            print(f"   Email: admin@quadradois.com") 
            print(f"   Password: {admin_password}")
            print(f"   URL: /auth/login")
            
            if demo:
                print(f"\n📊 DADOS DEMO CRIADOS:")
                print(f"   - 3 Tenants (imobiliárias)")
                print(f"   - 1 Admin por tenant")
                print(f"   - 4 Usuários por tenant (3 corretores + 1 supervisor)")
                print(f"   - Total: ~15 usuários para testes")
                
            print("\n🚀 Pronto para deploy!")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Erro ao inicializar sistema: {str(e)}")
            sys.exit(1)

if __name__ == '__main__':
    init_system()