#!/usr/bin/env python3
"""
Configuração simplificada para Celery Beat - Renovação automática CanalpPro.
Sistema permanente de renovação a cada 2 horas.
"""

from celery.schedules import crontab
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)

class SimpleCanalpProScheduleConfig:
    """
    Configuração simplificada para agendamento automático de renovação CanalpPro
    """
    
    @staticmethod
    def get_beat_schedule():
        """
        Retorna o schedule para Celery Beat
        
        Returns:
            Dict com configuração de schedule
        """
        schedule = {
            # Verificação automática a cada 2 horas usando implementação HAR
            'canalpro-auto-renewal': {
                'task': 'canalpro-auto-renewal',
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
            'canalpro-health-check': {
                'task': 'canalpro-health-check',
                'schedule': crontab(minute=0, hour=8),  # Diariamente às 8h
                'options': {
                    'expires': 1800,  # Expira em 30 minutos
                    'retry': False,
                }
            }
        }
        
        logger.info("Configuração de schedule CanalpPro carregada com %d tasks", len(schedule))
        return schedule
    
    @staticmethod 
    def enable_permanent_renewal():
        """
        Ativa renovação permanente conforme solicitado pelo usuário
        """
        logger.info("✅ Sistema de renovação automática PERMANENTE ativo!")
        logger.info("🔄 Verificação a cada 2 horas")
        logger.info("⚡ Renovação quando token < 24h para expirar")
        logger.info("🛡️ Sistema robusto baseado no script manual que funciona")
        
        return True

# Configuração para ser importada pelo celery_app.py
CANALPRO_BEAT_SCHEDULE = SimpleCanalpProScheduleConfig.get_beat_schedule()

# Ativar sistema permanente
SimpleCanalpProScheduleConfig.enable_permanent_renewal()
