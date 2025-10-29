"""
Configuração de tasks periódicas para o sistema de refresh schedule
"""
from celery.schedules import crontab


# Configurações de tasks periódicas para o Celery Beat
REFRESH_SCHEDULER_BEAT_SCHEDULE = {
    # Processar lote de refresh a cada 2 minutos (sistema individual)
    'process-refresh-batch': {
        'task': 'refresh_scheduler.process_refresh_batch',
        'schedule': crontab(minute='*/2'),  # A cada 2 minutos
        'options': {
            'expires': 110,  # Expira em 110 segundos
        }
    },
    
    # Processar agendamentos de listas a cada 1 minuto (sistema de listas)
    'process-refresh-schedules': {
        'task': 'refresh_scheduler.check_and_execute_schedules',
        'schedule': crontab(minute='*/1'),  # A cada 1 minuto
        'options': {
            'expires': 50,  # Expira em 50 segundos
        }
    },
    
    # Processar jobs pendentes a cada 30 segundos (execução real dos jobs)
    'process-pending-jobs': {
        'task': 'refresh_scheduler.process_pending_jobs',
        'schedule': 30.0,  # A cada 30 segundos
        'options': {
            'expires': 25,  # Expira em 25 segundos
        }
    },
    
    # Health check da fila a cada 5 minutos
    'queue-health-check': {
        'task': 'refresh_scheduler.queue_health_check',
        'schedule': crontab(minute='*/5'),  # A cada 5 minutos
        'options': {
            'expires': 240,  # Expira em 4 minutos
        }
    },
    
    # Limpeza de histórico antigo - diariamente às 2:00 AM
    'cleanup-old-history': {
        'task': 'refresh_scheduler.cleanup_old_history',
        'schedule': crontab(hour=2, minute=0),  # 02:00 todos os dias
        'kwargs': {'days_to_keep': 30}
    },
}


def register_refresh_scheduler_tasks(app):
    """
    Registra as tasks de refresh scheduler no Celery Beat
    
    Args:
        app: Instância do Flask app
    """
    if hasattr(app, 'conf') and hasattr(app.conf, 'beat_schedule'):
        # É uma instância do Celery
        celery_app = app
    else:
        # É uma instância do Flask, pegar o Celery
        celery_app = app.extensions.get('celery')
    
    if celery_app and hasattr(celery_app, 'conf'):
        # Inicializar beat_schedule se não existir
        if not hasattr(celery_app.conf, 'beat_schedule'):
            celery_app.conf.beat_schedule = {}
        
        # Mesclar as tasks (não sobrescrever)
        for task_name, task_config in REFRESH_SCHEDULER_BEAT_SCHEDULE.items():
            if task_name not in celery_app.conf.beat_schedule:
                celery_app.conf.beat_schedule[task_name] = task_config
        
        # Configurar timezone se não estiver configurado
        if not hasattr(celery_app.conf, 'timezone'):
            celery_app.conf.timezone = 'UTC'
        
        print("✅ Refresh scheduler tasks registered with Celery Beat")
        print(f"📋 Total scheduled tasks: {len(celery_app.conf.beat_schedule)}")
    else:
        print("⚠️ Could not register refresh scheduler tasks - Celery not found")


# Configurações adicionais para melhor performance
REFRESH_SCHEDULER_CELERY_CONFIG = {
    # Configurações de workers
    'worker_prefetch_multiplier': 1,  # Workers pegam 1 task por vez para melhor distribuição
    'task_acks_late': True,  # Confirma task apenas após completar
    'worker_max_tasks_per_child': 1000,  # Reinicia worker após 1000 tasks
    
    # Configurações de retry
    'task_default_retry_delay': 60,  # 1 minuto entre retries
    'task_max_retries': 3,  # Máximo 3 tentativas
    
    # Configurações de routing
    'task_routes': {
        'refresh_scheduler.*': {'queue': 'refresh_scheduler'},  # Queue dedicada
    },
    
    # Configurações de serialização
    'task_serializer': 'json',
    'accept_content': ['json'],
    'result_serializer': 'json',
}


def apply_refresh_scheduler_config(celery_app):
    """
    Aplica configurações específicas do refresh scheduler no Celery
    
    Args:
        celery_app: Instância do Celery
    """
    for key, value in REFRESH_SCHEDULER_CELERY_CONFIG.items():
        setattr(celery_app.conf, key, value)
    
    print("✅ Refresh scheduler Celery config applied")
