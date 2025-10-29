"""
Sistema simplificado de renovação automática de tokens CanalPro
Baseado no script manual que já funciona
"""

import logging
import requests
from datetime import datetime, timedelta
import pytz
from celery import shared_task
from sqlalchemy import text

# Configure logger
logger = logging.getLogger(__name__)

class SimpleCanalpProRenewal:
    """Sistema simplificado de renovação de tokens CanalPro"""
    
    def __init__(self):
        self.canalpro_api_url = "https://api.canalpro.com.br/v1/"
        self.gandalf_api_url = "https://gandalf-api.canalpro.com.br/graphql"
        
    def execute_auto_renewal(self, tenant_id: int):
        """Executa renovação automática para um tenant específico"""
        from models import IntegrationCredentials
        from app import create_app
        from extensions import db
        from integrations.encryption_utils import decrypt_token, encrypt_token
        
        app = create_app()
        with app.app_context():
            try:
                # Get credentials for specific tenant
                cred = db.session.query(IntegrationCredentials).filter_by(
                    tenant_id=tenant_id,
                    provider='gandalf'  # CanalpPro usa provider 'gandalf'
                ).first()
                
                if not cred:
                    logger.warning("Credenciais não encontradas para tenant %s", tenant_id)
                    return {
                        'status': 'no_credentials',
                        'tenant_id': tenant_id,
                        'message': 'Credenciais não encontradas'
                    }
                
                logger.info("Executando renovação automática para tenant %s", tenant_id)
                
                result = self._renew_credential(cred, {
                    'db': db,
                    'decrypt_token': decrypt_token,
                    'encrypt_token': encrypt_token
                })
                
                result['tenant_id'] = tenant_id
                return result
                
            except Exception as e:
                logger.exception("Erro na renovação automática para tenant %s: %s", tenant_id, str(e))
                return {
                    'status': 'error',
                    'tenant_id': tenant_id,
                    'error': str(e)
                }

    def renew_all_credentials(self):
        """Renova todas as credenciais que precisam de renovação"""
        from models import IntegrationCredentials
        from app import create_app
        from extensions import db
        from integrations.encryption_utils import decrypt_token, encrypt_token
        
        app = create_app()
        with app.app_context():
            try:
                # Get all CanalPro credentials
                credentials = db.session.query(IntegrationCredentials).filter_by(
                    integration_type='canalpro'
                ).all()
                
                logger.info("Verificando %d credenciais CanalPro", len(credentials))
                
                results = []
                for cred in credentials:
                    try:
                        if self._needs_renewal(cred):
                            result = self._renew_credential(cred, {
                                'db': db,
                                'decrypt_token': decrypt_token,
                                'encrypt_token': encrypt_token
                            })
                            results.append(result)
                        else:
                            logger.info("Credencial %s ainda válida", cred.name)
                            results.append({
                                'credential_id': cred.id,
                                'name': cred.name,
                                'status': 'valid',
                                'message': 'Token ainda válido'
                            })
                    except Exception as e:
                        logger.error("Erro ao processar credencial %s: %s", cred.name, e)
                        results.append({
                            'credential_id': cred.id,
                            'name': cred.name,
                            'status': 'error',
                            'message': str(e)
                        })
                
                return results
                
            except Exception as e:
                logger.error("Erro geral na renovação: %s", e)
                return []
    
    def _needs_renewal(self, credential) -> bool:
        """Check if token needs renewal"""
        try:
            if not credential.expires_at:
                logger.warning("Token sem data de expiração, renovando por segurança")
                return True
            
            now = datetime.now(pytz.utc)
            time_until_expiry = credential.expires_at - now
            hours_until_expiry = time_until_expiry.total_seconds() / 3600
            
            logger.debug("Token %s expira em %.1f horas", credential.name, hours_until_expiry)
            
            # Renova se falta menos de 24h
            return hours_until_expiry < 24
            
        except Exception as e:
            logger.error("Erro ao verificar expiração: %s", e)
            return True  # Se não conseguir verificar, renova por segurança
    
    def _renew_credential(self, creds, deps):
        """Renova uma credencial específica"""
        try:
            logger.info("Iniciando renovação para %s", creds.name)
            
            # Decrypt credentials
            try:
                decrypted_email = deps['decrypt_token'](creds.settings.get('email', ''))
                decrypted_password = deps['decrypt_token'](creds.settings.get('password', ''))
            except Exception as e:
                logger.error("Erro ao descriptografar credenciais %s: %s", creds.name, e)
                return {
                    'credential_id': creds.id,
                    'name': creds.name,
                    'status': 'error',
                    'message': f'Erro na descriptografia: {str(e)}'
                }
            
            # Attempt login
            login_result = self._login_to_canalpro(decrypted_email, decrypted_password, creds)
            if not login_result:
                return {
                    'credential_id': creds.id,
                    'name': creds.name,
                    'status': 'error',
                    'message': 'Falha no login'
                }
            
            # Update credentials
            if self._update_credentials_with_new_token(creds, login_result, deps):
                logger.info("Token renovado com sucesso para %s", creds.name)
                return {
                    'credential_id': creds.id,
                    'name': creds.name,
                    'status': 'success',
                    'message': 'Token renovado com sucesso',
                    'expires_at': creds.expires_at.isoformat() if creds.expires_at else None
                }
            else:
                return {
                    'credential_id': creds.id,
                    'name': creds.name,
                    'status': 'error',
                    'message': 'Falha ao atualizar credenciais'
                }
                
        except Exception as e:
            logger.error("Erro durante renovação de %s: %s", creds.name, e)
            return {
                'credential_id': creds.id,
                'name': creds.name,
                'status': 'error',
                'message': str(e)
            }
    
    def _login_to_canalpro(self, email, password, creds):
        """Faz login no CanalPro"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'content-type': 'application/json',
                'x-app-version': 'v2.305.3',
                'Origin': 'https://canalpro.com.br',
                'DNT': '1',
                'Sec-GPC': '1',
                'Connection': 'keep-alive',
                'Referer': 'https://canalpro.com.br/',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
                'Priority': 'u=0'
            }
            
            # Get automation credentials from settings
            automation_settings = creds.settings.get('automation', {})
            device_id = automation_settings.get('device_id')
            
            if not device_id:
                logger.error("Device ID não encontrado para %s", creds.name)
                return None
            
            login_data = {
                "email": email,
                "password": password,
                "deviceId": device_id
            }
            
            logger.debug("Tentando login para %s com device %s", 
                        email.replace('@', '***@').replace('.com', '***'), 
                        device_id[:10] + '...')
            
            response = requests.post(
                f"{self.canalpro_api_url}login",
                json=login_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                credentials = response.json()
                
                if credentials.get('access_token'):
                    logger.info("Login bem-sucedido para %s", creds.name)
                    return {
                        'access_token': credentials['access_token'],
                        'refresh_token': credentials.get('refresh_token'),
                        'expires_in': credentials.get('expiresIn', 86400)
                    }
                else:
                    logger.error("Login sem token para %s", creds.name)
                    return None
            else:
                logger.error("Login falhou para %s: %d", creds.name, response.status_code)
                return None
                
        except Exception as e:
            logger.error("Erro durante login para %s: %s", creds.name, e)
            return None
    
    def _update_credentials_with_new_token(self, creds, login_result, deps):
        """Update credentials with new token"""
        try:
            # Encrypt new tokens
            encrypted_token = deps['encrypt_token'](login_result['access_token'])
            encrypted_refresh = deps['encrypt_token'](login_result['refresh_token']) if login_result.get('refresh_token') else None
            
            # Calculate expiration
            expires_at = datetime.now(pytz.utc) + timedelta(seconds=int(login_result['expires_in']))
            
            # Update main fields
            creds.access_token = encrypted_token
            creds.refresh_token = encrypted_refresh
            creds.expires_at = expires_at
            creds.updated_at = datetime.now(pytz.utc)
            
            # Update automation settings
            automation_settings = creds.settings.get('automation', {})
            automation_settings['last_renewal'] = datetime.now(pytz.utc).isoformat()
            automation_settings['renewal_method'] = 'simple_auto'
            
            # Update settings
            settings_copy = creds.settings.copy()
            settings_copy['automation'] = automation_settings
            creds.settings = settings_copy
            
            # ✅ CORREÇÃO: Atualizar metadados para manter consistência
            metadata = creds.metadata_json or {}
            metadata.update({
                'publisher_id': '119007',
                'odin_id': '49262cbf-1279-1804-c045-8f950d084c70', 
                'contract_id': '517f13eb-6730-4b6b-3c92-9e657428a0a0',
                'client_id': 'CANALPRO_WEB',
                'company': 'ZAP_OLX',
                'app_version': 'v2.305.3',  # ✅ Valor correto do HAR
                'publisher_contract_type': 'IMC',  # ✅ Valor correto do HAR
                'disabled_druid': 'true'  # ✅ Do HAR
            })
            creds.metadata_json = metadata
            
            # Commit changes
            deps['db'].session.commit()
            
            logger.info("Credenciais atualizadas para %s, expira em %s", 
                       creds.name, expires_at)
            
            return True
            
        except Exception as e:
            logger.error("Erro ao atualizar credenciais: %s", e)
            deps['db'].session.rollback()
            return False


# Global instance for task usage
simple_canalpro_renewal = SimpleCanalpProRenewal()

@shared_task(name='canalpro-auto-renewal-check')
def canalpro_auto_renewal_task():
    """Celery task para renovação automática"""
    try:
        logger.info("Iniciando verificação automática de tokens CanalPro")
        results = simple_canalpro_renewal.renew_all_credentials()
        
        success_count = sum(1 for r in results if r.get('status') == 'success')
        total_count = len(results)
        
        logger.info("Verificação concluída: %d/%d tokens processados com sucesso", 
                   success_count, total_count)
        
        return {
            'status': 'completed',
            'total_processed': total_count,
            'successful_renewals': success_count,
            'results': results
        }
        
    except Exception as e:
        logger.error("Erro na task de renovação automática: %s", e)
        return {
            'status': 'error',
            'error': str(e)
        }

@shared_task(name='canalpro-debug-check')
def canalpro_debug_task():
    """Task de debug para verificar sistema"""
    logger.debug("Task de debug executada")
    return {'status': 'debug_ok', 'timestamp': datetime.now(pytz.utc).isoformat()}
