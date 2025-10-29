from app import create_app
from extensions import db
from models import User, Tenant
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    username = 'admin'
    password = 'admin123'
    tenant_name = 'default'

    tenant = Tenant.query.filter_by(name=tenant_name).first()
    if not tenant:
        tenant = Tenant(name=tenant_name)
        db.session.add(tenant)
        db.session.commit()
        print(f'Created tenant: {tenant_name} (id={tenant.id})')

    existing = User.query.filter_by(username=username, tenant_id=tenant.id).first()
    if existing:
        print(f'User {username} already exists (id={existing.id})')
    else:
        hashed = generate_password_hash(password)
        user = User(username=username, email='admin@local', password=hashed, tenant_id=tenant.id)
        db.session.add(user)
        db.session.commit()
        print(f'Created user {username} with password {password} (id={user.id})')
