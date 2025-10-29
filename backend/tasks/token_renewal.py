#!/usr/bin/env python3
"""
Sistema principal de renovação de tokens de integração (SEM CRIPTOGRAFIA)
"""

import logging
from celery import shared_task
from datetime import datetime, timedelta
import pytz

logger = logging.getLogger(__name__)

@shared_task(name='token_renewal.check_expiring_tokens')
def check_expiring_tokens():
    """
    Verifica tokens que estão expirando e agenda renovação
    """
    try:
        from models import IntegrationCredentials
        from app import create_app
        
        app = create_app()
        with app.app_context():
            now = datetime.now(pytz.utc)
            expiry_threshold = now + timedelta(hours=4)  # 4 horas antes de expirar
            
            # Buscar tokens que estão expirando
            expiring_tokens = IntegrationCredentials.query.filter(
                IntegrationCredentials.expires_at <= expiry_threshold,
                IntegrationCredentials.expires_at > now
            ).all()
            
            logger.info(f"Encontrados {len(expiring_tokens)} tokens expirando")
            
            results = []
            for token in expiring_tokens:
                # Agendar renovação específica para cada provider
                from celery_app import celery
                task_result = celery.send_task('token_renewal.renew_token', 
                                             args=[token.tenant_id, token.provider])
                results.append({
                    'tenant_id': token.tenant_id,
                    'provider': token.provider,
                    'task_id': task_result.id,
                    'expires_at': token.expires_at.isoformat()
                })
            
            return {
                'checked_at': now.isoformat(),
                'expiring_count': len(expiring_tokens),
                'scheduled_renewals': results
            }
            
    except Exception as e:
        logger.exception("Erro ao verificar tokens expirando")
        return {'error': str(e)}

@shared_task(name='token_renewal.renew_token')
def renew_token(tenant_id: int, provider: str):
    """
    Renova um token específico baseado no provider
    """
    try:
        logger.info(f"Iniciando renovação para tenant {tenant_id}, provider {provider}")
        
        if provider == 'gandalf':
            # Usar sistema específico do CanalpPro
            from fix_token_renewal import main as renew_canalpro_token
            from app import create_app
            
            app = create_app()
            with app.app_context():
                # Executar renovação CanalpPro
                result = renew_canalpro_token()
                return {
                    'tenant_id': tenant_id,
                    'provider': provider,
                    'status': 'success' if result else 'failed',
                    'renewed_at': datetime.now(pytz.utc).isoformat()
                }
        else:
            # Para outros providers no futuro
            logger.warning(f"Provider {provider} não implementado ainda")
            return {
                'tenant_id': tenant_id,
                'provider': provider,
                'status': 'not_implemented'
            }
            
    except Exception as e:
        logger.exception(f"Erro ao renovar token para tenant {tenant_id}, provider {provider}")
        return {
            'tenant_id': tenant_id,
            'provider': provider,
            'status': 'error',
            'error': str(e)
        }

@shared_task(name='token_renewal.cleanup_expired_tokens')
def cleanup_expired_tokens():
    """
    Remove tokens expirados há mais de 7 dias
    """
    try:
        from models import IntegrationCredentials, db
        from app import create_app
        
        app = create_app()
        with app.app_context():
            cutoff_date = datetime.now(pytz.utc) - timedelta(days=7)
            
            expired_count = IntegrationCredentials.query.filter(
                IntegrationCredentials.expires_at <= cutoff_date
            ).count()
            
            if expired_count > 0:
                IntegrationCredentials.query.filter(
                    IntegrationCredentials.expires_at <= cutoff_date
                ).delete()
                db.session.commit()
                
                logger.info(f"Removidos {expired_count} tokens expirados")
            
            return {
                'cleaned_at': datetime.now(pytz.utc).isoformat(),
                'removed_count': expired_count
            }
            
    except Exception as e:
        logger.exception("Erro ao limpar tokens expirados")
        return {'error': str(e)}