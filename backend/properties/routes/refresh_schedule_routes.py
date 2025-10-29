"""
Routes para gerenciamento de listas de refresh automático
"""
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from extensions import db
from models import RefreshSchedule, RefreshScheduleProperty, Property
from ..services.refresh_schedule_service import RefreshScheduleService
from ..validators.refresh_schedule_validator import RefreshScheduleValidator
from ..monitoring import monitor_operation

logger = logging.getLogger(__name__)

refresh_schedule_bp = Blueprint('refresh_schedule', __name__, url_prefix='/api/refresh-schedules')


@refresh_schedule_bp.route('/', methods=['POST'])
@jwt_required()
@monitor_operation("create_refresh_schedule")
def create_schedule():
    """
    Cria uma nova lista de refresh schedule

    Body:
    {
        "name": "Lista 01",
        "time_slot": "09:30",
        "frequency_days": 1,
        "property_ids": [1, 2, 3]  // opcional
    }
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')

        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400

        data = request.get_json()

        # Validar entrada
        is_valid, error = RefreshScheduleValidator.validate_create_request(data)
        if not is_valid:
            return jsonify({'error': error}), 400

        # Criar schedule - property_ids agora é obrigatório
        success, result = RefreshScheduleService.create_schedule(
            tenant_id=tenant_id,
            name=data['name'],
            time_slot=data['time_slot'],
            frequency_days=data.get('frequency_days', 1),
            property_ids=data['property_ids'],  # Removido default vazio - agora obrigatório
            days_of_week=data.get('days_of_week', [1, 2, 3, 4, 5])
        )

        if success:
            return jsonify(result), 201
        return jsonify(result), 400

    except Exception as e:  # pylint: disable=broad-except
        logger.error("Error creating refresh schedule: %s", str(e))
        return jsonify({'error': 'Failed to create refresh schedule'}), 500


@refresh_schedule_bp.route('/', methods=['GET'])
@jwt_required()
@monitor_operation("list_refresh_schedules")
def list_schedules():
    """Lista todas as listas de refresh do tenant"""
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')

        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400

        schedules = RefreshScheduleService.list_schedules(tenant_id)
        return jsonify({
            'data': schedules,  # Frontend espera 'data' ao invés de 'schedules'
            'total': len(schedules),
            'page': 1,
            'page_size': len(schedules)
        }), 200

    except Exception as e:  # pylint: disable=broad-except
        logger.error("Error listing refresh schedules: %s", str(e))
        return jsonify({'error': 'Failed to list refresh schedules'}), 500


@refresh_schedule_bp.route('/<int:schedule_id>', methods=['GET'])
@jwt_required()
@monitor_operation("get_refresh_schedule_details")
def get_schedule_details(schedule_id):
    """Obtém detalhes completos de uma lista de refresh"""
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')

        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400

        details = RefreshScheduleService.get_schedule_details(schedule_id, tenant_id)

        if details:
            return jsonify(details), 200
        return jsonify({'error': 'Schedule not found'}), 404

    except Exception as e:  # pylint: disable=broad-except
        logger.error("Error getting schedule details: %s", str(e))
        return jsonify({'error': 'Failed to get schedule details'}), 500


@refresh_schedule_bp.route('/<int:schedule_id>', methods=['PUT', 'PATCH'])
@jwt_required()
@monitor_operation("update_refresh_schedule")
def update_schedule(schedule_id):
    """
    Atualiza uma lista de refresh

    Body:
    {
        "name": "Lista 01 Atualizada",  // opcional
        "time_slot": "10:30",           // opcional
        "frequency_days": 7,            // opcional
        "is_active": false              // opcional
    }
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')

        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400

        data = request.get_json()

        # Validar entrada
        is_valid, error = RefreshScheduleValidator.validate_update_request(data)
        if not is_valid:
            return jsonify({'error': error}), 400

        # Atualizar schedule
        success, result = RefreshScheduleService.update_schedule(
            schedule_id=schedule_id,
            tenant_id=tenant_id,
            name=data.get('name'),
            time_slot=data.get('time_slot'),
            frequency_days=data.get('frequency_days'),
            is_active=data.get('is_active'),
            days_of_week=data.get('days_of_week')
        )

        if success:
            return jsonify(result), 200
        return jsonify(result), 400

    except Exception as e:  # pylint: disable=broad-except
        logger.error("Error updating refresh schedule: %s", str(e))
        return jsonify({'error': 'Failed to update refresh schedule'}), 500


@refresh_schedule_bp.route('/<int:schedule_id>', methods=['DELETE'])
@jwt_required()
@monitor_operation("delete_refresh_schedule")
def delete_schedule(schedule_id):
    """Deleta uma lista de refresh"""
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')

        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400

        success, result = RefreshScheduleService.delete_schedule(schedule_id, tenant_id)

        if success:
            return jsonify(result), 200
        return jsonify(result), 400

    except Exception as e:  # pylint: disable=broad-except
        logger.error("Error deleting refresh schedule: %s", str(e))
        return jsonify({'error': 'Failed to delete refresh schedule'}), 500


