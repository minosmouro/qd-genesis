import os
from cryptography.fernet import Fernet, InvalidToken

def get_fernet_key():
    """Obtém a chave Fernet da configuração ou variável de ambiente"""
    try:
        from flask import current_app
        return current_app.config.get('FERNET_KEY')
    except RuntimeError:
        # Fora do contexto da aplicação, usar variável de ambiente
        return os.environ.get('FERNET_KEY', 'l_wPDGmWk-xnK16_6Yf0-4m8Zxu5vkBCByMng4W0GqM=')

def get_fernet():
    """Obtém instância do Fernet com a chave atual"""
    key = get_fernet_key()
    if not key:
        raise RuntimeError('FERNET_KEY not set in config or environment')
    
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_token(token: str) -> str:
    return get_fernet().encrypt(token.encode()).decode()


def decrypt_token(token_encrypted: str) -> str:
    try:
        return get_fernet().decrypt(token_encrypted.encode()).decode()
    except InvalidToken:
        raise RuntimeError('Invalid token or wrong FERNET_KEY')
