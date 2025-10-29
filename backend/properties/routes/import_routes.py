"""
Import Routes - Rotas para importação de propriedades
"""
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required

from auth import tenant_required
from ..services.import_service import ImportService
from ..validators.import_validator import ImportValidator

def create_import_routes(bp: Blueprint):
    """Registra rotas de importação no blueprint"""

    @bp.route('/import/gandalf', methods=['POST'])
    @jwt_required()
    @tenant_required
    def import_from_gandalf():
        """Importa todas as listagens do Gandalf"""
        options = request.get_json() or {}

        try:
            result = ImportService.import_all_from_gandalf(g.tenant_id, options)
            return jsonify(result), 200
        except ValueError as e:
            return jsonify({'message': str(e)}), 400
        except Exception as e:
            return jsonify({'message': 'Import failed', 'error': str(e)}), 500

    @bp.route('/import/payload', methods=['POST'])
    @jwt_required()
    @tenant_required
    def import_payload():
        """Importa um payload único de propriedade"""
        data = request.get_json() or {}
        dry_run = data.get('dry_run', False) or request.args.get('dry_run', '').lower() in ('1', 'true')

        try:
            result = ImportService.import_single_payload(g.tenant_id, data, dry_run)
            return jsonify(result), 200
        except ValueError as e:
            return jsonify({'message': str(e)}), 400
        except Exception as e:
            return jsonify({'message': 'Import failed', 'error': str(e)}), 500
