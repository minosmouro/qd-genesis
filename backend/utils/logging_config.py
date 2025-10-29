"""
Configuração de logging otimizada para produção.
"""

import logging
import os
from logging.handlers import RotatingFileHandler

def configure_logging():
    """Configura o sistema de logging com níveis apropriados."""
    
    # Nível base baseado no ambiente
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    
    # Configuração básica
    logging.basicConfig(
        level=getattr(logging, log_level, logging.INFO),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),  # Console
        ]
    )
    
    # Configurar loggers específicos com níveis apropriados
    loggers_config = {
        # Logs críticos mantém INFO
        'gandalf_service': logging.INFO,
        'integration_tokens': logging.INFO,
        'token_renewal': logging.INFO,
        
        # Logs de sistema em DEBUG (só aparecem se LOG_LEVEL=DEBUG)
        'werkzeug': logging.WARNING,  # Flask request logs
        'urllib3': logging.WARNING,   # HTTP client logs
        'requests': logging.WARNING,  # Requests library
        'celery': logging.INFO,       # Celery logs
        
        # Logs de sessão mais silenciosos
        'integrations.session_store': logging.WARNING,
        
        # Root logger
        '': getattr(logging, log_level, logging.INFO)
    }
    
    for logger_name, level in loggers_config.items():
        logger = logging.getLogger(logger_name)
        logger.setLevel(level)
    
    # Adicionar handler de arquivo rotativo para logs importantes
    if os.getenv('LOG_TO_FILE', 'false').lower() == 'true':
        file_handler = RotatingFileHandler(
            'logs/application.log', 
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        file_handler.setFormatter(
            logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        )
        file_handler.setLevel(logging.INFO)
        
        # Adicionar apenas aos loggers importantes
        for logger_name in ['gandalf_service', 'integration_tokens', 'token_renewal']:
            logger = logging.getLogger(logger_name)
            logger.addHandler(file_handler)
    
    # Log de inicialização
    logger = logging.getLogger('logging_config')
    logger.info(f'Logging configurado com nível: {log_level}')
    logger.info(f'Log para arquivo: {"Ativado" if os.getenv("LOG_TO_FILE") == "true" else "Desativado"}')


def set_quiet_mode():
    """Ativa modo silencioso - apenas erros e warnings críticos."""
    loggers_to_quiet = [
        'gandalf_service',
        'integration_tokens', 
        'token_renewal',
        'celery',
        'werkzeug',
        'urllib3',
        'requests'
    ]
    
    for logger_name in loggers_to_quiet:
        logger = logging.getLogger(logger_name)
        logger.setLevel(logging.WARNING)
    
    logging.getLogger('logging_config').info('Modo silencioso ativado - apenas warnings e erros serão exibidos')


def set_debug_mode():
    """Ativa modo debug - logs detalhados para troubleshooting."""
    loggers_to_debug = [
        'gandalf_service',
        'integration_tokens',
        'token_renewal'
    ]
    
    for logger_name in loggers_to_debug:
        logger = logging.getLogger(logger_name)
        logger.setLevel(logging.DEBUG)
    
    logging.getLogger('logging_config').info('Modo debug ativado - logs detalhados habilitados')


# Auto-configurar quando importado
if __name__ != '__main__':
    configure_logging()
