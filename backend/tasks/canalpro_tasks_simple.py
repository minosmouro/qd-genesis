#!/usr/bin/env python3
"""
Tasks Celery simplificadas para renovação automática de tokens CanalpPro.
Sistema mais simples e robusto baseado no script manual que já funciona.
"""

from celery import current_app
from celery.utils.log import get_task_logger

# Logger específico para tasks Celery
logger = get_task_logger(__name__)

@current_app.task(bind=True, name='canalpro_auto_renewal_check')
def check_canalpro_renewal_needed(self, tenant_id=None):
    """
    Task Celery para verificar e executar renovação automática de tokens CanalpPro
    
    Args:
        tenant_id: ID do tenant específico ou None para todos
    """
    logger.info("Iniciando verificação de renovação automática de tokens CanalpPro")
    
    try:
        # Import lazy para evitar circular imports
        from tasks.canalpro_auto_renewal_simple_fixed import simple_canalpro_renewal
        
        # Se tenant_id específico foi fornecido
        if tenant_id:
            logger.info("Verificando renovação para tenant específico: %s", tenant_id)
            result = simple_canalpro_renewal.execute_auto_renewal(tenant_id)
            
            if result['success']:
                logger.info("Renovação bem-sucedida para tenant %s: %s", tenant_id, result.get('reason'))
            else:
                logger.warning("Renovação falhou para tenant %s: %s", tenant_id, result.get('reason'))
            
            return result
        
        # Caso contrário, verificar todos os tenants com automação ativa
        logger.info("Verificando renovação para todos os tenants com automação ativa")
        
        # Buscar todos os tenants com automação ativa
        from models import IntegrationCredentials
        active_credentials = IntegrationCredentials.query.filter_by(provider='gandalf').all()
        
        results = {}
        tenants_processed = 0
        
        for creds in active_credentials:
            tenant_id = creds.tenant_id
            logger.info("Processando tenant %s", tenant_id)
            
            result = simple_canalpro_renewal.execute_auto_renewal(tenant_id)
            results[tenant_id] = result
            tenants_processed += 1
            
            if result['success']:
                logger.info("✅ Tenant %s: %s", tenant_id, result.get('reason'))
            else:
                logger.warning("❌ Tenant %s: %s", tenant_id, result.get('reason'))
        
        summary = {
            'success': True,
            'tenants_processed': tenants_processed,
            'results': results,
            'timestamp': self.request.id
        }
        
        logger.info("Verificação completa: %s tenants processados", tenants_processed)
        return summary
        
    except Exception as e:
        error_msg = f"Erro durante verificação de renovação: {str(e)}"
        logger.exception(error_msg)
        
        return {
            'success': False,
            'error': error_msg,
            'tenant_id': tenant_id
        }

@current_app.task(bind=True, name='canalpro_force_renewal')
def force_canalpro_renewal(self, tenant_id):
    """
    Task para forçar renovação imediata de um tenant específico
    
    Args:
        tenant_id: ID do tenant para renovação forçada
    """
    logger.info("Forçando renovação para tenant %s", tenant_id)
    
    try:
        from tasks.canalpro_auto_renewal_simple_fixed import simple_canalpro_renewal
        
        result = simple_canalpro_renewal.execute_auto_renewal(tenant_id)
        
        if result['success']:
            logger.info("Renovação forçada bem-sucedida para tenant %s", tenant_id)
        else:
            logger.error("Renovação forçada falhou para tenant %s: %s", tenant_id, result.get('reason'))
        
        return result
        
    except Exception as e:
        error_msg = f"Erro durante renovação forçada: {str(e)}"
        logger.exception(error_msg)
        
        return {
            'success': False,
            'error': error_msg,
            'tenant_id': tenant_id
        }
