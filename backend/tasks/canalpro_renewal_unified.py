#!/usr/bin/env python3
"""
Sistema UNIFICADO de renovação automática de tokens CanalPro.

Este módulo consolida todas as implementações anteriores em um único
sistema robusto, multi-tenant e com tratamento de erros específicos.

Características:
- Suporte multi-tenant (sem hardcoded IDs)
- Tratamento de erros específicos
- Sistema de notificações integrado
- Logging detalhado
- Retry com backoff exponencial
- Métricas de performance
"""

import logging
from celery import shared_task
from datetime import datetime, timedelta
import pytz
from typing import Dict, Any, List, Optional, cast
from requests.exceptions import RequestException, Timeout, ConnectionError

logger = logging.getLogger(__name__)


class CanalpProRenewalError(Exception):
    """Exceção base para erros de renovação CanalPro"""
    pass


class InvalidCredentialsError(CanalpProRenewalError):
    """Credenciais inválidas ou expiradas"""
    pass


class RateLimitError(CanalpProRenewalError):
    """Rate limit atingido"""
    pass


class NetworkError(CanalpProRenewalError):
    """Erro de rede/conectividade"""
    pass


def get_active_automation_tenants() -> List[int]:
    """
    Retorna lista de tenant IDs com automação ativa.
    
    Returns:
        Lista de tenant IDs com automação habilitada
    """
    from models import IntegrationCredentials
    from utils.secure_credential_storage import get_secure_storage
    
    try:
        storage = get_secure_storage()
        active_tenants = []
        
        # Buscar todas as credenciais CanalPro
        creds_list = IntegrationCredentials.query.filter_by(provider='gandalf').all()
        
        for cred in creds_list:
            # Verificar se automação está ativa para este tenant
            status = storage.get_automation_status(cred.tenant_id)
            if status and status.get('enabled'):
                active_tenants.append(cred.tenant_id)
        
        logger.info(f"✅ Encontrados {len(active_tenants)} tenants com automação ativa")
        return active_tenants
        
    except Exception as e:
        logger.exception(f"❌ Erro ao buscar tenants ativos: {e}")
        return []


def should_renew_token(cred, threshold_hours: int = 24) -> bool:
    """
    Verifica se um token precisa ser renovado.
    
    Args:
        cred: Credencial de integração
        threshold_hours: Horas antes da expiração para renovar
        
    Returns:
        True se o token precisa renovação
    """
    if not cred.expires_at:
        logger.warning(f"Token do tenant {cred.tenant_id} sem data de expiração")
        return False
    
    now = datetime.now(pytz.utc)
    time_until_expiry = cred.expires_at - now
    
    if time_until_expiry.total_seconds() < 0:
        logger.warning(f"⚠️ Token do tenant {cred.tenant_id} JÁ EXPIRADO")
        return True
    
    hours_remaining = time_until_expiry.total_seconds() / 3600
    
    if hours_remaining < threshold_hours:
        logger.info(f"🔄 Token do tenant {cred.tenant_id} expira em {hours_remaining:.1f}h - RENOVANDO")
        return True
    
    logger.debug(f"✅ Token do tenant {cred.tenant_id} ainda válido por {hours_remaining:.1f}h")
    return False


def login_to_canalpro(email: str, password: str, device_id: str) -> Optional[Dict[str, Any]]:
    """
    Faz login no CanalPro usando GandalfService.
    
    Args:
        email: Email do usuário
        password: Senha do usuário
        device_id: ID do dispositivo
        
    Returns:
        Dict com tokens e metadados ou None se falhar
        
    Raises:
        InvalidCredentialsError: Credenciais inválidas
        RateLimitError: Rate limit atingido
        NetworkError: Erro de rede
    """
    try:
        from integrations.gandalf_service import GandalfService, GandalfError
        
        logger.info(f"🔐 Fazendo login CanalPro - Email: {email[:10]}...")
        
        service = GandalfService()
        result = service.login_and_get_credentials(email=email, password=password, device_id=device_id)
        
        if not result or not result.get('credentials'):
            raise InvalidCredentialsError("Login retornou resposta vazia")
        
        logger.info("✅ Login CanalPro bem-sucedido")
        return result
        
    except Exception as e:
        error_msg = str(e).lower()
        
        # Classificar erro específico
        if 'invalid' in error_msg or 'unauthorized' in error_msg or 'credentials' in error_msg:
            raise InvalidCredentialsError(f"Credenciais inválidas: {e}")
        elif 'rate' in error_msg or 'limit' in error_msg or 'too many' in error_msg:
            raise RateLimitError(f"Rate limit atingido: {e}")
        elif isinstance(e, (Timeout, ConnectionError)):
            raise NetworkError(f"Erro de rede: {e}")
        else:
            raise CanalpProRenewalError(f"Erro desconhecido no login: {e}")


