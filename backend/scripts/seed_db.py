"""Seed script para criar tenant e user de teste.
Uso:
  python backend/scripts/seed_db.py --tenant "Tenant A" --username admin --email admin@example.com --password secret123
"""
import argparse
import os
from werkzeug.security import generate_password_hash

from app import create_app
from extensions import db
from models import Tenant, User


def seed(tenant_name, username, email, password):
    app = create_app()
    with app.app_context():
        tenant = Tenant.query.filter_by(name=tenant_name).first()
        if not tenant:
            tenant = Tenant(name=tenant_name)
            db.session.add(tenant)
            db.session.commit()
            print(f'Created tenant id={tenant.id} name={tenant.name}')
        else:
            print(f'Tenant already exists id={tenant.id} name={tenant.name}')

        user = User.query.filter_by(username=username, tenant_id=tenant.id).first()
        if user:
            print(f'User already exists id={user.id} username={user.username}')
            return

        hashed = generate_password_hash(password)
        user = User(username=username, email=email, password=hashed, tenant_id=tenant.id)
        db.session.add(user)
        db.session.commit()
        print(f'Created user id={user.id} username={user.username} tenant_id={user.tenant_id}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--tenant', default='tenant_dev')
    parser.add_argument('--username', default='admin')
    parser.add_argument('--email', default='admin@example.com')
    parser.add_argument('--password', default='secret123')
    args = parser.parse_args()
    seed(args.tenant, args.username, args.email, args.password)
