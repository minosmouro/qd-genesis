"""
Lógica de agendamento dinâmico para renovação de tokens
"""
import logging
from datetime import datetime, timedelta
import pytz
from celery import current_app
from celery.schedules import crontab

logger = logging.getLogger(__name__)


def calculate_next_execution(schedule_mode: str, schedule_hour: str, schedule_minute: str, now: datetime = None) -> datetime:
    """
    Calcula próxima execução baseada no modo e horário configurado
    
    Args:
        schedule_mode: 'automatic', 'manual_once', 'manual_recurring'
        schedule_hour: Hora (00-23)
        schedule_minute: Minuto (00, 15, 30, 45)
        now: Datetime atual (opcional, para testes)
    
    Returns:
        datetime: Próxima execução
    """
    if now is None:
        now = datetime.now(pytz.utc)
    
    if schedule_mode == 'automatic':
        # Modo automático: próxima verificação em 15 minutos
        return now + timedelta(minutes=15)
    
    # Modos manuais: calcular horário específico
    hour = int(schedule_hour)
    minute = int(schedule_minute)
    
    # IMPORTANTE: O horário vem do frontend em horário local (UTC-3)
    # Precisamos converter para UTC
    
    # Obter timezone local (São Paulo = UTC-3)
    local_tz = pytz.timezone('America/Sao_Paulo')
    
    # Criar datetime no horário local de hoje
    now_local = now.astimezone(local_tz)
    target_local = now_local.replace(hour=hour, minute=minute, second=0, microsecond=0)
    
    # Se horário já passou hoje, agendar para amanhã
    if target_local <= now_local:
        if schedule_mode == 'manual_once':
            # Execução única: se já passou, agendar para amanhã
            target_local += timedelta(days=1)
        elif schedule_mode == 'manual_recurring':
            # Recorrente: próximo dia
            target_local += timedelta(days=1)
    
    # Converter de volta para UTC para salvar no banco
    target = target_local.astimezone(pytz.utc)
    
    return target


def schedule_one_time_task(hour: str, minute: str, tenant_id: int = 1):
    """
    Agenda execução única para o horário especificado
    
    Args:
        hour: Hora (00-23)
        minute: Minuto (00, 15, 30, 45)
        tenant_id: ID do tenant
    
    Returns:
        datetime: Horário agendado
    """
    now = datetime.now(pytz.utc)
    target_time = calculate_next_execution('manual_once', hour, minute, now)
    
    # Calcular delay em segundos
    delay_seconds = (target_time - now).total_seconds()
    
    # Agendar task com delay
    from tasks.canalpro_auto_renewal_final import canalpro_auto_renewal_task
    
    logger.info(f"📅 Agendando execução única para: {target_time} (em {delay_seconds/60:.1f} minutos)")
    
    # Agendar com countdown
    canalpro_auto_renewal_task.apply_async(countdown=int(delay_seconds))
    
    return target_time


def schedule_recurring_task(hour: str, minute: str):
    """
    Configura execução recorrente (diária) no horário especificado
    
    Args:
        hour: Hora (00-23)
        minute: Minuto (00, 15, 30, 45)
    
    Returns:
        datetime: Próxima execução
    """
    # Atualizar configuração do Celery Beat
    current_app.conf.beat_schedule['canalpro-manual-recurring'] = {
        'task': 'canalpro-auto-renewal',
        'schedule': crontab(hour=hour, minute=minute),  # Todos os dias
        'options': {'expires': 3600}
    }
    
    logger.info(f"📅 Execução recorrente configurada para: {hour}:{minute} (diariamente)")
    
    # Calcular próxima execução
    now = datetime.now(pytz.utc)
    next_run = calculate_next_execution('manual_recurring', hour, minute, now)
    
    return next_run


def schedule_automatic_monitoring():
    """
    Configura monitoramento automático (verificação contínua)
    
    Returns:
        datetime: Próxima verificação
    """
    # Configurar verificação a cada 15 minutos
    current_app.conf.beat_schedule['canalpro-auto-monitor'] = {
        'task': 'canalpro-token-monitor',
        'schedule': crontab(minute='*/15'),  # A cada 15 min
        'options': {'expires': 900}
    }
    
    logger.info("📅 Monitoramento automático configurado (a cada 15 min)")
    
    # Próxima verificação em 15 minutos
    now = datetime.now(pytz.utc)
    return now + timedelta(minutes=15)


def update_schedule_config(tenant_id: int, provider: str, schedule_mode: str, 
                          schedule_hour: str = None, schedule_minute: str = None):
    """
    Atualiza configuração de agendamento no banco de dados
    
    Args:
        tenant_id: ID do tenant
        provider: Provider ('gandalf')
        schedule_mode: Modo de agendamento
        schedule_hour: Hora (opcional)
        schedule_minute: Minuto (opcional)
    
    Returns:
        TokenScheduleConfig: Configuração atualizada
    """
    from models import TokenScheduleConfig
    from extensions import db
    
    # Buscar ou criar configuração
    config = TokenScheduleConfig.query.filter_by(
        tenant_id=tenant_id,
        provider=provider
    ).first()
    
    if not config:
        config = TokenScheduleConfig(
            tenant_id=tenant_id,
            provider=provider
        )
        db.session.add(config)
    
    # Atualizar configuração
    config.schedule_mode = schedule_mode
    config.schedule_hour = schedule_hour
    config.schedule_minute = schedule_minute
    config.enabled = True
    
    # Calcular próxima execução
    if schedule_mode in ['manual_once', 'manual_recurring']:
        config.next_execution = calculate_next_execution(
            schedule_mode, schedule_hour, schedule_minute
        )
    else:
        config.next_execution = calculate_next_execution(
            'automatic', '00', '00'
        )
    
    db.session.commit()
    
    logger.info(f"✅ Configuração de agendamento atualizada: {config.to_dict()}")
    
    return config


def apply_schedule_config(config):
    """
    Aplica configuração de agendamento ao Celery Beat
    
    Args:
        config: TokenScheduleConfig
    """
    if not config or not config.enabled:
        logger.warning("⚠️ Configuração desabilitada ou não encontrada")
        return
    
    if config.schedule_mode == 'manual_once':
        schedule_one_time_task(
            config.schedule_hour,
            config.schedule_minute,
            config.tenant_id
        )
    elif config.schedule_mode == 'manual_recurring':
        schedule_recurring_task(
            config.schedule_hour,
            config.schedule_minute
        )
    else:  # automatic
        schedule_automatic_monitoring()
    
    logger.info(f"✅ Agendamento aplicado: {config.schedule_mode}")
