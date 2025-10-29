#!/usr/bin/env python3
"""
API endpoints para sistema de automação CanalpPro.

Endpoints para configuração, monitoramento e controle da renovação 
automática de tokens CanalpPro.
"""

from flask import Blueprint, request, jsonify, g
import logging

from auth import tenant_required
from utils.secure_credential_storage import get_secure_storage
from tasks.canalpro_scheduler import canalpro_schedule_manager
from models import IntegrationCredentials

logger = logging.getLogger(__name__)

# Blueprint para automação CanalpPro
canalpro_automation_bp = Blueprint('canalpro_automation', __name__, url_prefix='/canalpro/automation')

@canalpro_automation_bp.route('/setup', methods=['POST'])
@tenant_required
def setup_automation():
    """
    Configura automação para renovação automática
    
    Body:
    {
        "email": "usuario@email.com",
        "password": "senha",
        "ttl_hours": 168,
        "consent": true
    }
    """
    try:
        data = request.get_json()
        
        # Validações
        required_fields = ['email', 'password', 'consent']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Campo obrigatório: {field}'
                }), 400
        
        if not data['consent']:
            return jsonify({
                'success': False,
                'error': 'Consentimento é obrigatório para habilitar automação'
            }), 400
        
        email = data['email']
        password = data['password']
        ttl_hours = data.get('ttl_hours', 168)  # 7 dias por padrão
        
        # Verificar se há credencial CanalpPro para o tenant
        tenant_id = g.tenant_id
        cred = IntegrationCredentials.query.filter_by(
            tenant_id=tenant_id,
            provider='gandalf'
        ).first()
        
        if not cred:
            return jsonify({
                'success': False,
                'error': 'Credencial CanalpPro não encontrada para este tenant'
            }), 404
        
        # Verificar se já tem device_id
        metadata = cred.metadata_json or {}
        if not metadata.get('device_id'):
            return jsonify({
                'success': False,
                'error': 'Device ID não disponível. É necessário fazer login manual no CanalpPro primeiro.'
            }), 400
        
        # Armazenar credenciais de forma segura
        credential_storage = get_secure_storage()
        result = credential_storage.store_credentials_for_automation(
            tenant_id=tenant_id,
            email=email,
            password=password,
            ttl_hours=ttl_hours,
            user_consent=True
        )
        
        logger.info("Automação configurada para tenant %s", tenant_id)
        
        # Salvar configuração de agendamento manual (se fornecida)
        schedule_mode = data.get('scheduleMode', 'automatic')
        schedule_hour = data.get('scheduleHour')
        schedule_minute = data.get('scheduleMinute')
        
        if schedule_mode in ['manual_once', 'manual_recurring'] and schedule_hour and schedule_minute:
            try:
                from tasks.token_scheduler import update_schedule_config
                
                # Salvar configuração de agendamento
                config = update_schedule_config(
                    tenant_id=tenant_id,
                    provider='gandalf',
                    schedule_mode=schedule_mode,
                    schedule_hour=schedule_hour,
                    schedule_minute=schedule_minute
                )
                
                # Não precisa aplicar ao Celery Beat manualmente
                # O Celery Beat já monitora a tabela automaticamente a cada 1 minuto
                
                logger.info(
                    "✅ Agendamento manual configurado: %s às %s:%s (próxima execução: %s)",
                    schedule_mode, schedule_hour, schedule_minute,
                    config.next_execution.isoformat() if config.next_execution else 'N/A'
                )
            except Exception as e:
                logger.exception("Erro ao configurar agendamento manual: %s", str(e))
                # Não falhar a requisição por causa disso
        
        return jsonify({
            'success': True,
            'message': 'Automação configurada com sucesso',
            'expires_at': result['expires_at'],
            'ttl_hours': ttl_hours
        })
        
    except Exception as e:
        logger.exception("Erro ao configurar automação: %s", str(e))
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

