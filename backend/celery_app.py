"""
Configuração do Celery para o backend Gandalf.
"""

import os
from celery import Celery
from utils.timezone_utils import UTC_TZ

CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', CELERY_BROKER_URL)


def make_celery(app_name=__name__):
    """Cria e configura a instância do Celery."""
    celery_instance = Celery(app_name, broker=CELERY_BROKER_URL, backend=CELERY_RESULT_BACKEND)

    # Configurações essenciais
    celery_instance.conf.update(
        task_track_started=True,
        timezone=str(UTC_TZ),  # Timezone UTC para consistência
        enable_utc=True,
        beat_schedule_filename='/tmp/celerybeat-schedule',  # Arquivo persistente para beat
        beat_sync_every=1,  # Sincronizar a cada task
    )

    return celery_instance

# Instância pronta para uso por CLI: `celery -A celery_app worker --loglevel=info`
celery = make_celery()

# Importar e registrar tasks
from properties.tasks.refresh_scheduler_config import (
    register_refresh_scheduler_tasks,
    apply_refresh_scheduler_config
)

apply_refresh_scheduler_config(celery)
register_refresh_scheduler_tasks(celery)

# Registrar tasks principais de renovação de tokens
from tasks.token_renewal import check_expiring_tokens, renew_token, cleanup_expired_tokens
from celery.schedules import crontab

# Configurar schedule para tasks principais
celery.conf.beat_schedule.update({
    # Verificar tokens expirando a cada 30 minutos
    'check-expiring-tokens': {
        'task': 'token_renewal.check_expiring_tokens',
        'schedule': crontab(minute='*/30'),
    },
    
    # Limpeza diária de tokens expirados
    'cleanup-expired-tokens': {
        'task': 'token_renewal.cleanup_expired_tokens',
        'schedule': crontab(hour=2, minute=0),  # 2:00 AM todos os dias
    }
})

# ========================================
# SISTEMA UNIFICADO CANALPRO - VERSÃO CONSOLIDADA
# ========================================
# Sistema único e robusto de renovação automática
try:
    from tasks.canalpro_renewal_unified import (
        unified_auto_renewal_task,
        schedule_retry_task,
        health_check_task
    )
    from celery.schedules import crontab
    
    # Configurar schedule para o sistema unificado
    celery.conf.beat_schedule.update({
        # Renovação automática a cada 2 horas
        'canalpro-unified-auto-renewal': {
            'task': 'canalpro.unified_auto_renewal',
            'schedule': crontab(minute=0, hour='*/2'),  # A cada 2 horas
            'options': {
                'expires': 3600,  # Task expira em 1 hora se não executar
                'retry': True,
                'retry_policy': {
                    'max_retries': 3,
                    'interval_start': 0,
                    'interval_step': 10,
                    'interval_max': 60,
                }
            }
        },
        
        # Health check diário
        'canalpro-unified-health-check': {
            'task': 'canalpro.health_check',
            'schedule': crontab(minute=0, hour=8),  # Diariamente às 8h
            'options': {
                'expires': 1800,  # Expira em 30 minutos
                'retry': False,
            }
        }
    })
    
    print("✅ Sistema UNIFICADO de renovação CanalPro configurado!")
    print("🔄 Multi-tenant: Suporta múltiplos tenants automaticamente")
    print("🛡️ Tratamento de erros específicos: InvalidCredentials, RateLimit, Network")
    print("📢 Sistema de notificações integrado")
    print("⏰ Schedule: A cada 2 horas + Health check diário")
except Exception as e:
    print(f"⚠️ Erro ao configurar sistema unificado CanalPro: {e}")
# ========================================

# ========================================
# SISTEMA DE AGENDAMENTO MANUAL - NOVO
# ========================================
# Permite ao usuário configurar horário específico de renovação
try:
    from tasks.canalpro_scheduled_config import register_scheduled_tasks
    
    # Registrar tasks de agendamento manual
    register_scheduled_tasks(celery)
    
    print("✅ Sistema de AGENDAMENTO MANUAL CanalPro configurado!")
    print("   🕒 Monitoramento a cada 1 minuto para precisão")
    print("   🎯 Suporta: Automático, Execução Única, Recorrente")
except Exception as e:
    print(f"⚠️ Erro ao configurar agendamento manual: {e}")
# ========================================

# Importa todas as tasks do módulo para garantir registro
from properties.tasks import refresh_scheduler_tasks
from properties.services.refresh_queue_manager import (
    process_refresh_batch,
    process_single_refresh,
    cleanup_old_history,
    queue_health_check
)
