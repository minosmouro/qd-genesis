"""
Bulk Routes - Rotas para operações em lote
"""
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required

from auth import tenant_required
from ..services.bulk_service import BulkService

def create_bulk_routes(bp: Blueprint):
    """Registra rotas de operações em lote"""

    @bp.route('/bulk/delete', methods=['OPTIONS'])
    def bulk_delete_options():
        """CORS preflight para bulk delete"""
        return '', 200

    # Alias legacy para compatibilidade com clientes antigos
    @bp.route('/bulk-delete', methods=['OPTIONS'])
    def bulk_delete_options_legacy():
        """CORS preflight para bulk delete (rota legada)"""
        return '', 200

    @bp.route('/bulk/delete', methods=['POST'])
    @jwt_required()
    @tenant_required
    def bulk_delete():
        """Deleta propriedades em lote de forma segura e inteligente"""
        data = request.get_json() or {}
        property_ids = data.get('ids') or data.get('property_ids') or []
        deletion_type = data.get('deletion_type')  # 'soft' | 'local' | 'canalpro' | 'both'
        reason = data.get('reason')
        notes = data.get('notes')
        confirmed = bool(data.get('confirmed', False))

        try:
            result = BulkService.bulk_delete(
                tenant_id=g.tenant_id,
                property_ids=property_ids,
                deletion_type=deletion_type,
                reason=reason,
                notes=notes,
                confirmed=confirmed,
            )
            return jsonify(result), 200
        except ValueError as e:
            return jsonify({'message': str(e)}), 400
        except Exception as e:
            return jsonify({'message': 'Bulk delete failed', 'error': str(e)}), 500

    # Alias legacy para compatibilidade com clientes antigos
    @bp.route('/bulk-delete', methods=['POST'])
    @jwt_required()
    @tenant_required
    def bulk_delete_legacy():
        """Alias para /bulk/delete garantindo compatibilidade com payload antigo"""
        data = request.get_json() or {}
        property_ids = data.get('ids') or data.get('property_ids') or []
        deletion_type = data.get('deletion_type')
        reason = data.get('reason')
        notes = data.get('notes')
        confirmed = bool(data.get('confirmed', False))

        try:
            result = BulkService.bulk_delete(
                tenant_id=g.tenant_id,
                property_ids=property_ids,
                deletion_type=deletion_type,
                reason=reason,
                notes=notes,
                confirmed=confirmed,
            )
            return jsonify(result), 200
        except ValueError as e:
            return jsonify({'message': str(e)}), 400
        except Exception as e:
            return jsonify({'message': 'Bulk delete failed', 'error': str(e)}), 500

    @bp.route('/bulk/update_publication_type', methods=['POST'])
    @jwt_required()
    @tenant_required
    def bulk_update_publication_type():
        """Atualiza o campo publication_type de várias propriedades"""
        data = request.get_json() or {}
        property_ids = data.get('ids') or data.get('property_ids') or []
        publication_type = data.get('publication_type')

        try:
            result = BulkService.bulk_update_publication_type(
                tenant_id=g.tenant_id,
                property_ids=property_ids,
                publication_type=publication_type
            )
            return jsonify(result), 200
        except ValueError as e:
            return jsonify({'message': str(e)}), 400
        except Exception as e:
            return jsonify({'message': 'Bulk update failed', 'error': str(e)}), 500
