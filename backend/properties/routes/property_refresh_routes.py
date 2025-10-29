"""
Routes para gerenciamento de agendamentos automáticos de propriedades individuais
"""
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from extensions import db
from models import PropertyRefreshSchedule, PropertyRefreshHistory, Property
from utils.timezone_utils import utcnow
from utils.schedule_utils import calculate_next_run

logger = logging.getLogger(__name__)

property_refresh_bp = Blueprint('property_refresh', __name__, url_prefix='/api/refresh')


@property_refresh_bp.route('/schedules', methods=['GET'])
@jwt_required()
def list_property_schedules():
    """Lista todos os agendamentos de propriedades do tenant"""
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')

        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400

        # Buscar agendamentos com informações da propriedade
        schedules = db.session.query(PropertyRefreshSchedule, Property).join(
            Property, PropertyRefreshSchedule.property_id == Property.id
        ).filter(
            Property.tenant_id == tenant_id
        ).all()

        schedule_list = []
        for schedule, property_obj in schedules:
            schedule_data = schedule.to_dict()
            schedule_data['property'] = {
                'id': property_obj.id,
                'title': property_obj.title,
                'remote_id': property_obj.remote_id,
                'status': property_obj.status
            }
            schedule_list.append(schedule_data)

        return jsonify({
            'data': schedule_list,
            'total': len(schedule_list),
            'page': 1,
            'page_size': len(schedule_list)
        }), 200

    except Exception as e:
        logger.error("Error listing property refresh schedules: %s", str(e))
        return jsonify({'error': 'Failed to list property refresh schedules'}), 500


