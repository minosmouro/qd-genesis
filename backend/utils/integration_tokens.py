import os
from datetime import datetime, timedelta
import requests
from extensions import db
from models import IntegrationCredentials
from utils.crypto import encrypt_token, decrypt_token
import logging
import pytz

# Debug toggle — set INTEGRATION_TOKEN_DEBUG=1 or 'true' to enable printing tokens (development only)
DEBUG_TOKENS = str(os.getenv('INTEGRATION_TOKEN_DEBUG', '')).lower() in ('1', 'true', 'yes')

# URL para refresh de tokens do CanalPro (usando a mesma API GraphQL)
TOKEN_REFRESH_URL = 'https://gandalf-api.grupozap.com/'  # URL base do Gandalf


def _post_token_refresh(refresh_token: str, meta: dict):
    """
    Tenta renovar o token usando a API GraphQL do Gandalf/CanalPro.
    
    Args:
        refresh_token: Token de refresh
        meta: Metadados com device_id e outras informações
    
    Returns:
        Dict com novos tokens ou None se falhar
    """
    logger = logging.getLogger('integration_tokens')
    
    # CORREÇÃO: CanalpPro suporta renovação automática via login completo
    # O sistema automático foi corrigido para usar email/senha em vez de refresh token
    provider = meta.get('provider', 'unknown')
    if provider == 'gandalf':
        logger.info('CanalpPro: Usando sistema de renovação automática corrigido')
        # Para CanalpPro, o sistema principal handle a renovação
        return None  # Permite que o sistema principal (token_renewal.py) gerencie
    
    # Verificar se temos device_id nos metadados para outros providers
    device_id = meta.get('device_id')
    if not device_id:
        logger.warning('No device_id in metadata - cannot refresh token')
        return None
    
    try:
        from integrations.gandalf_service import GandalfService, GandalfError
        
        service = GandalfService()
        result = service.refresh_access_token(refresh_token, device_id)
        
        if result and result.get('credentials'):
            logger.info('Token refresh successful via GandalfService')
            return result['credentials']
        else:
            logger.warning('No credentials returned from GandalfService refresh')
            return None
            
    except GandalfError as e:
        logger.warning(f'GandalfService refresh failed: {e}')
        return None
    except Exception as e:
        logger.error(f'Unexpected error during token refresh: {e}')
        return None


def get_valid_integration_headers(tenant_id: int, provider: str):
    creds = IntegrationCredentials.query.filter_by(tenant_id=tenant_id, provider=provider).first()
    if not creds:
        raise RuntimeError(f'Integration credentials not found for tenant {tenant_id} provider {provider}')

    meta = creds.metadata_json or {}

    # try decrypt token
    try:
        token = decrypt_token(creds.token_encrypted)
    except Exception as e:
        logging.getLogger('integration_tokens').error('Failed to decrypt token for tenant %s: %s', tenant_id, str(e))
        token = None

    now = datetime.now(pytz.utc)
    expires_at = creds.expires_at

    # if we have a token and it's not expiring within 60s, return headers
    if token and (not expires_at or expires_at > now + timedelta(seconds=60)):
        # Use the token as returned by provider (no automatic 'Bearer ' prefix)
        header = {'authorization': token}
        # add metadata-based headers
        for k in ('publisher_id', 'odin_id', 'contract_id', 'client_id', 'company', 'app_version', 'publisher_contract_type'):
            if k in meta and meta[k]:
                header[k] = meta[k]

        if DEBUG_TOKENS:
            # Log token in development only
            logging.getLogger('integration_tokens').debug('INTEGRATION TOKEN (existing) tenant=%s provider=%s token=%s', tenant_id, provider, token[-10:])

        return header

    # token missing or expired -> try refresh
    logging.getLogger('integration_tokens').debug('Token expired or missing for tenant %s, attempting refresh', tenant_id)

    if creds.refresh_token_encrypted:
        try:
            refresh_token = decrypt_token(creds.refresh_token_encrypted)
        except Exception as e:
            logging.getLogger('integration_tokens').error('Failed to decrypt refresh token for tenant %s: %s', tenant_id, str(e))
            refresh_token = None

        if refresh_token:
            resp = _post_token_refresh(refresh_token, meta)
            if resp and 'accessToken' in resp and resp['accessToken']:
                access = resp['accessToken']
                new_refresh = resp.get('refreshToken')
                expires_in = resp.get('expiresIn', 3600)  # default 1 hour

                # persist new tokens
                try:
                    creds.token_encrypted = encrypt_token(access)
                    if new_refresh:
                        creds.refresh_token_encrypted = encrypt_token(new_refresh)
                    creds.expires_at = datetime.now(pytz.utc) + timedelta(seconds=int(expires_in))
                    creds.last_validated_at = datetime.now(pytz.utc)
                    creds.last_validated_ok = True
                    db.session.commit()

                    logging.getLogger('integration_tokens').info('Token refreshed successfully for tenant %s', tenant_id)

                except Exception as e:
                    db.session.rollback()
                    logging.getLogger('integration_tokens').error('Failed to save refreshed token for tenant %s: %s', tenant_id, str(e))
                    raise RuntimeError(f'Failed to save refreshed token: {str(e)}')

                # Send the access token 'as-is' (no automatic 'Bearer ' prefix)
                header = {'authorization': access}
                for k in ('publisher_id', 'odin_id', 'contract_id', 'client_id', 'company', 'app_version', 'publisher_contract_type'):
                    if k in meta and meta[k]:
                        header[k] = meta[k]

                if DEBUG_TOKENS:
                    logging.getLogger('integration_tokens').debug('INTEGRATION TOKEN (refreshed) tenant=%s provider=%s token=%s', tenant_id, provider, access[-10:])

                return header
            else:
                logging.getLogger('integration_tokens').warning('Refresh token request failed for tenant %s - no valid response', tenant_id)
        else:
            logging.getLogger('integration_tokens').warning('No refresh token available for tenant %s', tenant_id)
    else:
        logging.getLogger('integration_tokens').warning('No refresh token stored for tenant %s', tenant_id)

    # nothing worked
    raise RuntimeError(f'No valid integration token available for tenant {tenant_id} - refresh failed')
