"""
Utilitários para manipulação de datas e horários com timezone
Padroniza o uso de UTC no backend e conversões para horário brasileiro
"""

import os
from datetime import datetime, timezone, timedelta
from typing import Optional, Union

# Timezone do Brasil (Brasília)
BRASILIA_TZ = timezone(timedelta(hours=-3))

# Timezone UTC
UTC_TZ = timezone.utc

def get_current_utc() -> datetime:
    """Retorna datetime atual em UTC com timezone info"""
    return datetime.now(UTC_TZ)

def get_current_brasilia() -> datetime:
    """Retorna datetime atual em horário de Brasília"""
    return datetime.now(BRASILIA_TZ)

def utc_to_brasilia(dt: datetime) -> datetime:
    """Converte datetime UTC para horário de Brasília"""
    if dt.tzinfo is None:
        # Assume que datetime sem timezone é UTC
        dt = dt.replace(tzinfo=UTC_TZ)
    return dt.astimezone(BRASILIA_TZ)

def brasilia_to_utc(dt: datetime) -> datetime:
    """Converte datetime de Brasília para UTC"""
    if dt.tzinfo is None:
        # Assume que datetime sem timezone é de Brasília
        dt = dt.replace(tzinfo=BRASILIA_TZ)
    return dt.astimezone(UTC_TZ)

def parse_datetime_with_tz(dt_str: str, tz: timezone = UTC_TZ) -> Optional[datetime]:
    """Parse string para datetime com timezone específico"""
    try:
        # Tenta diferentes formatos
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%dT%H:%M:%SZ',
            '%Y-%m-%dT%H:%M:%S.%fZ',
            '%Y-%m-%dT%H:%M:%S%z',
            '%Y-%m-%d %H:%M:%S%z'
        ]

        for fmt in formats:
            try:
                dt = datetime.strptime(dt_str, fmt)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=tz)
                return dt
            except ValueError:
                continue

        return None
    except Exception:
        return None

def format_datetime_for_db(dt: datetime) -> datetime:
    """Formata datetime para armazenamento no banco (sempre UTC)"""
    if dt.tzinfo is None:
        # Assume UTC se não tiver timezone
        dt = dt.replace(tzinfo=UTC_TZ)
    return dt.astimezone(UTC_TZ)

def format_datetime_for_display(dt: datetime, tz: timezone = BRASILIA_TZ) -> str:
    """Formata datetime para exibição no frontend"""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC_TZ)

    localized = dt.astimezone(tz)
    return localized.strftime('%d/%m/%Y %H:%M:%S')

def get_timezone_from_env() -> timezone:
    """Retorna timezone baseado na variável de ambiente TZ"""
    tz_name = os.getenv('TZ', 'UTC')

    if tz_name == 'America/Sao_Paulo':
        return BRASILIA_TZ
    elif tz_name == 'UTC':
        return UTC_TZ
    else:
        # Default para UTC
        return UTC_TZ

# Instância global da timezone atual
CURRENT_TZ = get_timezone_from_env()

def now() -> datetime:
    """Retorna datetime atual na timezone configurada"""
    return datetime.now(CURRENT_TZ)

def today() -> datetime:
    """Retorna início do dia atual na timezone configurada"""
    now_dt = now()
    return now_dt.replace(hour=0, minute=0, second=0, microsecond=0)

def tomorrow() -> datetime:
    """Retorna início do próximo dia na timezone configurada"""
    return today() + timedelta(days=1)

def yesterday() -> datetime:
    """Retorna início do dia anterior na timezone configurada"""
    return today() - timedelta(days=1)

# Funções de compatibilidade para código existente
def utcnow() -> datetime:
    """Compatibilidade com datetime.utcnow() - retorna UTC"""
    return get_current_utc()

def brasilia_now() -> datetime:
    """Retorna horário atual de Brasília"""
    return get_current_brasilia()
