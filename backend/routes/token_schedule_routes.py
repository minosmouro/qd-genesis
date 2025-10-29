"""
Rotas para configuração de agendamento de renovação de tokens
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
import logging
from datetime import datetime
import pytz

from extensions import db
from models import TokenScheduleConfig
from tasks.token_scheduler import (
    update_schedule_config,
    apply_schedule_config,
    calculate_next_execution
)

logger = logging.getLogger(__name__)

token_schedule_bp = Blueprint('token_schedule', __name__, url_prefix='/api/token-schedule')


def get_current_user_info():
    """Helper para obter informações do usuário atual"""
    claims = get_jwt()
    return {
        'user_id': claims.get('sub'),
        'tenant_id': claims.get('tenant_id', 1)
    }


@token_schedule_bp.route('/config', methods=['GET'])
@jwt_required()
def get_schedule_config():
    """
    Obter configuração de agendamento atual
    
    Returns:
        JSON com configuração ou null se não existir
    """
    try:
        user_info = get_current_user_info()
        tenant_id = user_info['tenant_id']
        
        # Buscar configuração
        config = TokenScheduleConfig.query.filter_by(
            tenant_id=tenant_id,
            provider='gandalf'
        ).first()
        
        if not config:
            return jsonify({
                'success': True,
                'config': None,
                'message': 'Nenhuma configuração encontrada'
            }), 200
        
        return jsonify({
            'success': True,
            'config': config.to_dict()
        }), 200
        
    except Exception as e:
        logger.exception(f"Erro ao buscar configuração: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@token_schedule_bp.route('/config', methods=['POST'])
@jwt_required()
def create_or_update_schedule_config():
    """
    Criar ou atualizar configuração de agendamento
    
    Body:
    {
        "schedule_mode": "manual_recurring",  // automatic, manual_once, manual_recurring
        "schedule_hour": "09",                // 00-23 (obrigatório para modos manuais)
        "schedule_minute": "00"               // 00, 15, 30, 45 (obrigatório para modos manuais)
    }
    
    Returns:
        JSON com configuração criada/atualizada
    """
    try:
        user_info = get_current_user_info()
        tenant_id = user_info['tenant_id']
        
        data = request.get_json()
        
        # Validar dados
        schedule_mode = data.get('schedule_mode', 'automatic')
        schedule_hour = data.get('schedule_hour')
        schedule_minute = data.get('schedule_minute')
        
        # Validar modo
        valid_modes = ['automatic', 'manual_once', 'manual_recurring']
        if schedule_mode not in valid_modes:
            return jsonify({
                'success': False,
                'error': f'Modo inválido. Use: {", ".join(valid_modes)}'
            }), 400
        
        # Validar horário para modos manuais
        if schedule_mode in ['manual_once', 'manual_recurring']:
            if not schedule_hour or not schedule_minute:
                return jsonify({
                    'success': False,
                    'error': 'Horário é obrigatório para modos manuais'
                }), 400
            
            # Validar formato
            try:
                hour = int(schedule_hour)
                minute = int(schedule_minute)
                
                if hour < 0 or hour > 23:
                    return jsonify({
                        'success': False,
                        'error': 'Hora deve estar entre 00 e 23'
                    }), 400
                
                if minute not in [0, 15, 30, 45]:
                    return jsonify({
                        'success': False,
                        'error': 'Minuto deve ser 00, 15, 30 ou 45'
                    }), 400
                
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Formato de horário inválido'
                }), 400
        
        # Atualizar configuração no banco
        config = update_schedule_config(
            tenant_id=tenant_id,
            provider='gandalf',
            schedule_mode=schedule_mode,
            schedule_hour=schedule_hour,
            schedule_minute=schedule_minute
        )
        
        # Aplicar agendamento ao Celery Beat
        apply_schedule_config(config)
        
        logger.info(f"✅ Configuração de agendamento salva: {config.to_dict()}")
        
        return jsonify({
            'success': True,
            'config': config.to_dict(),
            'message': 'Configuração salva com sucesso'
        }), 200
        
    except Exception as e:
        logger.exception(f"Erro ao salvar configuração: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@token_schedule_bp.route('/config', methods=['DELETE'])
@jwt_required()
def delete_schedule_config():
    """
    Desabilitar configuração de agendamento
    
    Returns:
        JSON confirmando desabilitação
    """
    try:
        user_info = get_current_user_info()
        tenant_id = user_info['tenant_id']
        
        # Buscar configuração
        config = TokenScheduleConfig.query.filter_by(
            tenant_id=tenant_id,
            provider='gandalf'
        ).first()
        
        if not config:
            return jsonify({
                'success': True,
                'message': 'Nenhuma configuração para desabilitar'
            }), 200
        
        # Desabilitar
        config.enabled = False
        config.next_execution = None
        db.session.commit()
        
        logger.info(f"✅ Configuração desabilitada para tenant {tenant_id}")
        
        return jsonify({
            'success': True,
            'message': 'Configuração desabilitada com sucesso'
        }), 200
        
    except Exception as e:
        logger.exception(f"Erro ao desabilitar configuração: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@token_schedule_bp.route('/preview', methods=['POST'])
@jwt_required()
def preview_next_execution():
    """
    Visualizar quando será a próxima execução sem salvar
    
    Body:
    {
        "schedule_mode": "manual_recurring",
        "schedule_hour": "09",
        "schedule_minute": "00"
    }
    
    Returns:
        JSON com próxima execução calculada
    """
    try:
        data = request.get_json()
        
        schedule_mode = data.get('schedule_mode', 'automatic')
        schedule_hour = data.get('schedule_hour', '09')
        schedule_minute = data.get('schedule_minute', '00')
        
        # Calcular próxima execução
        next_execution = calculate_next_execution(
            schedule_mode,
            schedule_hour,
            schedule_minute
        )
        
        # Calcular tempo até execução
        now = datetime.now(pytz.utc)
        time_until = next_execution - now
        hours_until = time_until.total_seconds() / 3600
        
        return jsonify({
            'success': True,
            'next_execution': next_execution.isoformat(),
            'hours_until': round(hours_until, 2),
            'description': get_execution_description(schedule_mode, schedule_hour, schedule_minute)
        }), 200
        
    except Exception as e:
        logger.exception(f"Erro ao calcular preview: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def get_execution_description(schedule_mode: str, schedule_hour: str, schedule_minute: str) -> str:
    """Gerar descrição legível do agendamento"""
    if schedule_mode == 'automatic':
        return 'Verificação automática a cada 15 minutos'
    elif schedule_mode == 'manual_once':
        return f'Execução única hoje às {schedule_hour}:{schedule_minute}'
    elif schedule_mode == 'manual_recurring':
        return f'Execução diária às {schedule_hour}:{schedule_minute}'
    else:
        return 'Modo desconhecido'


@token_schedule_bp.route('/execute-now', methods=['POST'])
@jwt_required()
def execute_now():
    """
    Executar renovação imediatamente (independente do agendamento)
    
    Returns:
        JSON confirmando execução
    """
    try:
        user_info = get_current_user_info()
        tenant_id = user_info['tenant_id']
        
        # Disparar task imediatamente
        from tasks.canalpro_auto_renewal_final import canalpro_auto_renewal_task
        
        result = canalpro_auto_renewal_task.apply_async()
        
        logger.info(f"✅ Renovação manual disparada para tenant {tenant_id}")
        
        return jsonify({
            'success': True,
            'message': 'Renovação iniciada',
            'task_id': result.id
        }), 200
        
    except Exception as e:
        logger.exception(f"Erro ao executar renovação manual: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