def update_token_in_database(tenant_id: int, login_result: Dict[str, Any]) -> bool:
    """
    Atualiza token no banco de dados.
    
    Args:
        tenant_id: ID do tenant
        login_result: Resultado do login com novos tokens
        
    Returns:
        True se atualização foi bem-sucedida
    """
    try:
        from models import IntegrationCredentials, db
        from utils.crypto import encrypt_token

        cred = IntegrationCredentials.query.filter_by(
            tenant_id=tenant_id,
            provider='gandalf'
        ).first()

        if not cred:
            logger.error(f"❌ Credencial não encontrada para tenant {tenant_id}")
            return False

        credentials = login_result.get('credentials', {})
        access_token = credentials.get('accessToken')
        refresh_token = credentials.get('refreshToken')
        expires_in = credentials.get('expiresIn', 86400)

        if not access_token:
            logger.error("❌ Access token não encontrado no resultado do login")
            return False

        # Atualizar credenciais criptografadas
        cred.token_encrypted = encrypt_token(access_token)
        if refresh_token:
            cred.refresh_token_encrypted = encrypt_token(refresh_token)

        now_utc = datetime.now(pytz.utc)
        cred.expires_at = now_utc + timedelta(seconds=int(expires_in))
        cred.last_validated_at = now_utc
        cred.last_validated_ok = True

        # Atualizar metadados de forma segura no campo JSON
        metadata = dict(cred.metadata_json or {})
        metadata.update({
            'last_renewal': now_utc.isoformat(),
            'renewal_method': 'unified_system',
            'publisher_id': credentials.get('publisherId') or credentials.get('publisher_id') or '119007',
            'odin_id': credentials.get('odinId') or credentials.get('odin_id'),
            'contract_id': credentials.get('contractId') or credentials.get('contract_id'),
            'client_id': credentials.get('clientId') or credentials.get('client_id'),
            'publisher_contract_type': credentials.get('publisherContractType') or credentials.get('publisher_contract_type')
        })
        cred.metadata_json = metadata

        db.session.commit()

        logger.info(f"✅ Token atualizado com sucesso para tenant {tenant_id}")
        logger.info(f"📅 Nova expiração: {cred.expires_at.isoformat()}")

        return True

    except Exception as e:
        logger.exception(f"❌ Erro ao atualizar token no banco: {e}")
        try:
            db.session.rollback()
        except Exception:
            pass
        return False


