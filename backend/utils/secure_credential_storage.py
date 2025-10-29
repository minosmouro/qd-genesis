#!/usr/bin/env python3
"""
Sistema de armazenamento seguro para credenciais de automação do CanalpPro.

Este módulo gerencia o armazenamento temporário e criptografado de credenciais
necessárias para a renovação automática de tokens do CanalpPro.

Funcionalidades:
- Armazenamento criptografado de email/senha
- TTL configurável para expiração automática
- Consentimento explícito do usuário
- Logging de segurança
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Any
from cryptography.fernet import Fernet
from sqlalchemy.orm.attributes import flag_modified

logger = logging.getLogger(__name__)

class SecureCredentialStorage:
    """Gerencia armazenamento seguro de credenciais para automação"""
    
    def __init__(self):
        # Lazy initialization - chave de criptografia será criada quando necessário
        self._encryption_key = None
        self._cipher = None
        
        # Lazy imports para evitar circular imports
        from flask import current_app
        from extensions import db
        from models import IntegrationCredentials
        
        self.db = db
        self.IntegrationCredentials = IntegrationCredentials
        self.current_app = current_app
    
    @property
    def encryption_key(self):
        """Lazy loading da chave de criptografia"""
        if self._encryption_key is None:
            self._encryption_key = self._get_or_create_encryption_key()
        return self._encryption_key
    
    @property  
    def cipher(self):
        """Lazy loading do cipher"""
        if self._cipher is None:
            from cryptography.fernet import Fernet
            self._cipher = Fernet(self.encryption_key)
        return self._cipher
        
    def _get_or_create_encryption_key(self) -> bytes:
        """Obtém ou cria chave de criptografia"""
        from flask import current_app
        
        key_file = os.path.join(current_app.instance_path, 'automation_key.key')
        
        if os.path.exists(key_file):
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            # Criar nova chave
            key = Fernet.generate_key()
            os.makedirs(os.path.dirname(key_file), exist_ok=True)
            with open(key_file, 'wb') as f:
                f.write(key)
            logger.info("Nova chave de criptografia criada para automação")
            return key
    
    def store_credentials_for_automation(
        self, 
        tenant_id: int, 
        email: str, 
        password: str,
        ttl_hours: int = 48,
        user_consent: bool = False
    ) -> Dict[str, Any]:
        """
        Armazena credenciais criptografadas para automação temporária
        
        Args:
            tenant_id: ID do tenant
            email: Email do usuário
            password: Senha do usuário
            ttl_hours: Tempo de vida das credenciais em horas
            user_consent: Confirmação de consentimento do usuário
            
        Returns:
            Status da operação
        """
        
        if not user_consent:
            raise ValueError("Consentimento do usuário é obrigatório")
        
        try:
            # Criptografar credenciais
            encrypted_email = self.cipher.encrypt(email.encode()).decode()
            encrypted_password = self.cipher.encrypt(password.encode()).decode()
            
            # Data de expiração
            expires_at = datetime.utcnow() + timedelta(hours=ttl_hours)
            
            # Buscar credencial existente
            cred = self.IntegrationCredentials.query.filter_by(
                tenant_id=tenant_id,
                provider='gandalf'
            ).first()
            
            if not cred:
                raise ValueError("Credencial base não encontrada")
            
            # Atualizar metadados com credenciais de automação
            metadata = cred.metadata_json or {}
            metadata.update({
                'automation_enabled': True,
                'automation_email_encrypted': encrypted_email,
                'automation_password_encrypted': encrypted_password,
                'automation_expires_at': expires_at.isoformat(),
                'automation_consent_timestamp': datetime.utcnow().isoformat(),
                'automation_ttl_hours': ttl_hours
            })
            
            cred.metadata_json = metadata
            flag_modified(cred, 'metadata_json')
            self.db.session.commit()
            
            logger.info("Credenciais de automação armazenadas para tenant %s (TTL: %sh)", tenant_id, ttl_hours)
            
            return {
                'success': True,
                'message': 'Credenciais armazenadas com sucesso',
                'expires_at': expires_at.isoformat(),
                'automation_enabled': True
            }
            
        except (ValueError, OSError) as e:
            logger.error("Erro ao armazenar credenciais: %s", str(e))
            self.db.session.rollback()
            raise
    
    def get_automation_credentials(self, tenant_id: int) -> Optional[Dict[str, str]]:
        """
        Recupera credenciais descriptografadas para automação
        
        Args:
            tenant_id: ID do tenant
            
        Returns:
            Credenciais descriptografadas ou None se expiradas/inexistentes
        """
        
        try:
            cred = self.IntegrationCredentials.query.filter_by(
                tenant_id=tenant_id,
                provider='gandalf'
            ).first()
            
            if not cred:
                return None
            
            metadata = cred.metadata_json or {}
            
            # Verificar se automação está habilitada
            if not metadata.get('automation_enabled'):
                return None
            
            # Verificar expiração
            expires_str = metadata.get('automation_expires_at')
            if expires_str:
                expires_at = datetime.fromisoformat(expires_str)
                if datetime.utcnow() > expires_at:
                    logger.info("Credenciais de automação expiradas para tenant %s", tenant_id)
                    self.disable_automation(tenant_id)
                    return None
            
            # Descriptografar credenciais
            encrypted_email = metadata.get('automation_email_encrypted')
            encrypted_password = metadata.get('automation_password_encrypted')
            device_id = metadata.get('device_id')
            
            if not all([encrypted_email, encrypted_password, device_id]):
                return None
            
            # Garantir que são strings antes de descriptografar
            if not isinstance(encrypted_email, str) or not isinstance(encrypted_password, str):
                return None
                
            email = self.cipher.decrypt(encrypted_email.encode()).decode()
            password = self.cipher.decrypt(encrypted_password.encode()).decode()
            
            return {
                'email': email,
                'password': password,
                'device_id': str(device_id)
            }
            
        except (ValueError, OSError) as e:
            logger.error("Erro ao recuperar credenciais de automação: %s", str(e))
            return None
    
    def disable_automation(self, tenant_id: int) -> bool:
        """
        Desabilita automação e remove credenciais armazenadas
        
        Args:
            tenant_id: ID do tenant
            
        Returns:
            True se desabilitado com sucesso
        """
        
        try:
            cred = self.IntegrationCredentials.query.filter_by(
                tenant_id=tenant_id,
                provider='gandalf'
            ).first()
            
            if not cred:
                return False
            
            metadata = cred.metadata_json or {}
            
            # Remover dados de automação
            automation_keys = [
                'automation_enabled',
                'automation_email_encrypted', 
                'automation_password_encrypted',
                'automation_expires_at',
                'automation_consent_timestamp',
                'automation_ttl_hours'
            ]
            
            for key in automation_keys:
                metadata.pop(key, None)
            
            cred.metadata_json = metadata
            flag_modified(cred, 'metadata_json')
            self.db.session.commit()
            
            logger.info("Automação desabilitada para tenant %s", tenant_id)
            return True
            
        except (ValueError, OSError) as e:
            logger.error("Erro ao desabilitar automação: %s", str(e))
            self.db.session.rollback()
            return False
    
    def get_automation_status(self, tenant_id: int) -> Dict[str, Any]:
        """
        Obtém status da automação para um tenant
        
        Args:
            tenant_id: ID do tenant
            
        Returns:
            Status detalhado da automação
        """
        
        try:
            cred = self.IntegrationCredentials.query.filter_by(
                tenant_id=tenant_id,
                provider='gandalf'
            ).first()
            
            if not cred:
                return {
                    'enabled': False,
                    'reason': 'credentials_not_found'
                }
            
            metadata = cred.metadata_json or {}
            
            if not metadata.get('automation_enabled'):
                return {
                    'enabled': False,
                    'reason': 'not_enabled'
                }
            
            # Verificar expiração
            expires_str = metadata.get('automation_expires_at')
            if expires_str:
                expires_at = datetime.fromisoformat(expires_str)
                now = datetime.utcnow()
                
                if now > expires_at:
                    return {
                        'enabled': False,
                        'reason': 'expired',
                        'expired_at': expires_str
                    }
                
                time_left = expires_at - now
                hours_left = time_left.total_seconds() / 3600
                
                return {
                    'enabled': True,
                    'expires_at': expires_str,
                    'hours_left': round(hours_left, 2),
                    'device_id_available': bool(metadata.get('device_id')),
                    'consent_timestamp': metadata.get('automation_consent_timestamp')
                }
            
            return {
                'enabled': True,
                'expires_at': None,
                'device_id_available': bool(metadata.get('device_id'))
            }
            
        except (ValueError, OSError) as e:
            logger.error("Erro ao obter status de automação: %s", str(e))
            return {
                'enabled': False,
                'reason': 'error',
                'error': str(e)
            }

# Instância global será criada quando necessário
secure_storage = None

def get_secure_storage():
    """Retorna instância singleton do SecureCredentialStorage"""
    global secure_storage
    if secure_storage is None:
        secure_storage = SecureCredentialStorage()
    return secure_storage
