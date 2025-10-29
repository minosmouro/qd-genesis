"""
Empreendimentos Module
Provides API endpoints for real estate development management
Refactored from root-level empreendimentos_api.py
"""
from flask import Blueprint

# Create the blueprint
empreendimentos_bp = Blueprint(
    'empreendimentos',
    __name__,
    url_prefix='/api/empreendimentos'
)

# Lazy route registration to avoid circular imports
_routes_registered = False

def init_module():
    global _routes_registered
    if _routes_registered:
        return
    from .routes.empreendimento_routes import create_empreendimentos_routes
    create_empreendimentos_routes(empreendimentos_bp)
    _routes_registered = True

__all__ = ["empreendimentos_bp", "init_module"]
