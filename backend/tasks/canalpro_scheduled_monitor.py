"""
Task de monitoramento com suporte a agendamento manual
"""
import logging
from celery import shared_task
from datetime import datetime, timedelta
import pytz

logger = logging.getLogger(__name__)


@shared_task(name='canalpro-scheduled-monitor')
def monitor_and_execute_scheduled():
    """
    Monitora tokens e executa renovação baseado em agendamento configurado
    
    Suporta 3 modos:
    - automatic: Verifica expiração e renova automaticamente
    - manual_once: Executa uma vez no horário configurado
    - manual_recurring: Executa diariamente no horário configurado
    """
    try:
        from models import TokenScheduleConfig, IntegrationCredentials
        from app import create_app
        from extensions import db
        
        app = create_app()
        with app.app_context():
            # Buscar configuração de agendamento
            config = TokenScheduleConfig.query.filter_by(
                tenant_id=1,
                provider='gandalf',
                enabled=True
            ).first()
            
            if not config:
                logger.info("⚠️ Sem configuração de agendamento ativa")
                return {'status': 'no_config'}
            
            now = datetime.now(pytz.utc)
            
            # ============================================
            # MODO MANUAL: Verificar se é hora de executar
            # ============================================
            if config.schedule_mode in ['manual_once', 'manual_recurring']:
                if not config.next_execution:
                    logger.warning("⚠️ Agendamento manual sem próxima execução definida")
                    return {'status': 'no_next_execution'}
                
                # Verificar se chegou a hora (com margem de 1 minuto)
                time_until = (config.next_execution - now).total_seconds()
                
                if time_until <= 60:  # Dentro de 1 minuto
                    logger.info(f"⏰ Horário de execução manual atingido: {config.next_execution}")
                    
                    # Executar renovação
                    from tasks.canalpro_auto_renewal_final import canalpro_auto_renewal_task
                    result = canalpro_auto_renewal_task()
                    
                    # Atualizar última execução
                    config.last_execution = now
                    
                    # Calcular próxima execução
                    if config.schedule_mode == 'manual_recurring':
                        # Recorrente: agendar para amanhã no mesmo horário
                        next_run = now.replace(
                            hour=int(config.schedule_hour),
                            minute=int(config.schedule_minute),
                            second=0,
                            microsecond=0
                        ) + timedelta(days=1)
                        
                        config.next_execution = next_run
                        logger.info(f"📅 Próxima execução recorrente: {next_run}")
                    else:
                        # Execução única: desabilitar após executar
                        config.enabled = False
                        config.next_execution = None
                        logger.info("✅ Execução única concluída - agendamento desabilitado")
                    
                    db.session.commit()
                    
                    return {
                        'status': 'executed',
                        'mode': config.schedule_mode,
                        'result': result
                    }
                else:
                    # Ainda não é hora
                    minutes_until = time_until / 60
                    logger.debug(f"⏰ Aguardando execução em {minutes_until:.1f} minutos")
                    return {
                        'status': 'waiting',
                        'minutes_until': round(minutes_until, 1),
                        'next_execution': config.next_execution.isoformat()
                    }
            
            # ============================================
            # MODO AUTOMÁTICO: Verificar expiração
            # ============================================
            elif config.schedule_mode == 'automatic':
                creds = IntegrationCredentials.query.filter_by(
                    tenant_id=1,
                    provider='gandalf'
                ).first()
                
                if not creds:
                    logger.warning("⚠️ Credenciais não encontradas")
                    return {'status': 'no_credentials'}
                
                if not creds.expires_at:
                    logger.warning("⚠️ Data de expiração não definida")
                    return {'status': 'no_expiry_date'}
                
                # Calcular tempo até expiração
                time_until_expiry = creds.expires_at - now
                minutes_remaining = time_until_expiry.total_seconds() / 60
                
                # Token expirado - renovar imediatamente
                if minutes_remaining <= 0:
                    minutes_expired = abs(minutes_remaining)
                    logger.warning(f"🚨 Token expirado há {minutes_expired:.1f} min - Renovando automaticamente!")
                    
                    from tasks.canalpro_auto_renewal_final import canalpro_auto_renewal_task
                    result = canalpro_auto_renewal_task()
                    
                    # Atualizar última execução
                    config.last_execution = now
                    db.session.commit()
                    
                    return {
                        'status': 'auto_renewed',
                        'was_expired_for_minutes': round(minutes_expired, 1),
                        'result': result
                    }
                
                # Token próximo de expirar (< 10 min) - alertar
                elif minutes_remaining < 10:
                    logger.info(f"⏰ Token expira em {minutes_remaining:.1f} min - Aguardando...")
                    return {
                        'status': 'expiring_soon',
                        'minutes_remaining': round(minutes_remaining, 1)
                    }
                
                # Token válido
                else:
                    logger.debug(f"✅ Token válido por {minutes_remaining:.0f} min")
                    return {
                        'status': 'token_valid',
                        'minutes_remaining': round(minutes_remaining, 0)
                    }
            
            # Modo desconhecido
            else:
                logger.error(f"❌ Modo de agendamento desconhecido: {config.schedule_mode}")
                return {'status': 'unknown_mode', 'mode': config.schedule_mode}
                
    except Exception as e:
        logger.exception(f"❌ Erro no monitoramento agendado: {e}")
        return {'status': 'error', 'error': str(e)}


@shared_task(name='canalpro-check-expired-schedules')
def check_expired_schedules():
    """
    Verifica e limpa agendamentos expirados (execução única que já passou)
    """
    try:
        from models import TokenScheduleConfig
        from app import create_app
        from extensions import db
        
        app = create_app()
        with app.app_context():
            now = datetime.now(pytz.utc)
            
            # Buscar agendamentos únicos que já passaram
            expired = TokenScheduleConfig.query.filter(
                TokenScheduleConfig.schedule_mode == 'manual_once',
                TokenScheduleConfig.enabled == True,
                TokenScheduleConfig.next_execution < now - timedelta(hours=1)
            ).all()
            
            if expired:
                logger.info(f"🧹 Limpando {len(expired)} agendamento(s) expirado(s)")
                
                for config in expired:
                    config.enabled = False
                    config.next_execution = None
                
                db.session.commit()
                
                return {
                    'status': 'cleaned',
                    'count': len(expired)
                }
            
            return {'status': 'no_expired'}
            
    except Exception as e:
        logger.exception(f"❌ Erro ao limpar agendamentos: {e}")
        return {'status': 'error', 'error': str(e)}
