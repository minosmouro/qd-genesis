
"""
Rotas para a funcionalidade de Refresh Manual de imóveis.
"""
import logging
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt

from ..services.refresh_service import RefreshService

logger = logging.getLogger(__name__)

# Usaremos um prefixo de URL consistente com o resto do projeto
refresh_routes_bp = Blueprint('refresh_routes', __name__, url_prefix='/api/properties')

@refresh_routes_bp.route('/<int:property_id>/refresh', methods=['POST'])
@jwt_required()
def manual_refresh(property_id: int):
    """
    Endpoint para acionar o refresh manual de um imóvel.
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')
        if not tenant_id:
            return jsonify({'error': 'Tenant ID não encontrado no token'}), 400

        logger.info(f"Recebida requisição de refresh manual para o imóvel ID: {property_id} pelo tenant ID: {tenant_id}")

        success, result = RefreshService.refresh_property(property_id, tenant_id)

        if success:
            return jsonify(result), 200
        else:
            # O serviço já logou o erro, aqui apenas retornamos a resposta apropriada
            status_code = 404 if result.get("error") == "Imóvel não encontrado" else 400
            return jsonify(result), status_code

    except Exception as e:
        logger.error(f"Erro inesperado no endpoint de refresh para o imóvel {property_id}: {e}", exc_info=True)
        return jsonify({'error': 'Ocorreu um erro inesperado no servidor'}), 500
