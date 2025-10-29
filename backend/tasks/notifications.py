#!/usr/bin/env python3
"""
Sistema de notificações para eventos de tokens de integração.

Gerencia notificações para:
- Tokens expirando
- Falhas de renovação
- Credenciais inválidas
- Automação desabilitada
"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional
import pytz

logger = logging.getLogger(__name__)


class TokenNotificationService:
    """Serviço centralizado de notificações de tokens"""
    
    def __init__(self):
        """Inicializa o serviço de notificações"""
        self.notification_history = []
    
    def _create_notification(
        self,
        tenant_id: int,
        notification_type: str,
        title: str,
        message: str,
        severity: str = 'info',
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Cria uma notificação estruturada.
        
        Args:
            tenant_id: ID do tenant
            notification_type: Tipo da notificação
            title: Título da notificação
            message: Mensagem detalhada
            severity: Severidade (info, warning, error, critical)
            metadata: Metadados adicionais
            
        Returns:
            Dict com a notificação criada
        """
        notification = {
            'tenant_id': tenant_id,
            'type': notification_type,
            'title': title,
            'message': message,
            'severity': severity,
            'timestamp': datetime.now(pytz.utc).isoformat(),
            'metadata': metadata or {},
            'read': False
        }
        
        # Salvar no histórico (em memória por enquanto)
        self.notification_history.append(notification)
        
        # Log baseado na severidade
        log_message = f"[{notification_type.upper()}] Tenant {tenant_id}: {title} - {message}"
        
        if severity == 'critical':
            logger.critical(log_message)
        elif severity == 'error':
            logger.error(log_message)
        elif severity == 'warning':
            logger.warning(log_message)
        else:
            logger.info(log_message)
        
        # Salvar no banco de dados
        self._save_to_database(notification)
        
        return notification
    
    def _save_to_database(self, notification: Dict[str, Any]):
        """
        Salva notificação no banco de dados.
        
        Args:
            notification: Notificação a ser salva
        """
        try:
            from models import db, TokenNotification
            
            # Criar registro de notificação
            db_notification = TokenNotification(
                tenant_id=notification['tenant_id'],
                notification_type=notification['type'],
                title=notification['title'],
                message=notification['message'],
                severity=notification['severity'],
                meta_data=notification['metadata'],  # Usar meta_data (campo do banco)
                read=False,
                created_at=datetime.now(pytz.utc)
            )
            
            db.session.add(db_notification)
            db.session.commit()
            
            logger.debug(f"✅ Notificação salva no banco para tenant {notification['tenant_id']}")
            
        except Exception as e:
            # Se o modelo não existir ainda, apenas logar
            logger.debug(f"Notificação não salva no banco (modelo pode não existir): {e}")
            try:
                db.session.rollback()
            except:
                pass
    
    def notify_token_expiring_soon(
        self,
        tenant_id: int,
        hours_remaining: float,
        expires_at: str
    ) -> Dict[str, Any]:
        """
        Notifica que um token está expirando em breve.
        
        Args:
            tenant_id: ID do tenant
            hours_remaining: Horas restantes até expiração
            expires_at: Data/hora de expiração
            
        Returns:
            Notificação criada
        """
        return self._create_notification(
            tenant_id=tenant_id,
            notification_type='token_expiring',
            title='Token CanalPro Expirando',
            message=f'Seu token CanalPro expira em {hours_remaining:.1f} horas. '
                    f'A renovação automática será executada em breve.',
            severity='warning',
            metadata={
                'hours_remaining': hours_remaining,
                'expires_at': expires_at,
                'provider': 'gandalf'
            }
        )
    
    def notify_token_expired(
        self,
        tenant_id: int,
        expired_at: str
    ) -> Dict[str, Any]:
        """
        Notifica que um token expirou.
        
        Args:
            tenant_id: ID do tenant
            expired_at: Data/hora de expiração
            
        Returns:
            Notificação criada
        """
        return self._create_notification(
            tenant_id=tenant_id,
            notification_type='token_expired',
            title='Token CanalPro Expirado',
            message='Seu token CanalPro expirou. A renovação automática está em andamento. '
                    'Se o problema persistir, verifique suas credenciais de automação.',
            severity='error',
            metadata={
                'expired_at': expired_at,
                'provider': 'gandalf'
            }
        )
    
    def notify_renewal_success(
        self,
        tenant_id: int,
        new_expires_at: str,
        duration_seconds: float
    ) -> Dict[str, Any]:
        """
        Notifica renovação bem-sucedida.
        
        Args:
            tenant_id: ID do tenant
            new_expires_at: Nova data de expiração
            duration_seconds: Duração da renovação em segundos
            
        Returns:
            Notificação criada
        """
        return self._create_notification(
            tenant_id=tenant_id,
            notification_type='renewal_success',
            title='Token Renovado com Sucesso',
            message=f'Seu token CanalPro foi renovado automaticamente. '
                    f'Nova expiração: {new_expires_at}',
            severity='info',
            metadata={
                'new_expires_at': new_expires_at,
                'duration_seconds': duration_seconds,
                'provider': 'gandalf'
            }
        )
    
    def notify_renewal_failed(
        self,
        tenant_id: int,
        reason: str,
        error_type: str = 'unknown'
    ) -> Dict[str, Any]:
        """
        Notifica falha na renovação.
        
        Args:
            tenant_id: ID do tenant
            reason: Motivo da falha
            error_type: Tipo do erro
            
        Returns:
            Notificação criada
        """
        return self._create_notification(
            tenant_id=tenant_id,
            notification_type='renewal_failed',
            title='Falha na Renovação Automática',
            message=f'Não foi possível renovar seu token CanalPro automaticamente. '
                    f'Motivo: {reason}. Por favor, verifique suas credenciais.',
            severity='error',
            metadata={
                'reason': reason,
                'error_type': error_type,
                'provider': 'gandalf'
            }
        )
    
    def notify_invalid_credentials(
        self,
        tenant_id: int,
        action_required: str = 'Reconfigurar credenciais de automação'
    ) -> Dict[str, Any]:
        """
        Notifica que as credenciais de automação são inválidas.
        
        Args:
            tenant_id: ID do tenant
            action_required: Ação necessária
            
        Returns:
            Notificação criada
        """
        return self._create_notification(
            tenant_id=tenant_id,
            notification_type='invalid_credentials',
            title='Credenciais de Automação Inválidas',
            message='As credenciais configuradas para renovação automática estão inválidas ou expiraram. '
                    'Por favor, acesse as configurações e reconfigure a automação.',
            severity='critical',
            metadata={
                'action_required': action_required,
                'provider': 'gandalf'
            }
        )
    
    def notify_automation_disabled(
        self,
        tenant_id: int,
        reason: str
    ) -> Dict[str, Any]:
        """
        Notifica que a automação foi desabilitada.
        
        Args:
            tenant_id: ID do tenant
            reason: Motivo da desabilitação
            
        Returns:
            Notificação criada
        """
        return self._create_notification(
            tenant_id=tenant_id,
            notification_type='automation_disabled',
            title='Automação Desabilitada',
            message=f'A renovação automática de tokens foi desabilitada. Motivo: {reason}',
            severity='warning',
            metadata={
                'reason': reason,
                'provider': 'gandalf'
            }
        )
    
    def notify_rate_limit(
        self,
        tenant_id: int,
        retry_after_minutes: int = 30
    ) -> Dict[str, Any]:
        """
        Notifica que o rate limit foi atingido.
        
        Args:
            tenant_id: ID do tenant
            retry_after_minutes: Minutos até próxima tentativa
            
        Returns:
            Notificação criada
        """
        return self._create_notification(
            tenant_id=tenant_id,
            notification_type='rate_limit',
            title='Limite de Requisições Atingido',
            message=f'O limite de requisições à API CanalPro foi atingido. '
                    f'Nova tentativa em {retry_after_minutes} minutos.',
            severity='warning',
            metadata={
                'retry_after_minutes': retry_after_minutes,
                'provider': 'gandalf'
            }
        )
    
    def notify_network_error(
        self,
        tenant_id: int,
        retry_after_minutes: int = 5
    ) -> Dict[str, Any]:
        """
        Notifica erro de rede.
        
        Args:
            tenant_id: ID do tenant
            retry_after_minutes: Minutos até próxima tentativa
            
        Returns:
            Notificação criada
        """
        return self._create_notification(
            tenant_id=tenant_id,
            notification_type='network_error',
            title='Erro de Conectividade',
            message=f'Erro ao conectar com a API CanalPro. '
                    f'Nova tentativa em {retry_after_minutes} minutos.',
            severity='warning',
            metadata={
                'retry_after_minutes': retry_after_minutes,
                'provider': 'gandalf'
            }
        )
    
    def get_notifications_for_tenant(
        self,
        tenant_id: int,
        unread_only: bool = False,
        limit: int = 50
    ) -> list:
        """
        Obtém notificações de um tenant.
        
        Args:
            tenant_id: ID do tenant
            unread_only: Retornar apenas não lidas
            limit: Limite de notificações
            
        Returns:
            Lista de notificações
        """
        try:
            from models import TokenNotification
            
            query = TokenNotification.query.filter_by(tenant_id=tenant_id)
            
            if unread_only:
                query = query.filter_by(read=False)
            
            notifications = query.order_by(
                TokenNotification.created_at.desc()
            ).limit(limit).all()
            
            return [n.to_dict() for n in notifications]
            
        except Exception as e:
            logger.debug(f"Erro ao buscar notificações do banco: {e}")
            # Fallback para histórico em memória
            filtered = [
                n for n in self.notification_history
                if n['tenant_id'] == tenant_id
                and (not unread_only or not n['read'])
            ]
            return filtered[-limit:]
    
    def mark_as_read(self, tenant_id: int, notification_ids: list):
        """
        Marca notificações como lidas.
        
        Args:
            tenant_id: ID do tenant
            notification_ids: IDs das notificações
        """
        try:
            from models import TokenNotification, db
            
            TokenNotification.query.filter(
                TokenNotification.tenant_id == tenant_id,
                TokenNotification.id.in_(notification_ids)
            ).update({'read': True}, synchronize_session=False)
            
            db.session.commit()
            logger.debug(f"✅ {len(notification_ids)} notificações marcadas como lidas")
            
        except Exception as e:
            logger.debug(f"Erro ao marcar notificações como lidas: {e}")
            try:
                db.session.rollback()
            except:
                pass


