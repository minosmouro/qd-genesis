#!/usr/bin/env python3
"""
Configuração DEFINITIVA do Celery Beat para CanalpPro
Esta configuração garante que as tasks sejam executadas
"""

from celery.schedules import crontab

# Schedule definitivo para CanalpPro
CANALPRO_FINAL_BEAT_SCHEDULE = {
    # Task principal - executa a cada 5 minutos para TESTE URGENTE
    'canalpro-auto-renewal-main': {
        'task': 'canalpro-auto-renewal',
        'schedule': crontab(minute='*/5'),  # A CADA 5 MINUTOS PARA TESTE!
        'options': {
            'expires': 300,  # Expira em 5 minutos
        }
    },
    
    # Task de verificação - executa a cada 2 minutos para TESTE URGENTE  
    'canalpro-health-check-main': {
        'task': 'canalpro-health-check', 
        'schedule': crontab(minute='*/2'),  # A CADA 2 MINUTOS PARA TESTE!
        'options': {
            'expires': 120,  # Expira em 2 minutos
        }
    }
}

def register_canalpro_final_tasks(celery_app):
    """Registra as tasks finais do CanalpPro no Celery"""
    
    # Importar as tasks para registrá-las
    from tasks.canalpro_auto_renewal_final import canalpro_auto_renewal_task, canalpro_health_check_task
    
    # Atualizar beat_schedule
    if not hasattr(celery_app.conf, 'beat_schedule'):
        celery_app.conf.beat_schedule = {}
    
    celery_app.conf.beat_schedule.update(CANALPRO_FINAL_BEAT_SCHEDULE)
    
    print("🎯 CANALPRO AUTOMAÇÃO FINAL REGISTRADA!")
    print(f"📋 Tasks registradas: {list(CANALPRO_FINAL_BEAT_SCHEDULE.keys())}")
    
    return True