@refresh_schedule_bp.route('/<int:schedule_id>/properties', methods=['POST'])
@jwt_required()
@monitor_operation("add_properties_to_schedule")
def add_properties(schedule_id):
    """
    Adiciona propriedades a uma lista

    Body:
    {
        "property_ids": [4, 5, 6]
    }
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')

        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400

        data = request.get_json()

        if not data or 'property_ids' not in data:
            return jsonify({'error': 'property_ids required'}), 400

        property_ids = data['property_ids']
        if not isinstance(property_ids, list) or not property_ids:
            return jsonify({'error': 'property_ids must be a non-empty list'}), 400

        success, result = RefreshScheduleService.add_properties_to_schedule(
            schedule_id, property_ids, tenant_id
        )

        if success:
            return jsonify(result), 200
        return jsonify(result), 400

    except Exception as e:  # pylint: disable=broad-except
        logger.error("Error adding properties to schedule: %s", str(e))
        return jsonify({'error': 'Failed to add properties to schedule'}), 500


@refresh_schedule_bp.route('/<int:schedule_id>/properties', methods=['DELETE'])
@jwt_required()
@monitor_operation("remove_properties_from_schedule")
def remove_properties(schedule_id):
    """
    Remove propriedades de uma lista

    Body:
    {
        "property_ids": [4, 5]
    }
    """
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')

        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400

        data = request.get_json()

        if not data or 'property_ids' not in data:
            return jsonify({'error': 'property_ids required'}), 400

        property_ids = data['property_ids']
        if not isinstance(property_ids, list) or not property_ids:
            return jsonify({'error': 'property_ids must be a non-empty list'}), 400

        success, result = RefreshScheduleService.remove_properties_from_schedule(
            schedule_id, property_ids, tenant_id
        )

        if success:
            return jsonify(result), 200
        return jsonify(result), 400

    except Exception as e:  # pylint: disable=broad-except
        logger.error("Error removing properties from schedule: %s", str(e))
        return jsonify({'error': 'Failed to remove properties from schedule'}), 500


@refresh_schedule_bp.route('/<int:schedule_id>/toggle', methods=['POST', 'PUT'])
@jwt_required()
@monitor_operation("toggle_refresh_schedule")
def toggle_schedule(schedule_id):
    """Ativa/desativa uma lista de refresh"""
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')

        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400

        # Primeiro, buscar estado atual
        details = RefreshScheduleService.get_schedule_details(schedule_id, tenant_id)
        if not details:
            return jsonify({'error': 'Schedule not found'}), 404

        # Inverter estado, ou respeitar valor enviado explicitamente
        data = request.get_json(silent=True) or {}
        if 'is_active' in data:
            new_state = bool(data.get('is_active'))
        else:
            new_state = not details['is_active']

        success, result = RefreshScheduleService.update_schedule(
            schedule_id=schedule_id,
            tenant_id=tenant_id,
            is_active=new_state
        )

        if success:
            result['message'] = (
                f'Schedule {"activated" if new_state else "deactivated"} successfully'
            )
            return jsonify(result), 200
        return jsonify(result), 400

    except Exception as e:  # pylint: disable=broad-except
        logger.error("Error toggling refresh schedule: %s", str(e))
        return jsonify({'error': 'Failed to toggle refresh schedule'}), 500


@refresh_schedule_bp.route('/available-properties', methods=['GET'])
@jwt_required()
@monitor_operation("get_available_properties")
def get_available_properties():
    """Lista propriedades disponíveis (sincronizadas) para adicionar aos cronogramas"""
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')

        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400

        # Buscar propriedades do tenant que possuem remote_id (exportadas)
        properties = Property.query.filter(
            Property.tenant_id == tenant_id,
            Property.remote_id.isnot(None),
            Property.remote_id != ''
        ).all()
        properties_data = []
        for prop in properties:
            # Buscar imagens da propriedade
            images = []
            if hasattr(prop, 'image_urls') and prop.image_urls:
                # Se image_urls é uma string JSON, fazer parse
                if isinstance(prop.image_urls, str):
                    try:
                        import json
                        images = json.loads(prop.image_urls) if prop.image_urls else []
                    except (json.JSONDecodeError, TypeError):
                        images = []
                elif isinstance(prop.image_urls, list):
                    images = prop.image_urls
            
            properties_data.append({
                'id': prop.id,
                'title': prop.title or f'Propriedade #{prop.id}',
                # Campos compatíveis com o frontend (ManualRefreshModal / PropertySelector)
                'address_street': getattr(prop, 'address_street', '') or '',
                'address_neighborhood': getattr(prop, 'address_neighborhood', '') or '',
                'address_city': getattr(prop, 'address_city', '') or '',
                'property_type': prop.property_type or 'Desconhecido',
                'property_code': prop.property_code or '',
                'external_id': prop.external_id or '',
                # Identificadores de exportação/integracao
                'remote_id': prop.remote_id or '',
                'canalpro_id': prop.remote_id or '',
                'status': prop.status,
                'created_at': prop.created_at.isoformat() if prop.created_at else None,
                # Campos adicionais para o enhanced property cards
                'price': getattr(prop, 'price', None) or getattr(prop, 'sale_price', None),
                'images': images[:1] if images else [],  # Apenas a primeira imagem para thumbnail
            })
        return jsonify(properties_data), 200

    except Exception as e:  # pylint: disable=broad-except
        logger.error("Error getting available properties: %s", str(e))
        return jsonify({'error': 'Failed to get available properties'}), 500


@refresh_schedule_bp.route('/pending-export-properties', methods=['GET'])
@jwt_required()
@monitor_operation("get_pending_export_properties")
def get_pending_export_properties():
    """Lista propriedades pendentes de exportação inicial (sem remote_id)"""
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')

        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400

        # Buscar propriedades do tenant que NÃO possuem remote_id (não exportadas)
        properties = Property.query.filter(
            Property.tenant_id == tenant_id,
            db.or_(
                Property.remote_id.is_(None),
                Property.remote_id == ''
            ),
            Property.status.in_(['ACTIVE', 'active', 'pending'])
        ).all()
        
        properties_data = []
        for prop in properties:
            # Buscar imagens da propriedade
            images = []
            if hasattr(prop, 'image_urls') and prop.image_urls:
                # Se image_urls é uma string JSON, fazer parse
                if isinstance(prop.image_urls, str):
                    try:
                        import json
                        images = json.loads(prop.image_urls) if prop.image_urls else []
                    except (json.JSONDecodeError, TypeError):
                        images = []
                elif isinstance(prop.image_urls, list):
                    images = prop.image_urls
            
            properties_data.append({
                'id': prop.id,
                'title': prop.title or f'Propriedade #{prop.id}',
                # Campos compatíveis com o frontend
                'address_street': getattr(prop, 'address_street', '') or '',
                'address_neighborhood': getattr(prop, 'address_neighborhood', '') or '',
                'address_city': getattr(prop, 'address_city', '') or '',
                'property_type': prop.property_type or 'Desconhecido',
                'property_code': prop.property_code or '',
                'external_id': prop.external_id or '',
                # Identificadores de exportação/integracao
                'remote_id': prop.remote_id or '',
                'canalpro_id': prop.remote_id or '',
                'status': prop.status,
                'created_at': prop.created_at.isoformat() if prop.created_at else None,
                # Campos adicionais
                'price': getattr(prop, 'price', None) or getattr(prop, 'sale_price', None),
                'images': images[:1] if images else [],  # Apenas a primeira imagem para thumbnail
            })
        
        logger.info(f"Found {len(properties_data)} properties pending export for tenant {tenant_id}")
        return jsonify(properties_data), 200

    except Exception as e:  # pylint: disable=broad-except
        logger.error("Error getting pending export properties: %s", str(e))
        return jsonify({'error': 'Failed to get pending export properties'}), 500


@refresh_schedule_bp.route('/<int:schedule_id>/properties', methods=['GET'])
@jwt_required()
@monitor_operation("get_schedule_properties")
def get_schedule_properties(schedule_id):
    """Lista as propriedades de um cronograma específico com paginação"""
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')

        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400

        # Verificar se o cronograma existe e pertence ao tenant
        schedule = RefreshSchedule.query.filter_by(
            id=schedule_id,
            tenant_id=tenant_id
        ).first()

        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404

        # Parâmetros de paginação
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)

        # Buscar propriedades do cronograma com paginação
        schedule_properties_query = db.session.query(
            RefreshScheduleProperty, Property
        ).join(
            Property, RefreshScheduleProperty.property_id == Property.id
        ).filter(
            RefreshScheduleProperty.refresh_schedule_id == schedule_id
        ).order_by(RefreshScheduleProperty.added_at.desc())

        # Aplicar paginação
        total = schedule_properties_query.count()
        schedule_properties = schedule_properties_query.offset(
            (page - 1) * per_page
        ).limit(per_page).all()

        # Formatar resultado
        properties_data = []
        for schedule_prop, property_obj in schedule_properties:
            properties_data.append({
                'property_id': property_obj.id,
                'added_at': schedule_prop.added_at.isoformat() if schedule_prop.added_at else None,
                'property': {
                    'id': property_obj.id,
                    'title': property_obj.title or f'Propriedade #{property_obj.id}',
                    'description': property_obj.description,
                    'property_code': property_obj.property_code,
                    'status': property_obj.status,
                    'property_type': property_obj.property_type,
                    'address_street': property_obj.address_street,
                    'address_neighborhood': property_obj.address_neighborhood,
                    'address_city': property_obj.address_city,
                    'created_at': property_obj.created_at.isoformat() if property_obj.created_at else None
                }
            })

        result = {
            'data': properties_data,
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (
                total + per_page - 1
            ) // per_page
        }

        return jsonify(result), 200

    except Exception as e:  # pylint: disable=broad-except
        logger.error("Error getting schedule properties: %s", str(e))
        return jsonify({'error': 'Failed to get schedule properties'}), 500