# Instância global do serviço
notification_service = TokenNotificationService()


# Funções de conveniência para uso nas tasks
def notify_token_expiring_soon(tenant_id: int, hours_remaining: float, expires_at: str):
    """Wrapper para notificação de token expirando"""
    return notification_service.notify_token_expiring_soon(tenant_id, hours_remaining, expires_at)


def notify_token_expired(tenant_id: int, expired_at: str):
    """Wrapper para notificação de token expirado"""
    return notification_service.notify_token_expired(tenant_id, expired_at)


def notify_renewal_success(tenant_id: int, new_expires_at: str, duration_seconds: float):
    """Wrapper para notificação de renovação bem-sucedida"""
    return notification_service.notify_renewal_success(tenant_id, new_expires_at, duration_seconds)


def notify_renewal_failed(tenant_id: int, reason: str, error_type: str = 'unknown'):
    """Wrapper para notificação de falha na renovação"""
    return notification_service.notify_renewal_failed(tenant_id, reason, error_type)


def notify_invalid_credentials(tenant_id: int):
    """Wrapper para notificação de credenciais inválidas"""
    return notification_service.notify_invalid_credentials(tenant_id)


def notify_automation_disabled(tenant_id: int, reason: str):
    """Wrapper para notificação de automação desabilitada"""
    return notification_service.notify_automation_disabled(tenant_id, reason)


def notify_rate_limit(tenant_id: int, retry_after_minutes: int = 30):
    """Wrapper para notificação de rate limit"""
    return notification_service.notify_rate_limit(tenant_id, retry_after_minutes)


def notify_network_error(tenant_id: int, retry_after_minutes: int = 5):
    """Wrapper para notificação de erro de rede"""
    return notification_service.notify_network_error(tenant_id, retry_after_minutes)


if __name__ == '__main__':
    print("✅ Sistema de Notificações de Tokens")
    print("📋 Tipos de notificação disponíveis:")
    print("  - token_expiring: Token expirando em breve")
    print("  - token_expired: Token expirado")
    print("  - renewal_success: Renovação bem-sucedida")
    print("  - renewal_failed: Falha na renovação")
    print("  - invalid_credentials: Credenciais inválidas")
    print("  - automation_disabled: Automação desabilitada")
    print("  - rate_limit: Limite de requisições atingido")
    print("  - network_error: Erro de conectividade")
