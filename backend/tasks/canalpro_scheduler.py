#!/usr/bin/env python3
"""
Sistema de agendamento para renovação automática de tokens CanalpPro.

Este módulo integra com o sistema Celery Beat existente para agendar
verificações e renovações automáticas dos tokens CanalpPro.

Funcionalidades:
- Agendamento dinâmico baseado na expiração dos tokens
- Integração com o sistema de credenciais seguras
- Monitoramento e logging de todas as operações
- Fallback para notificação em caso de falha
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from celery import current_app
from celery.schedules import crontab

logger = logging.getLogger(__name__)

class CanalpProScheduleManager:
    """Gerencia agendamento de renovações automáticas CanalpPro"""
    
    def __init__(self):
        """Inicializa o gerenciador de agendamento"""
        # Lazy imports para evitar circular imports
        from utils.secure_credential_storage import SecureCredentialStorage
        from extensions import db
        from models import IntegrationCredentials
        
        self.credential_storage = SecureCredentialStorage()
        self.db = db
        self.IntegrationCredentials = IntegrationCredentials
    
    def setup_canalpro_renewal_schedules(self, celery_app):
        """
        Configura agendamentos automáticos para renovação CanalpPro
        
        Args:
            celery_app: Instância do Celery
        """
        logger.info("Configurando agendamentos de renovação CanalpPro")
        
        # Task para verificar tokens CanalpPro que precisam renovação
        @celery_app.task(name='canalpro.check_renewal_needed', bind=True)
        def check_canalpro_renewal_needed(task_self):
            """Verifica se há tokens CanalpPro que precisam renovação automática"""
            from app import create_app
            app = create_app()
            
            with app.app_context():
                try:
                    # Usar a instância do manager, não da task
                    manager = canalpro_schedule_manager
                    return manager._check_and_schedule_renewals()
                except Exception as e:
                    logger.exception("Erro ao verificar renovações CanalpPro: %s", str(e))
                    # Tentar novamente em 30 minutos em caso de erro
                    raise task_self.retry(countdown=1800, max_retries=3)
        
        # Task para executar renovação automática específica
        @celery_app.task(name='canalpro.execute_auto_renewal', bind=True)
        def execute_canalpro_auto_renewal(task_self, tenant_id: int):
            """Executa renovação automática para um tenant específico"""
            from tasks.canalpro_auto_renewal_simple import simple_canalpro_renewal
            from app import create_app
            
            app = create_app()
            with app.app_context():
                try:
                    return simple_canalpro_renewal.execute_auto_renewal(tenant_id)
                except Exception as e:
                    logger.exception("Erro durante renovação automática CanalpPro para tenant %s: %s", 
                                   tenant_id, str(e))
                    # Tentar novamente em 1 hora
                    raise task_self.retry(countdown=3600, max_retries=2)
        
        # Configurar schedule padrão no beat_schedule
        if not hasattr(celery_app.conf, 'beat_schedule'):
            celery_app.conf.beat_schedule = {}
        
        # Verificação a cada 2 horas para tokens que precisam renovação
        celery_app.conf.beat_schedule['canalpro-renewal-check'] = {
            'task': 'canalpro.check_renewal_needed',
            'schedule': crontab(minute=0, hour='*/2'),  # A cada 2 horas
        }
        
        logger.info("Agendamento CanalpPro configurado: verificação a cada 2 horas")
    
    def _check_and_schedule_renewals(self) -> Dict[str, Any]:
        """
        Verifica tokens CanalpPro e agenda renovações necessárias
        
        Returns:
            Resultado da verificação
        """
        try:
            # Buscar todos os tenants com credenciais CanalpPro/Gandalf
            canalpro_creds = self.IntegrationCredentials.query.filter_by(
                provider='gandalf'
            ).all()
            
            scheduled_count = 0
            checked_count = 0
            automation_enabled_count = 0
            
            for cred in canalpro_creds:
                checked_count += 1
                tenant_id = cred.tenant_id
                
                try:
                    # Verificar se automação está habilitada
                    automation_status = self.credential_storage.get_automation_status(tenant_id)
                    
                    if not automation_status.get('enabled'):
                        logger.debug("Automação não habilitada para tenant %s: %s", 
                                   tenant_id, automation_status.get('reason'))
                        continue
                    
                    automation_enabled_count += 1
                    
                    # Verificar se token precisa renovação (< 24h para expirar)
                    needs_renewal = self._token_needs_renewal(cred)
                    
                    if needs_renewal:
                        logger.info("Agendando renovação automática para tenant %s", tenant_id)
                        
                        # Agendar renovação com delay baseado no tenant_id para distribuir carga
                        delay_seconds = (tenant_id % 300) + 60  # Entre 1-5 minutos
                        
                        # Importar localmente para evitar circular imports
                        from celery_app import celery
                        celery.send_task(
                            'canalpro.execute_auto_renewal',
                            args=[tenant_id],
                            countdown=delay_seconds
                        )
                        
                        scheduled_count += 1
                    
                except Exception as e:
                    logger.error("Erro ao verificar tenant %s: %s", tenant_id, str(e))
                    continue
            
            result = {
                'success': True,
                'checked_tenants': checked_count,
                'automation_enabled': automation_enabled_count,
                'scheduled_renewals': scheduled_count,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            if scheduled_count > 0:
                logger.info("Renovações CanalpPro agendadas: %s de %s tenants verificados", 
                          scheduled_count, checked_count)
            
            return result
            
        except Exception as e:
            logger.exception("Erro durante verificação de renovações CanalpPro: %s", str(e))
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def _token_needs_renewal(self, credential) -> bool:
        """
        Verifica se um token específico precisa renovação
        
        Args:
            credential: Credencial a verificar
            
        Returns:
            True se precisa renovação
        """
        try:
            metadata = credential.metadata_json or {}
            expires_at_str = metadata.get('expires_at')
            
            if not expires_at_str:
                # Sem data de expiração, melhor renovar
                logger.debug("Token sem data de expiração para tenant %s", credential.tenant_id)
                return True
            
            # Parse da data de expiração
            expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
            now = datetime.utcnow()
            
            # Renovar se expira em menos de 24 horas
            time_until_expiry = expires_at - now
            should_renew = time_until_expiry < timedelta(hours=24)
            
            if should_renew:
                logger.debug("Token para tenant %s expira em %s, renovação necessária", 
                           credential.tenant_id, str(time_until_expiry))
            
            return should_renew
            
        except Exception as e:
            logger.warning("Erro ao verificar expiração para tenant %s: %s, assumindo renovação necessária", 
                         credential.tenant_id, str(e))
            return True
    
    def schedule_immediate_renewal(self, tenant_id: int) -> Dict[str, Any]:
        """
        Agenda renovação imediata para um tenant específico
        
        Args:
            tenant_id: ID do tenant
            
        Returns:
            Resultado do agendamento
        """
        try:
            logger.info("Agendando renovação imediata para tenant %s", tenant_id)
            
            # Verificar se automação está habilitada
            automation_status = self.credential_storage.get_automation_status(tenant_id)
            
            if not automation_status.get('enabled'):
                return {
                    'success': False,
                    'reason': 'automation_not_enabled',
                    'details': automation_status
                }
            
            # Agendar com delay mínimo
            from celery_app import celery
            task = celery.send_task(
                'canalpro.execute_auto_renewal',
                args=[tenant_id],
                countdown=5  # 5 segundos
            )
            
            return {
                'success': True,
                'task_id': task.id,
                'scheduled_for': (datetime.utcnow() + timedelta(seconds=5)).isoformat()
            }
            
        except Exception as e:
            logger.exception("Erro ao agendar renovação imediata para tenant %s: %s", tenant_id, str(e))
            return {
                'success': False,
                'reason': 'scheduling_error',
                'error': str(e)
            }
    
    def get_renewal_schedule_status(self, tenant_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Obtém status dos agendamentos de renovação
        
        Args:
            tenant_id: ID específico do tenant (opcional)
            
        Returns:
            Status dos agendamentos
        """
        try:
            if tenant_id:
                # Status específico de um tenant
                automation_status = self.credential_storage.get_automation_status(tenant_id)
                
                cred = self.IntegrationCredentials.query.filter_by(
                    tenant_id=tenant_id,
                    provider='gandalf'
                ).first()
                
                token_info = {}
                if cred:
                    metadata = cred.metadata_json or {}
                    expires_at_str = metadata.get('expires_at')
                    
                    if expires_at_str:
                        expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
                        time_until_expiry = expires_at - datetime.utcnow()
                        
                        token_info = {
                            'expires_at': expires_at.isoformat(),
                            'time_until_expiry_hours': time_until_expiry.total_seconds() / 3600,
                            'needs_renewal': time_until_expiry < timedelta(hours=24)
                        }
                
                return {
                    'tenant_id': tenant_id,
                    'automation_status': automation_status,
                    'token_info': token_info
                }
            else:
                # Status geral do sistema
                total_tenants = self.IntegrationCredentials.query.filter_by(provider='gandalf').count()
                
                automation_enabled_count = 0
                for cred in self.IntegrationCredentials.query.filter_by(provider='gandalf').all():
                    status = self.credential_storage.get_automation_status(cred.tenant_id)
                    if status.get('enabled'):
                        automation_enabled_count += 1
                
                return {
                    'total_canalpro_tenants': total_tenants,
                    'automation_enabled_count': automation_enabled_count,
                    'next_check_schedule': 'Every 2 hours (crontab: 0 */2 * * *)',
                    'system_status': 'active'
                }
                
        except Exception as e:
            logger.exception("Erro ao obter status de agendamento: %s", str(e))
            return {
                'success': False,
                'error': str(e)
            }


# Instância global
canalpro_schedule_manager = CanalpProScheduleManager()


def setup_canalpro_renewal_system(celery_app):
    """
    Configura sistema completo de renovação CanalpPro
    
    Args:
        celery_app: Instância do Celery
    """
    logger.info("Configurando sistema de renovação automática CanalpPro")
    canalpro_schedule_manager.setup_canalpro_renewal_schedules(celery_app)
    logger.info("Sistema CanalpPro configurado com sucesso")
