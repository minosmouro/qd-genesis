"""
Properties Blueprint - Refactored
This module provides a clean, organized structure for property-related operations.
"""
from flask import Blueprint, request, g, current_app

# Import route registration functions
from .routes.property_routes import create_property_routes
from .routes.upload_routes import create_upload_routes
from .routes.import_routes import create_import_routes
from .routes.bulk_routes import create_bulk_routes
from .routes.delete_routes import create_delete_routes
from .routes.dashboard_routes import create_dashboard_routes
from .routes.health_routes import health_bp
from .routes.refresh_endpoint import refresh_endpoint_bp
from .middleware import setup_monitoring

properties_bp = Blueprint('properties', __name__, url_prefix='/api/properties')

# Automatic request logging for this blueprint
@properties_bp.before_request
def _log_properties_request():
    try:
        logger = current_app.logger
        tenant = getattr(g, 'tenant_id', None)
        body = None
        try:
            body = request.get_json(silent=True)
        except Exception:
            body = None
        logger.info("Properties Blueprint request: %s %s tenant=%s args=%s body=%s", 
                   request.method, request.path, tenant, dict(request.args), body)
    except Exception:
        # nunca deixar logging atrapalhar a requisição
        pass

# Register all route modules  
create_property_routes(properties_bp)
create_upload_routes(properties_bp)
create_import_routes(properties_bp)
create_bulk_routes(properties_bp)
create_delete_routes(properties_bp)
create_dashboard_routes(properties_bp)

# Register health check blueprint
properties_bp.register_blueprint(health_bp)

# Register refresh endpoint blueprint
properties_bp.register_blueprint(refresh_endpoint_bp)

# NOTE: All routes have been moved to properties/routes/ modules:
# - Basic CRUD routes are in properties/routes/property_routes.py (registered via create_property_routes())
# - Upload routes are in properties/routes/upload_routes.py (registered via create_upload_routes())
# - Import routes are in properties/routes/import_routes.py (registered via create_import_routes())
# - Bulk routes are in properties/routes/bulk_routes.py (registered via create_bulk_routes())
# - Health check routes are in properties/routes/health_routes.py (registered via health_bp)


def init_monitoring(app):
    """Initialize monitoring for the properties module"""
    setup_monitoring(app)
