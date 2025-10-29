"""Session store para sessões de login do Gandalf usando Redis.

Comportamento: requer REDIS_URL em produção. Se REDIS_URL não estiver configurado
ou o cliente Redis não puder ser inicializado, usa um fallback em memória para desenvolvimento.
"""
import os
import json
import logging
from typing import Optional, Dict
import time

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv('REDIS_URL')
REDIS_TTL_DEFAULT = int(os.getenv('GANDALF_SESSION_TTL', '600'))  # seconds

# Fallback em memória para desenvolvimento
_memory_store = {}
_redis_client = None

if not REDIS_URL:
    logger.warning('REDIS_URL not configured: using memory fallback for development')
else:
    try:
        import redis
        _redis_client = redis.from_url(REDIS_URL)
        # sanity check
        _redis_client.ping()
        logger.debug('Redis client initialized successfully')
    except Exception as e:
        logger.warning(f'Could not initialize Redis client for REDIS_URL={REDIS_URL}: {e}. Using memory fallback.')
        _redis_client = None


def _now_ts() -> int:
    return int(time.time())


def save_session(session_id: str, cookies: Dict[str, str], ttl: int = REDIS_TTL_DEFAULT) -> None:
    payload = json.dumps(cookies)
    
    if _redis_client:
        _redis_client.setex(session_id, ttl, payload)
    else:
        # Memory fallback - store with expiration time
        _memory_store[session_id] = {
            'payload': payload,
            'expires_at': _now_ts() + ttl
        }


def load_session(session_id: str) -> Optional[Dict[str, str]]:
    if _redis_client:
        data = _redis_client.get(session_id)
        if not data:
            return None
        try:
            return json.loads(data)
        except Exception:
            logger.exception('Failed to parse session payload from Redis')
            return None
    else:
        # Memory fallback
        if session_id in _memory_store:
            entry = _memory_store[session_id]
            if _now_ts() <= entry['expires_at']:
                try:
                    return json.loads(entry['payload'])
                except Exception:
                    logger.exception('Failed to parse session payload from memory')
                    del _memory_store[session_id]
                    return None
            else:
                # Expired - remove from memory
                del _memory_store[session_id]
        return None


def delete_session(session_id: str) -> None:
    if _redis_client:
        try:
            _redis_client.delete(session_id)
        except Exception:
            logger.exception('Failed to delete session from Redis')
    else:
        # Memory fallback
        if session_id in _memory_store:
            del _memory_store[session_id]
