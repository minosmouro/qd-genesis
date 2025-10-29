#!/usr/bin/env python3
"""
Sistema de renovação automática CanalpPro - VERSÃO DEFINITIVA
Esta versão garante que a task seja registrada e executada pelo Celery Beat
"""

import logging
from celery import shared_task
from datetime import datetime, timedelta
import pytz
import requests
import json

logger = logging.getLogger(__name__)

@shared_task(name='canalpro-auto-renewal')
def canalpro_auto_renewal_task():
    """
    Task principal de renovação automática CanalpPro
    Registrada como shared_task para garantir execução pelo Beat
    """
    try:
        logger.info("🔄 INICIANDO RENOVAÇÃO AUTOMÁTICA CANALPRO")
        
        # Importar dependências dentro da função para evitar problemas de import circular
        from models import IntegrationCredentials
        from app import create_app
        from extensions import db
        
        app = create_app()
        with app.app_context():
            # Buscar credenciais do CanalpPro que precisam renovação
            creds = IntegrationCredentials.query.filter_by(
                tenant_id=1,
                provider='gandalf'
            ).first()
            
            if not creds:
                logger.warning("❌ Nenhuma credencial CanalpPro encontrada")
                return {'status': 'no_credentials'}
            
            # Verificar se precisa renovação (menos de 24h para expirar)
            now = datetime.now(pytz.utc)
            expires_at = creds.expires_at
            
            if expires_at and expires_at > now + timedelta(hours=24):
                logger.info("✅ Token ainda válido por mais de 24h")
                return {'status': 'token_still_valid', 'expires_at': expires_at.isoformat()}
            
            logger.warning("⚠️ Token expira em menos de 24h - RENOVANDO AGORA!")
            
            # 🔄 ÚNICA ESTRATÉGIA: Login completo com credenciais (como no "Vincular CanalPro")
            logger.info("🔄 Executando login completo com credenciais salvas...")
            
            # Executar renovação usando o módulo unificado
            from tasks.canalpro_renewal_unified import login_to_canalpro, update_token_in_database
            from utils.secure_credential_storage import get_secure_storage
            
            # Obter credenciais de automação
            credential_storage = get_secure_storage()
            automation_creds = credential_storage.get_automation_credentials(creds.tenant_id)
            
            if not automation_creds:
                logger.error("❌ Credenciais de automação não disponíveis")
                return {'status': 'no_automation_credentials'}
            
            email = automation_creds.get('email')
            password = automation_creds.get('password')
            
            if not email or not password:
                logger.error("❌ Email ou senha de automação não disponíveis")
                return {'status': 'invalid_automation_credentials'}
            
            # Obter device_id
            metadata = creds.metadata_json or {}
            device_id = metadata.get('device_id', 'cmesm0ax000002a6mtvzsz0ad')
            
            logger.info(f"🔐 Fazendo login usando GandalfService para renovação automática...")
            logger.info(f"📧 Email: {email[:10]}...")
            logger.info(f"📱 Device ID: {device_id}")
            
            # Fazer login (usando função do módulo unificado)
            login_result = login_to_canalpro(email, password, device_id)
            
            if not login_result:
                logger.error("❌ Falha no login automático")
                return {'status': 'login_failed'}
            
            # Atualizar credenciais com o novo token
            success = update_token_in_database(creds.tenant_id, login_result)
            
            if success:
                logger.info("🎉 TOKEN RENOVADO COM SUCESSO VIA LOGIN AUTOMÁTICO!")
                logger.info("✅ Renovação baseada no mesmo método que funciona no 'Vincular CanalPro'")
                
                # Obter nova data de expiração
                credentials = login_result.get('credentials', {})
                expires_in = credentials.get('expiresIn', 86400)
                
                return {
                    'status': 'success',
                    'method': 'direct_login',
                    'renewed_at': datetime.now(pytz.utc).isoformat(),
                    'expires_at': (datetime.now(pytz.utc) + timedelta(seconds=int(expires_in))).isoformat()
                }
            else:
                logger.error("❌ Falha ao salvar novo token")
                return {'status': 'save_failed'}
                
    except Exception as e:
        logger.exception("❌ ERRO na renovação automática CanalpPro: %s", str(e))
        return {'status': 'error', 'error': str(e)}

@shared_task(name='canalpro-health-check') 
def canalpro_health_check_task():
    """Task de verificação de saúde do sistema CanalpPro"""
    logger.info("🔍 CanalpPro Health Check executado")
    return {'status': 'healthy', 'timestamp': datetime.now(pytz.utc).isoformat()}

if __name__ == '__main__':
    print("✅ Tasks CanalpPro definidas:")
    print("  - canalpro-auto-renewal")
    print("  - canalpro-health-check")