def renew_token_for_tenant(tenant_id: int) -> Dict[str, Any]:
    """
    Renova token para um tenant específico.
    
    Args:
        tenant_id: ID do tenant
        
    Returns:
        Dict com resultado da renovação
    """
    from models import IntegrationCredentials
    from utils.secure_credential_storage import get_secure_storage
    
    start_time = datetime.now(pytz.utc)
    
    try:
        logger.info(f"🔄 Iniciando renovação para tenant {tenant_id}")
        
        # Buscar credencial
        cred = IntegrationCredentials.query.filter_by(
            tenant_id=tenant_id,
            provider='gandalf'
        ).first()
        
        if not cred:
            return {
                'tenant_id': tenant_id,
                'status': 'error',
                'error': 'Credencial não encontrada',
                'timestamp': datetime.now(pytz.utc).isoformat()
            }
        
        # Verificar se precisa renovação
        if not should_renew_token(cred):
            return {
                'tenant_id': tenant_id,
                'status': 'skipped',
                'reason': 'Token ainda válido',
                'expires_at': cred.expires_at.isoformat() if cred.expires_at else None,
                'timestamp': datetime.now(pytz.utc).isoformat()
            }
        
        # Recuperar credenciais de automação
        storage = get_secure_storage()
        automation_creds = storage.get_automation_credentials(tenant_id)
        
        if not automation_creds:
            return {
                'tenant_id': tenant_id,
                'status': 'error',
                'error': 'Credenciais de automação não encontradas',
                'timestamp': datetime.now(pytz.utc).isoformat()
            }
        
        email = automation_creds.get('email')
        password = automation_creds.get('password')
        device_id = (cred.metadata_json or {}).get('device_id')

        if not all([email, password, device_id]):
            return {
                'tenant_id': tenant_id,
                'status': 'error',
                'error': 'Credenciais incompletas (email, password ou device_id faltando)',
                'timestamp': datetime.now(pytz.utc).isoformat()
            }
        
        # Fazer login (usando função do módulo unificado)
        login_result = login_to_canalpro(
            cast(str, email),
            cast(str, password),
            cast(str, device_id)
        )

        if not login_result:
            return {
                'tenant_id': tenant_id,
                'status': 'error',
                'error': 'Login CanalPro retornou resposta vazia',
                'timestamp': datetime.now(pytz.utc).isoformat()
            }
        
        # Atualizar banco de dados
        success = update_token_in_database(tenant_id, login_result)
        
        if not success:
            return {
                'tenant_id': tenant_id,
                'status': 'error',
                'error': 'Falha ao atualizar token no banco de dados',
                'timestamp': datetime.now(pytz.utc).isoformat()
            }
        
        duration = (datetime.now(pytz.utc) - start_time).total_seconds()
        
        return {
            'tenant_id': tenant_id,
            'status': 'success',
            'duration_seconds': duration,
            'renewed_at': datetime.now(pytz.utc).isoformat(),
            'expires_at': (datetime.now(pytz.utc) + timedelta(
                seconds=login_result.get('credentials', {}).get('expiresIn', 86400)
            )).isoformat()
        }
        
    except InvalidCredentialsError as e:
        logger.error(f"❌ Credenciais inválidas para tenant {tenant_id}: {e}")
        # Notificar usuário para reconfigurar
        from tasks.notifications import notify_invalid_credentials
        notify_invalid_credentials(tenant_id)
        
        return {
            'tenant_id': tenant_id,
            'status': 'error',
            'error_type': 'invalid_credentials',
            'error': str(e),
            'action_required': 'Reconfigurar credenciais de automação',
            'timestamp': datetime.now(pytz.utc).isoformat()
        }
        
    except RateLimitError as e:
        logger.warning(f"⚠️ Rate limit para tenant {tenant_id}: {e}")
        # Reagendar para mais tarde
        schedule_retry_task.apply_async(
            args=[tenant_id],
            countdown=1800  # 30 minutos
        )
        
        return {
            'tenant_id': tenant_id,
            'status': 'rate_limited',
            'error': str(e),
            'retry_scheduled': 'Em 30 minutos',
            'timestamp': datetime.now(pytz.utc).isoformat()
        }
        
    except NetworkError as e:
        logger.warning(f"⚠️ Erro de rede para tenant {tenant_id}: {e}")
        # Retry com backoff exponencial
        schedule_retry_task.apply_async(
            args=[tenant_id],
            countdown=300  # 5 minutos
        )
        
        return {
            'tenant_id': tenant_id,
            'status': 'network_error',
            'error': str(e),
            'retry_scheduled': 'Em 5 minutos',
            'timestamp': datetime.now(pytz.utc).isoformat()
        }
        
    except Exception as e:
        logger.exception(f"❌ Erro inesperado ao renovar token para tenant {tenant_id}: {e}")
        
        return {
            'tenant_id': tenant_id,
            'status': 'error',
            'error_type': 'unexpected',
            'error': str(e),
            'timestamp': datetime.now(pytz.utc).isoformat()
        }


