"""Seed de dados essenciais para executar testes E2E/local."""

import os
from datetime import datetime, timezone
from pathlib import Path
import sys

from werkzeug.security import generate_password_hash

from sqlalchemy import text

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.append(str(BACKEND_ROOT))

from app import create_app
from extensions import db
from models import Property, Tenant, User


DEFAULT_TENANT_NAME = os.getenv("E2E_TENANT_NAME", "Tenant E2E")
ADMIN_USERNAME = os.getenv("E2E_ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("E2E_ADMIN_PASSWORD", "admin123")
ADMIN_EMAIL = os.getenv("E2E_ADMIN_EMAIL", "admin@example.com")
TEST_USERNAME = os.getenv("E2E_TEST_USERNAME", "testuser")
TEST_PASSWORD = os.getenv("E2E_TEST_PASSWORD", "password123")
TEST_EMAIL = os.getenv("E2E_TEST_EMAIL", "test@example.com")
TARGET_PROPERTY_ID = int(os.getenv("E2E_TARGET_PROPERTY_ID", "311"))
TARGET_TENANT_ID = int(os.getenv("E2E_TARGET_TENANT_ID", "1"))
TARGET_PROPERTY_CODE = os.getenv("E2E_TARGET_PROPERTY_CODE", "E2E-311")
TARGET_PROPERTY_EXTERNAL_ID = os.getenv("E2E_TARGET_PROPERTY_EXTERNAL_ID", "E2E-EXT-311")


def _ensure_tenant():
    tenant = Tenant.query.filter_by(id=TARGET_TENANT_ID).first()
    if tenant:
        tenant.name = tenant.name or DEFAULT_TENANT_NAME
        tenant.is_active = True
        return tenant

    tenant = Tenant(
        id=TARGET_TENANT_ID,
        name=DEFAULT_TENANT_NAME,
        tenant_type="PJ",
        email="contato+e2e@quadradois.com",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        is_active=True,
    )
    db.session.add(tenant)
    db.session.flush()
    return tenant


def _ensure_user(username: str, email: str, password: str, tenant_id: int, is_admin: bool = False):
    user = User.query.filter_by(username=username, tenant_id=tenant_id).first()
    hashed_password = generate_password_hash(password)

    if user:
        user.email = email
        user.password = hashed_password
        user.is_admin = is_admin
        return user

    user = User(
        username=username,
        email=email,
        password=hashed_password,
        tenant_id=tenant_id,
        is_admin=is_admin,
    )
    db.session.add(user)
    db.session.flush()
    return user


def _ensure_property(tenant_id: int):
    property_obj = Property.query.filter_by(id=TARGET_PROPERTY_ID).first()

    if property_obj:
        property_obj.title = property_obj.title or "Imóvel E2E"
        property_obj.description = property_obj.description or "Imóvel seed para testes E2E"
        property_obj.external_id = TARGET_PROPERTY_EXTERNAL_ID
        property_obj.property_code = TARGET_PROPERTY_CODE
        property_obj.status = property_obj.status or "active"
        property_obj.tenant_id = tenant_id
        if not property_obj.created_at:
            property_obj.created_at = datetime.now(timezone.utc)
        property_obj.updated_at = datetime.now(timezone.utc)
        return property_obj

    property_obj = Property(
        id=TARGET_PROPERTY_ID,
        title="Imóvel E2E",
        description="Imóvel seed para testes E2E",
        external_id=TARGET_PROPERTY_EXTERNAL_ID,
        property_code=TARGET_PROPERTY_CODE,
        tenant_id=tenant_id,
        status="active",
        remote_id="REMOTE-E2E-311",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        address_city="São Paulo",
        address_state="SP",
        address_street="Rua dos Testes",
        address_number="123",
    )
    db.session.add(property_obj)
    db.session.flush()

    # Garantir que a sequência do Postgres não quebre após inserir ID manual.
    db.session.execute(
        text(
            "SELECT setval('property_id_seq', GREATEST((SELECT MAX(id) FROM property), :target_id))"
        ),
        {"target_id": TARGET_PROPERTY_ID},
    )

    return property_obj


def seed():
    app = create_app()
    with app.app_context():
        tenant = _ensure_tenant()
        _ensure_user(ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD, tenant.id, is_admin=True)
        _ensure_user(TEST_USERNAME, TEST_EMAIL, TEST_PASSWORD, tenant.id, is_admin=False)
        _ensure_property(tenant.id)
        db.session.commit()
        print("Seed concluído com sucesso.")


if __name__ == "__main__":
    seed()
