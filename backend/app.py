"""
Módulo principal do backend Gandalf.
Inicializa a aplicação Flask, registra blueprints e configurações globais.
"""

import os
from flask import Flask, jsonify
from dotenv import load_dotenv

# Configurar logging antes de importar outros módulos
from utils.logging_config import configure_logging
configure_logging()

from extensions import db, init_app
from auth import auth_bp, admin_bp
from properties import properties_bp
from mcp.api import mcp_bp
from integrations import integrations_bp
from empreendimentos import empreendimentos_bp, init_module
from properties.api.refresh_jobs_api import refresh_jobs_api
from refresh_api import refresh_api_bp
from properties.routes.refresh_routes import refresh_routes_bp
from properties.routes.refresh_schedule_routes import refresh_schedule_bp
from properties.routes.refresh_monitor_routes import refresh_monitor_bp
from properties.routes.property_refresh_routes import property_refresh_bp
from api_docs import init_api_docs
from api.token_monitor import token_monitor_bp
from api.canalpro_automation import canalpro_automation_bp
from routes.token_schedule_routes import token_schedule_bp
from routes.canalpro_contract_routes import canalpro_contract_bp
from routes.ai_description import register_ai_routes  # ✨ NOVO
from routes.users import users_bp  # ✨ NOVO: Sistema de usuários
from routes.tenants import tenants_bp  # ✨ NOVO: Sistema de tenants
from routes.admin_dashboard import admin_dashboard_bp  # ✨ NOVO: Dashboard administrativo
from routes.subscriptions import subscriptions_bp  # ✨ NOVO: Sistema de assinaturas e billing
from properties.routes.partnership_routes import create_partnership_routes  # 🤝 NOVO: Sistema de parcerias

# Load environment (prioriza .env e faz fallback para .env.dev em ambiente local)
_project_root = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
load_dotenv(dotenv_path=os.path.join(_project_root, '.env'))
load_dotenv(dotenv_path=os.path.join(_project_root, '.env.dev'))


def create_app():
    """Cria e configura a aplicação Flask."""
    import sys
    import os
    
    flask_app = Flask(__name__)
    
    # Carregar configurações do config.py
    try:
        flask_app.config.from_object('config')
    except ImportError:
        # Fallback para importação absoluta se não encontrar
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        flask_app.config.from_object('config')
    
    # Sobrescrever com variáveis de ambiente se existirem
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        flask_app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    
    secret_key = os.getenv("SECRET_KEY")
    if secret_key:
        flask_app.config["JWT_SECRET_KEY"] = secret_key
    
    # Configurar FERNET_KEY se não estiver no config
    if not flask_app.config.get('FERNET_KEY'):
        flask_app.config['FERNET_KEY'] = os.getenv('FERNET_KEY', 'l_wPDGmWk-xnK16_6Yf0-4m8Zxu5vkBCByMng4W0GqM=')
    
    flask_app.url_map.strict_slashes = False
    init_app(flask_app)
    
    # Registra blueprints
    flask_app.register_blueprint(auth_bp)
    flask_app.register_blueprint(admin_bp)
    flask_app.register_blueprint(properties_bp)
    flask_app.register_blueprint(mcp_bp)
    flask_app.register_blueprint(integrations_bp)
    init_module()
    flask_app.register_blueprint(empreendimentos_bp)
    flask_app.register_blueprint(refresh_jobs_api)
    flask_app.register_blueprint(refresh_api_bp)
    flask_app.register_blueprint(refresh_routes_bp)
    flask_app.register_blueprint(refresh_schedule_bp)
    flask_app.register_blueprint(refresh_monitor_bp)
    flask_app.register_blueprint(property_refresh_bp)
    flask_app.register_blueprint(token_monitor_bp)
    flask_app.register_blueprint(canalpro_automation_bp)
    flask_app.register_blueprint(token_schedule_bp)
    flask_app.register_blueprint(canalpro_contract_bp)
    flask_app.register_blueprint(users_bp)  # ✨ NOVO: Gestão de usuários
    flask_app.register_blueprint(tenants_bp)  # ✨ NOVO: Gestão de tenants
    flask_app.register_blueprint(admin_dashboard_bp)  # ✨ NOVO: Dashboard administrativo
    flask_app.register_blueprint(subscriptions_bp)  # ✨ NOVO: Sistema de assinaturas
    
    # 🤝 NOVO: Sistema de Parcerias
    from flask import Blueprint
    partnerships_bp = Blueprint('partnerships', __name__, url_prefix='/api')
    create_partnership_routes(partnerships_bp)
    flask_app.register_blueprint(partnerships_bp)
    
    register_ai_routes(flask_app)  # ✨ NOVO: Rotas de IA
    init_api_docs(flask_app)

    @flask_app.teardown_request
    def teardown_request(exception=None):
        """Ensure database connections are properly closed after each request."""
        try:
            db.session.remove()  # Close the session
        except Exception as e:
            flask_app.logger.warning(f"Error during session cleanup: {e}")

    @flask_app.route('/')
    def hello_world():
        return 'Hello, Gandalf Backend!'

    @flask_app.route('/health')
    def health_check():
        return jsonify({'status': 'ok'}), 200

    @flask_app.errorhandler(404)
    def handle_404(e):
        return jsonify({'error': 'Not found', 'message': str(e)}), 404

    @flask_app.errorhandler(405)
    def handle_405(e):
        return jsonify({'error': 'Method not allowed', 'message': str(e)}), 405

    @flask_app.errorhandler(Exception)
    def handle_exception(e):
        if str(e) == "Cannot modify objects from other tenants":
            return jsonify({'message': 'Forbidden: Cannot modify objects from other tenants'}), 403
        flask_app.logger.error('Unhandled exception: %s', str(e), exc_info=True)
        return jsonify({'message': str(e)}), 500

    return flask_app


if __name__ == '__main__':
    flask_app = create_app()
    with flask_app.app_context():
        db.create_all()
    flask_app.run(debug=os.getenv("FLASK_DEBUG") == "True", host='0.0.0.0', port=5000)



