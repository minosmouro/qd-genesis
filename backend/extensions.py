import os
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from sqlalchemy import event
from flask_cors import CORS
from flask_migrate import Migrate
from flask import request

# Load .env from project root
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()


def _register_tenant_listeners():
    # Import inside to avoid circular import at module import time
    from flask import g

    @event.listens_for(db.session, 'before_flush')
    def _before_flush(session, flush_context, instances):
        # If a tenant is present in the request context, enforce/propagate tenant_id
        if hasattr(g, 'tenant_id'):
            # Set tenant_id on new instances when missing
            for instance in list(session.new):
                if hasattr(instance, 'tenant_id') and getattr(instance, 'tenant_id', None) is None:
                    try:
                        setattr(instance, 'tenant_id', g.tenant_id)
                    except Exception:
                        # If setting fails, let SQLAlchemy raise later; avoid hiding errors
                        raise

            # Prevent modifying objects that belong to other tenants
            for instance in list(session.dirty):
                if hasattr(instance, 'tenant_id'):
                    current = getattr(instance, 'tenant_id', None)
                    if current is not None and current != g.tenant_id:
                        raise Exception("Cannot modify objects from other tenants")

    @event.listens_for(db.session, 'before_commit')
    def _before_commit(session):
        if hasattr(g, 'tenant_id'):
            for instance in list(session.dirty):
                if hasattr(instance, 'tenant_id'):
                    current = getattr(instance, 'tenant_id', None)
                    if current is not None and current != g.tenant_id:
                        raise Exception("Cannot modify objects from other tenants")


def init_app(app):
    db.init_app(app)
    jwt.init_app(app)
    migrations_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'migrations'))
    migrate.init_app(app, db, directory=migrations_dir)
    
    # ===== CONFIGURAÇÃO CORS AVANÇADA =====
    from config import CORS_ORIGINS

    # Construir lista de origens a partir das variáveis de ambiente e configurações
    raw_env_origins = os.getenv("CORS_ORIGINS", "")
    configured_origins = [origin.strip() for origin in raw_env_origins.split(",") if origin.strip()]
    configured_origins.extend(CORS_ORIGINS or [])

    # Garantir lista única sem duplicatas preservando ordem
    seen = set()
    origins = []
    for origin in configured_origins:
        if origin not in seen:
            seen.add(origin)
            origins.append(origin)

    # Fallback seguro para desenvolvimento se lista estiver vazia
    if not origins:
        origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:4000",
            "http://127.0.0.1:4000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ]
    
    # Log das origens configuradas (útil para debug)
    env = os.getenv("FLASK_ENV", "production")
    print(f"🔒 CORS configurado para ambiente: {env}")
    print(f"🌐 {len(origins)} origens permitidas:")
    for origin in origins:
        print(f"   ✓ {origin}")

    # Inicializar CORS apenas uma vez com configuração robusta
    CORS(
        app,
        origins=origins,
        supports_credentials=True,
        # Headers que o cliente pode ver na resposta
        expose_headers=[
            "Content-Type",
            "Authorization",
            "Content-Disposition",
            "X-Total-Count",
            "X-Request-Id",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
        ],
        # Headers que o cliente pode enviar
        allow_headers=[
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-CSRFToken",
            "X-CSRF-Token",
            "X-Client-Version",
            "X-Tenant-Id",
            "Tenant-Id",
            "Accept",
            "Origin",
            "idempotency-key",
            "Cache-Control",
        ],
        # Métodos HTTP permitidos
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        # Cache de preflight (OPTIONS) - 1 hora
        max_age=3600,
    )
    
    # Middleware adicional para debug de CORS em desenvolvimento
    if app.config.get('DEBUG', False) or env == 'development':
        @app.after_request
        def log_cors_headers(response):
            origin = request.headers.get('Origin')
            if origin:
                print(f"🔍 CORS Request from: {origin}")
                print(f"   Headers: {dict(request.headers)}")
                print(f"   Response CORS: {response.headers.get('Access-Control-Allow-Origin')}")
            return response
    
    # Register tenancy listeners once app is initialized
    _register_tenant_listeners()