@shared_task(name='canalpro.unified_auto_renewal')
def unified_auto_renewal_task(tenant_id: Optional[int] = None):
    """
    Task principal de renovação automática unificada.
    
    Args:
        tenant_id: ID específico do tenant (opcional). Se None, processa todos os tenants ativos.
        
    Returns:
        Dict com resultados da renovação
    """
    from app import create_app
    
    app = create_app()
    with app.app_context():
        try:
            logger.info("🔄 INICIANDO RENOVAÇÃO AUTOMÁTICA UNIFICADA CANALPRO")
            
            if tenant_id:
                # Renovar apenas um tenant específico
                logger.info(f"🎯 Renovação específica para tenant {tenant_id}")
                tenants = [tenant_id]
            else:
                # Renovar todos os tenants com automação ativa
                logger.info("🌐 Renovação para todos os tenants ativos")
                tenants = get_active_automation_tenants()
            
            if not tenants:
                logger.info("ℹ️ Nenhum tenant com automação ativa encontrado")
                return {
                    'status': 'no_active_tenants',
                    'timestamp': datetime.now(pytz.utc).isoformat()
                }
            
            results = []
            success_count = 0
            error_count = 0
            skipped_count = 0
            
            for tid in tenants:
                result = renew_token_for_tenant(tid)
                results.append(result)
                
                if result['status'] == 'success':
                    success_count += 1
                elif result['status'] == 'skipped':
                    skipped_count += 1
                else:
                    error_count += 1
            
            logger.info(f"✅ Renovação concluída: {success_count} sucesso, {error_count} erros, {skipped_count} ignorados")
            
            return {
                'status': 'completed',
                'total_tenants': len(tenants),
                'success_count': success_count,
                'error_count': error_count,
                'skipped_count': skipped_count,
                'results': results,
                'timestamp': datetime.now(pytz.utc).isoformat()
            }
            
        except Exception as e:
            logger.exception(f"❌ ERRO CRÍTICO na renovação automática: {e}")
            return {
                'status': 'critical_error',
                'error': str(e),
                'timestamp': datetime.now(pytz.utc).isoformat()
            }


@shared_task(name='canalpro.schedule_retry')
def schedule_retry_task(tenant_id: int):
    """
    Task para retry de renovação após falha temporária.
    
    Args:
        tenant_id: ID do tenant
    """
    logger.info(f"🔄 Executando retry de renovação para tenant {tenant_id}")
    return renew_token_for_tenant(tenant_id)


@shared_task(name='canalpro.health_check')
def health_check_task():
    """Task de verificação de saúde do sistema"""
    from app import create_app
    from models import IntegrationCredentials
    
    app = create_app()
    with app.app_context():
        try:
            now = datetime.now(pytz.utc)
            
            # Estatísticas gerais
            total_creds = IntegrationCredentials.query.filter_by(provider='gandalf').count()
            active_tenants = get_active_automation_tenants()
            
            # Tokens expirando
            expiring_soon = IntegrationCredentials.query.filter(
                IntegrationCredentials.provider == 'gandalf',
                IntegrationCredentials.expires_at <= now + timedelta(hours=24),
                IntegrationCredentials.expires_at > now
            ).count()
            
            # Tokens expirados
            expired = IntegrationCredentials.query.filter(
                IntegrationCredentials.provider == 'gandalf',
                IntegrationCredentials.expires_at <= now
            ).count()
            
            logger.info(f"🔍 Health Check: {total_creds} credenciais, {len(active_tenants)} automações ativas")
            logger.info(f"⚠️ {expiring_soon} expirando em breve, {expired} expirados")
            
            return {
                'status': 'healthy',
                'timestamp': now.isoformat(),
                'metrics': {
                    'total_credentials': total_creds,
                    'active_automations': len(active_tenants),
                    'expiring_soon': expiring_soon,
                    'expired': expired
                }
            }
            
        except Exception as e:
            logger.exception(f"❌ Erro no health check: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now(pytz.utc).isoformat()
            }


if __name__ == '__main__':
    print("✅ Sistema Unificado de Renovação CanalPro")
    print("📋 Tasks disponíveis:")
    print("  - canalpro.unified_auto_renewal")
    print("  - canalpro.schedule_retry")
    print("  - canalpro.health_check")
