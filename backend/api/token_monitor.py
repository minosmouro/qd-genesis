"""
Endpoints para monitoramento de tokens de integração.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import pytz

from models import IntegrationCredentials, db
from utils.integration_tokens import decrypt_token

token_monitor_bp = Blueprint('token_monitor', __name__, url_prefix='/api/tokens')


@token_monitor_bp.route('/status', methods=['GET'])
@jwt_required()
def get_tokens_status():
    """
    Retorna o status dos tokens de integração do tenant atual.
    """
    try:
        # CORREÇÃO CRÍTICA: Filtrar tokens apenas do tenant do usuário logado
        from flask_jwt_extended import get_jwt
        claims = get_jwt()
        tenant_id = claims.get('tenant_id', 1)
        
        # Buscar apenas tokens do tenant atual
        tokens = IntegrationCredentials.query.filter_by(tenant_id=tenant_id).all()
        
        status_list = []
        now = datetime.now(pytz.utc)
        
        for token in tokens:
            # Calcular tempo até expiração
            time_to_expiry = None
            expires_soon = False
            is_expired = False
            
            if token.expires_at:
                time_to_expiry = (token.expires_at - now).total_seconds()
                expires_soon = time_to_expiry <= 14400  # 4 horas
                is_expired = time_to_expiry <= 0
            
            # Verificar se tem refresh token
            has_refresh_token = bool(token.refresh_token_encrypted)
            
            # Verificar se o token atual é válido (pode descriptografar)
            token_valid = False
            try:
                if token.token_encrypted:
                    decrypt_token(token.token_encrypted)
                    token_valid = True
            except Exception:
                pass
            
            # CORREÇÃO: CanalpPro AGORA suporta renovação automática (problema corrigido)
            renewal_type = 'automatic'
            renewal_instructions = None
            if token.provider == 'gandalf':
                renewal_type = 'automatic'  # Sistema automático funcionando
                renewal_instructions = 'Renovação automática ativa. Sistema monitora e renova automaticamente.'
            
            status_list.append({
                'tenant_id': token.tenant_id,
                'provider': token.provider,
                'expires_at': token.expires_at.isoformat() if token.expires_at else None,
                'time_to_expiry_seconds': int(time_to_expiry) if time_to_expiry else None,
                'expires_soon': expires_soon,
                'is_expired': is_expired,
                'has_refresh_token': has_refresh_token,
                'token_valid': token_valid,
                'last_validated_at': token.last_validated_at.isoformat() if token.last_validated_at else None,
                'last_validated_ok': token.last_validated_ok,
                'metadata_keys': list(token.metadata_json.keys()) if token.metadata_json else [],
                'renewal_type': renewal_type,
                'renewal_instructions': renewal_instructions
            })
        
        # Estatísticas gerais
        total_tokens = len(status_list)
        expiring_soon = sum(1 for s in status_list if s['expires_soon'])
        expired = sum(1 for s in status_list if s['is_expired'])
        with_refresh = sum(1 for s in status_list if s['has_refresh_token'])
        
        return jsonify({
            'tokens': status_list,
            'summary': {
                'total_tokens': total_tokens,
                'expiring_soon': expiring_soon,
                'expired': expired,
                'with_refresh_token': with_refresh,
                'last_check': now.isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@token_monitor_bp.route('/force-renewal/<int:tenant_id>/<provider>', methods=['POST'])
@jwt_required()
def force_token_renewal(tenant_id, provider):
    """
    Força a renovação de um token específico (apenas para o próprio tenant).
    """
    try:
        # CORREÇÃO CRÍTICA: Verificar se o usuário pode renovar este token
        from flask_jwt_extended import get_jwt
        claims = get_jwt()
        current_tenant_id = claims.get('tenant_id', 1)
        
        # Usuário só pode renovar tokens do próprio tenant
        if tenant_id != current_tenant_id:
            return jsonify({'error': 'Acesso negado: você não pode renovar tokens de outro tenant'}), 403
        
        from celery_app import celery
        
        # Agendar renovação imediatamente
        task = celery.send_task('token_renewal.renew_token', args=[tenant_id, provider])
        
        return jsonify({
            'message': 'Renovação agendada',
            'task_id': task.id,
            'tenant_id': tenant_id,
            'provider': provider
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@token_monitor_bp.route('/health', methods=['GET'])
@jwt_required()
def tokens_health():
    """
    Verifica a saúde geral do sistema de tokens do tenant atual.
    """
    try:
        # CORREÇÃO CRÍTICA: Filtrar apenas do tenant do usuário logado
        from flask_jwt_extended import get_jwt
        claims = get_jwt()
        tenant_id = claims.get('tenant_id', 1)
        
        now = datetime.now(pytz.utc)
        
        # Tokens próximos do vencimento (próximas 4 horas) - APENAS DO TENANT ATUAL
        expiring_threshold = now + timedelta(hours=4)
        expiring_count = IntegrationCredentials.query.filter(
            IntegrationCredentials.tenant_id == tenant_id,
            IntegrationCredentials.expires_at <= expiring_threshold,
            IntegrationCredentials.expires_at > now
        ).count()
        
        # Tokens já expirados - APENAS DO TENANT ATUAL
        expired_count = IntegrationCredentials.query.filter(
            IntegrationCredentials.tenant_id == tenant_id,
            IntegrationCredentials.expires_at <= now
        ).count()
        
        # Tokens sem refresh token - APENAS DO TENANT ATUAL
        no_refresh_count = IntegrationCredentials.query.filter(
            IntegrationCredentials.tenant_id == tenant_id,
            IntegrationCredentials.refresh_token_encrypted.is_(None)
        ).count()
        
        # Tokens com última validação falhando - APENAS DO TENANT ATUAL
        validation_failed_count = IntegrationCredentials.query.filter(
            IntegrationCredentials.tenant_id == tenant_id,
            IntegrationCredentials.last_validated_ok == False
        ).count()
        
        # Determinar status geral
        health_status = 'healthy'
        issues = []
        
        if expired_count > 0:
            health_status = 'critical'
            issues.append(f'{expired_count} tokens expirados')
        
        if expiring_count > 0:
            if health_status == 'healthy':
                health_status = 'warning'
            issues.append(f'{expiring_count} tokens expirando em breve')
        
        if validation_failed_count > 0:
            if health_status == 'healthy':
                health_status = 'warning'
            issues.append(f'{validation_failed_count} tokens com validação falhando')
        
        if no_refresh_count > 0:
            if health_status == 'healthy':
                health_status = 'warning'
            issues.append(f'{no_refresh_count} tokens sem refresh token')
        
        return jsonify({
            'status': health_status,
            'timestamp': now.isoformat(),
            'metrics': {
                'expiring_soon': expiring_count,
                'expired': expired_count,
                'no_refresh_token': no_refresh_count,
                'validation_failed': validation_failed_count
            },
            'issues': issues
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now(pytz.utc).isoformat()
        }), 500


@token_monitor_bp.route('/force-check', methods=['POST'])
@jwt_required()
def force_expiry_check():
    """
    Força uma verificação imediata de tokens próximos do vencimento.
    """
    try:
        from celery_app import celery
        
        # Executar verificação imediatamente
        task = celery.send_task('token_renewal.check_expiring_tokens')
        
        return jsonify({
            'message': 'Verificação de expiração agendada',
            'task_id': task.id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@token_monitor_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """
    Retorna notificações de tokens para o tenant atual.
    """
    try:
        from flask_jwt_extended import get_jwt
        from tasks.notifications import notification_service
        
        claims = get_jwt()
        tenant_id = claims.get('tenant_id', 1)
        
        # Parâmetros de query
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        limit = int(request.args.get('limit', 50))
        
        notifications = notification_service.get_notifications_for_tenant(
            tenant_id=tenant_id,
            unread_only=unread_only,
            limit=limit
        )
        
        return jsonify({
            'notifications': notifications,
            'count': len(notifications)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@token_monitor_bp.route('/notifications/mark-read', methods=['POST'])
@jwt_required()
def mark_notifications_read():
    """
    Marca notificações como lidas.
    """
    try:
        from flask_jwt_extended import get_jwt
        from tasks.notifications import notification_service
        
        claims = get_jwt()
        tenant_id = claims.get('tenant_id', 1)
        
        data = request.get_json()
        notification_ids = data.get('notification_ids', [])
        
        if not notification_ids:
            return jsonify({'error': 'notification_ids é obrigatório'}), 400
        
        notification_service.mark_as_read(tenant_id, notification_ids)
        
        return jsonify({
            'message': 'Notificações marcadas como lidas',
            'count': len(notification_ids)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@token_monitor_bp.route('/force-renewal/<int:tenant_id>', methods=['POST'])
@jwt_required()
def force_renewal_for_tenant(tenant_id):
    """
    Força renovação imediata para um tenant específico (apenas para o próprio tenant).
    """
    try:
        # CORREÇÃO CRÍTICA: Verificar se o usuário pode renovar este tenant
        from flask_jwt_extended import get_jwt
        claims = get_jwt()
        current_tenant_id = claims.get('tenant_id', 1)
        
        # Usuário só pode renovar o próprio tenant
        if tenant_id != current_tenant_id:
            return jsonify({'error': 'Acesso negado: você não pode renovar tokens de outro tenant'}), 403
        
        from celery_app import celery
        
        # Executar renovação imediatamente para o tenant
        task = celery.send_task(
            'canalpro.unified_auto_renewal',
            args=[tenant_id]
        )
        
        return jsonify({
            'message': f'Renovação agendada para tenant {tenant_id}',
            'task_id': task.id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