@property_refresh_bp.route('/schedules', methods=['POST'])
@jwt_required()
def create_property_schedule():
    """Cria um novo agendamento para uma propriedade"""
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')

        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400

        data = request.get_json()
        property_id = data.get('property_id')
        schedule_type = data.get('schedule_type', 'interval')  # interval, daily, weekly, monthly
        schedule_time = data.get('schedule_time')  # HH:MM para daily
        interval_minutes = data.get('interval_minutes', 60)  # para interval

        if not property_id:
            return jsonify({'error': 'property_id is required'}), 400

        # Verificar se a propriedade existe e pertence ao tenant
        property_obj = Property.query.filter_by(id=property_id, tenant_id=tenant_id).first()
        if not property_obj:
            return jsonify({'error': 'Property not found'}), 404

        # Verificar se já existe agendamento para esta propriedade
        existing = PropertyRefreshSchedule.query.filter_by(property_id=property_id).first()
        if existing:
            return jsonify({'error': 'Schedule already exists for this property'}), 409

        # Criar agendamento
        schedule = PropertyRefreshSchedule(
            property_id=property_id,
            tenant_id=tenant_id,
            enabled=data.get('enabled', True),
            schedule_type=schedule_type,
            schedule_time=schedule_time,
            interval_minutes=interval_minutes,
            schedule_days=data.get('schedule_days'),
            schedule_day_of_month=data.get('schedule_day_of_month'),
            max_retries=data.get('max_retries', 3)
        )

        # Calcular próxima execução
        schedule.next_run = calculate_next_run(schedule)

        db.session.add(schedule)
        db.session.commit()

        schedule_data = schedule.to_dict()
        schedule_data['property'] = {
            'id': property_obj.id,
            'title': property_obj.title,
            'remote_id': property_obj.remote_id,
            'status': property_obj.status
        }

        return jsonify({
            'message': 'Schedule created successfully',
            'data': schedule_data
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error("Error creating property refresh schedule: %s", str(e))
        return jsonify({'error': 'Failed to create property refresh schedule'}), 500


@property_refresh_bp.route('/schedules/<int:schedule_id>', methods=['PUT'])
@jwt_required()
def update_property_schedule(schedule_id):
    """Atualiza um agendamento de propriedade"""
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')

        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400

        # Buscar agendamento
        schedule = PropertyRefreshSchedule.query.filter_by(
            id=schedule_id, 
            tenant_id=tenant_id
        ).first()
        
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404

        data = request.get_json()

        # Atualizar campos
        if 'enabled' in data:
            schedule.enabled = data['enabled']
        if 'schedule_type' in data:
            schedule.schedule_type = data['schedule_type']
        if 'schedule_time' in data:
            schedule.schedule_time = data['schedule_time']
        if 'interval_minutes' in data:
            schedule.interval_minutes = data['interval_minutes']
        if 'schedule_days' in data:
            schedule.schedule_days = data['schedule_days']
        if 'schedule_day_of_month' in data:
            schedule.schedule_day_of_month = data['schedule_day_of_month']
        if 'max_retries' in data:
            schedule.max_retries = data['max_retries']

        # Recalcular próxima execução
        schedule.next_run = calculate_next_run(schedule)
        schedule.updated_at = utcnow()

        db.session.commit()

        return jsonify({
            'message': 'Schedule updated successfully',
            'data': schedule.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error("Error updating property refresh schedule: %s", str(e))
        return jsonify({'error': 'Failed to update property refresh schedule'}), 500


@property_refresh_bp.route('/schedules/<int:schedule_id>', methods=['DELETE'])
@jwt_required()
def delete_property_schedule(schedule_id):
    """Remove um agendamento de propriedade"""
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')

        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400

        # Buscar agendamento
        schedule = PropertyRefreshSchedule.query.filter_by(
            id=schedule_id, 
            tenant_id=tenant_id
        ).first()
        
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404

        db.session.delete(schedule)
        db.session.commit()

        return jsonify({'message': 'Schedule deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        logger.error("Error deleting property refresh schedule: %s", str(e))
        return jsonify({'error': 'Failed to delete property refresh schedule'}), 500


@property_refresh_bp.route('/schedules/<int:schedule_id>/toggle', methods=['POST'])
@jwt_required()
def toggle_property_schedule(schedule_id):
    """Habilita/desabilita um agendamento de propriedade"""
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')

        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400

        # Buscar agendamento
        schedule = PropertyRefreshSchedule.query.filter_by(
            id=schedule_id, 
            tenant_id=tenant_id
        ).first()
        
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404

        # Toggle enabled
        schedule.enabled = not schedule.enabled
        
        # Se habilitando, recalcular próxima execução
        if schedule.enabled:
            schedule.next_run = calculate_next_run(schedule)
        else:
            schedule.next_run = None
            
        schedule.updated_at = utcnow()

        db.session.commit()

        return jsonify({
            'message': f'Schedule {"enabled" if schedule.enabled else "disabled"} successfully',
            'data': schedule.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error("Error toggling property refresh schedule: %s", str(e))
        return jsonify({'error': 'Failed to toggle property refresh schedule'}), 500


@property_refresh_bp.route('/schedules/<int:schedule_id>/history', methods=['GET'])
@jwt_required()
def get_schedule_history(schedule_id):
    """Lista o histórico de execuções de um agendamento"""
    try:
        claims = get_jwt()
        tenant_id = claims.get('tenant_id')

        if not tenant_id:
            return jsonify({'error': 'No tenant ID found in token'}), 400

        # Verificar se o agendamento existe e pertence ao tenant
        schedule = PropertyRefreshSchedule.query.filter_by(
            id=schedule_id, 
            tenant_id=tenant_id
        ).first()
        
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404

        # Buscar histórico
        history = PropertyRefreshHistory.query.filter_by(
            schedule_id=schedule_id
        ).order_by(PropertyRefreshHistory.created_at.desc()).limit(50).all()

        history_list = [item.to_dict() for item in history]

        return jsonify({
            'data': history_list,
            'total': len(history_list)
        }), 200

    except Exception as e:
        logger.error("Error fetching schedule history: %s", str(e))
        return jsonify({'error': 'Failed to fetch schedule history'}), 500
