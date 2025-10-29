"""
Configuração do Celery Beat para agendamento com suporte a modo manual
"""
from celery.schedules import crontab

# Schedule para monitoramento com agendamento manual
CANALPRO_SCHEDULED_BEAT_SCHEDULE = {
    # Monitoramento principal - verifica a cada 1 minuto
    # (necessário para detectar horários de execução manual com precisão)
    'canalpro-scheduled-monitor': {
        'task': 'canalpro-scheduled-monitor',
        'schedule': crontab(minute='*'),  # A cada 1 minuto
        'options': {
            'expires': 60,
        }
    },
    
    # Limpeza de agendamentos expirados - a cada hora
    'canalpro-check-expired-schedules': {
        'task': 'canalpro-check-expired-schedules',
        'schedule': crontab(minute=0),  # A cada hora
        'options': {
            'expires': 3600,
        }
    }
}


def register_scheduled_tasks(celery_app):
    """
    Registra as tasks de agendamento no Celery
    
    Args:
        celery_app: Instância do Celery
    """
    # Importar as tasks para registrá-las
    from tasks.canalpro_scheduled_monitor import (
        monitor_and_execute_scheduled,
        check_expired_schedules
    )
    
    # Atualizar beat_schedule
    if not hasattr(celery_app.conf, 'beat_schedule'):
        celery_app.conf.beat_schedule = {}
    
    celery_app.conf.beat_schedule.update(CANALPRO_SCHEDULED_BEAT_SCHEDULE)
    
    print("✅ CANALPRO AGENDAMENTO MANUAL REGISTRADO!")
    print(f"📋 Tasks registradas: {list(CANALPRO_SCHEDULED_BEAT_SCHEDULE.keys())}")
    
    return True
