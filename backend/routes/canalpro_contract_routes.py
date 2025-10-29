"""
Rotas para configuração de contrato do CanalPro/Gandalf por tenant.
Permite definir número máximo de anúncios e limites de destaque por tipo.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt

from extensions import db
from models import CanalProContract, Property
from constants.publication_types import VALID_PUBLICATION_TYPES
from sqlalchemy import func

canalpro_contract_bp = Blueprint('canalpro_contract', __name__, url_prefix='/api/canalpro-contract')


def _current_tenant_id():
    claims = get_jwt()
    return claims.get('tenant_id', 1)


@canalpro_contract_bp.route('/config', methods=['GET'])
@jwt_required()
def get_contract_config():
    """Obtém a configuração de contrato do CanalPro para o tenant atual."""
    try:
        tenant_id = _current_tenant_id()
        contract = CanalProContract.query.filter_by(tenant_id=tenant_id, provider='gandalf').first()
        return jsonify({
            'success': True,
            'config': contract.to_dict() if contract else None
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@canalpro_contract_bp.route('/config', methods=['POST'])
@jwt_required()
def upsert_contract_config():
    """Cria ou atualiza a configuração do contrato CanalPro para o tenant atual."""
    try:
        tenant_id = _current_tenant_id()
        data = request.get_json() or {}

        contract_number = data.get('contract_number')
        max_listings = data.get('max_listings')
        highlight_limits = data.get('highlight_limits') or {}

        # Validações básicas
        if max_listings is not None:
            try:
                max_listings = int(max_listings)
            except (TypeError, ValueError):
                return jsonify({'success': False, 'error': 'max_listings deve ser um número inteiro'}), 400
            if max_listings < 0:
                return jsonify({'success': False, 'error': 'max_listings deve ser >= 0'}), 400

        if not isinstance(highlight_limits, dict):
            return jsonify({'success': False, 'error': 'highlight_limits deve ser um objeto {tipo: quantidade}'}), 400

        # Normalizar e validar chaves dos limites
        normalized_limits = {}
        for k, v in highlight_limits.items():
            if k is None:
                continue
            key = str(k).strip().upper()
            if key not in VALID_PUBLICATION_TYPES:
                return jsonify({'success': False, 'error': f'Tipo de publicação inválido: {key}'}), 400
            try:
                val = int(v)
            except (TypeError, ValueError):
                return jsonify({'success': False, 'error': f'Quantidade inválida para {key}: deve ser inteiro'}), 400
            if val < 0:
                return jsonify({'success': False, 'error': f'Quantidade inválida para {key}: deve ser >= 0'}), 400
            normalized_limits[key] = val

        # Upsert
        contract = CanalProContract.query.filter_by(tenant_id=tenant_id, provider='gandalf').first()
        if not contract:
            contract = CanalProContract(
                tenant_id=tenant_id,
                provider='gandalf'
            )
            db.session.add(contract)

        contract.contract_number = contract_number
        contract.max_listings = max_listings
        contract.highlight_limits = normalized_limits

        db.session.commit()

        return jsonify({'success': True, 'config': contract.to_dict(), 'message': 'Configuração salva com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@canalpro_contract_bp.route('/config', methods=['DELETE'])
@jwt_required()
def delete_contract_config():
    """Remove a configuração de contrato do tenant atual (se existir)."""
    try:
        tenant_id = _current_tenant_id()
        contract = CanalProContract.query.filter_by(tenant_id=tenant_id, provider='gandalf').first()
        if not contract:
            return jsonify({'success': True, 'message': 'Nenhuma configuração para remover', 'config': None}), 200
        db.session.delete(contract)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Configuração removida com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@canalpro_contract_bp.route('/kpis', methods=['GET'])
@jwt_required()
def get_contract_kpis():
    """KPIs de carteira relacionadas ao contrato CanalPro do tenant atual.

    Inclui:
    - total de imóveis
    - contagem por publication_type
    - imóveis com destaque (publication_type != STANDARD) vs sem destaque (STANDARD)
    - uso vs limites do contrato (highlight_limits e max_listings)
    """
    try:
        tenant_id = _current_tenant_id()

        # Total de imóveis
        total_properties = Property.query.filter_by(tenant_id=tenant_id).count()

        # Contagem por publication_type
        pub_counts: dict = {}
        pub_query = db.session.query(
            Property.publication_type,
            func.count(Property.id)
        ).filter(
            Property.tenant_id == tenant_id
        ).group_by(Property.publication_type).all()

        for pub_type, count in pub_query:
            key = (pub_type or 'STANDARD').upper()
            pub_counts[key] = count

        # Destaque vs sem destaque
        highlighted_count = sum(
            count for t, count in pub_counts.items() if t != 'STANDARD'
        )
        non_highlight_count = pub_counts.get('STANDARD', 0)

        # Configuração de contrato
        contract = CanalProContract.query.filter_by(tenant_id=tenant_id, provider='gandalf').first()
        max_listings = contract.max_listings if contract else None
        highlight_limits = contract.highlight_limits if contract else {}

        # Uso vs limites por tipo
        highlights_usage = {}
        for t in VALID_PUBLICATION_TYPES:
            used = pub_counts.get(t, 0)
            limit = None
            if isinstance(highlight_limits, dict):
                limit = highlight_limits.get(t)

            remaining = (limit - used) if (limit is not None) else None
            over_limit = (remaining is not None and remaining < 0)
            highlights_usage[t] = {
                'used': used,
                'limit': limit,
                'remaining': remaining,
                'over_limit': over_limit
            }

        # Uso vs limite total de anúncios
        total_usage = None
        if isinstance(max_listings, int):
            total_usage = {
                'used': total_properties,
                'limit': max_listings,
                'remaining': max_listings - total_properties,
                'over_limit': (max_listings - total_properties) < 0
            }

        return jsonify({
            'success': True,
            'tenant_id': tenant_id,
            'total_properties': total_properties,
            'publication_counts': pub_counts,
            'highlighted_count': highlighted_count,
            'non_highlight_count': non_highlight_count,
            'contract': {
                'max_listings': max_listings,
                'highlight_limits': highlight_limits
            },
            'usage': {
                'total': total_usage,
                'highlights_by_type': highlights_usage
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500