@canalpro_automation_bp.route('/status', methods=['GET'])
@tenant_required
def get_automation_status():
    """
    Obtém status atual da automação
    """
    try:
        tenant_id = g.tenant_id
        
        # Obter status detalhado
        credential_storage = get_secure_storage()
        status = credential_storage.get_automation_status(tenant_id)
        
        return jsonify(status)
        
    except Exception as e:
        logger.exception("Erro ao obter status de automação: %s", str(e))
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

@canalpro_automation_bp.route('/disable', methods=['POST'])
@tenant_required
def disable_automation():
    """
    Desabilita automação e remove credenciais armazenadas
    """
    try:
        tenant_id = g.tenant_id
        
        # Desabilitar automação
        credential_storage = get_secure_storage()
        success = credential_storage.disable_automation(tenant_id)
        
        if success:
            logger.info("Automação desabilitada para tenant %s", tenant_id)
            return jsonify({
                'success': True,
                'message': 'Automação desabilitada com sucesso'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Não foi possível desabilitar a automação'
            }), 400
            
    except Exception as e:
        logger.exception("Erro ao desabilitar automação: %s", str(e))
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

@canalpro_automation_bp.route('/trigger', methods=['POST'])
@tenant_required
def trigger_immediate_renewal():
    """
    Dispara renovação automática imediata
    """
    try:
        tenant_id = g.tenant_id
        
        # Verificar se automação está habilitada
        credential_storage = get_secure_storage()
        status = credential_storage.get_automation_status(tenant_id)
        if not status.get('enabled'):
            return jsonify({
                'success': False,
                'error': 'Automação não está habilitada',
                'reason': status.get('reason')
            }), 400
        
        # Agendar renovação imediata
        result = canalpro_schedule_manager.schedule_immediate_renewal(tenant_id)
        
        if result['success']:
            logger.info("Renovação imediata agendada para tenant %s", tenant_id)
            return jsonify({
                'success': True,
                'message': 'Renovação agendada para execução imediata',
                'task_id': result.get('task_id'),
                'scheduled_for': result.get('scheduled_for')
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('reason', 'Erro ao agendar renovação')
            }), 400
            
    except Exception as e:
        logger.exception("Erro ao disparar renovação imediata: %s", str(e))
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

@canalpro_automation_bp.route('/history', methods=['GET'])
@tenant_required  
def get_automation_history():
    """
    Obtém histórico de renovações automáticas
    """
    try:
        tenant_id = g.tenant_id
        
        # Por enquanto, retornar histórico simulado
        # Em implementação futura, isso seria obtido de um log/banco de dados
        history = []
        
        # Verificar se há logs recentes na credencial
        cred = IntegrationCredentials.query.filter_by(
            tenant_id=tenant_id,
            provider='gandalf'
        ).first()
        
        if cred and cred.metadata_json:
            metadata = cred.metadata_json
            last_renewal = metadata.get('last_auto_renewal')
            
            if last_renewal:
                history.append({
                    'timestamp': last_renewal,
                    'success': True,
                    'reason': 'Renovação automática bem-sucedida'
                })
        
        return jsonify({
            'success': True,
            'history': history
        })
        
    except Exception as e:
        logger.exception("Erro ao obter histórico: %s", str(e))
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor',
            'history': []
        }), 500

@canalpro_automation_bp.route('/schedule-status', methods=['GET'])
@tenant_required
def get_schedule_status():
    """
    Obtém status do agendamento de renovações
    """
    try:
        tenant_id = g.tenant_id
        
        # Obter status do agendamento para este tenant
        schedule_status = canalpro_schedule_manager.get_renewal_schedule_status(tenant_id)
        
        return jsonify({
            'success': True,
            'schedule_status': schedule_status
        })
        
    except Exception as e:
        logger.exception("Erro ao obter status de agendamento: %s", str(e))
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

@canalpro_automation_bp.route('/system-status', methods=['GET'])
@tenant_required
def get_system_status():
    """
    Obtém status geral do sistema de automação
    """
    try:
        # Status geral do sistema (para admins)
        system_status = canalpro_schedule_manager.get_renewal_schedule_status()
        
        return jsonify({
            'success': True,
            'system_status': system_status
        })
        
    except Exception as e:
        logger.exception("Erro ao obter status do sistema: %s", str(e))
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500
