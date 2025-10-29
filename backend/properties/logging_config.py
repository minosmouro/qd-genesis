"""
Logging Configuration
Structured logging setup for the properties module
"""
import logging
import logging.config
import sys
from pathlib import Path
from typing import Optional


def setup_structured_logging(log_level: str = 'INFO', log_file: Optional[str] = None):
    """
    Setup structured logging with JSON format for better monitoring

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional log file path
    """

    # Create logs directory if it doesn't exist
    if log_file:
        log_dir = Path(log_file).parent
        log_dir.mkdir(parents=True, exist_ok=True)

    # Logging configuration
    config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'structured': {
                'format': '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s", "module": "%(module)s", "function": "%(funcName)s", "line": %(lineno)d, "request_id": "%(request_id)s", "tenant_id": "%(tenant_id)s", "duration": "%(duration)s", "extra": "%(extra)s"}',
                'datefmt': '%Y-%m-%dT%H:%M:%S%z'
            },
            'simple': {
                'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'level': log_level,
                'formatter': 'simple',
                'stream': sys.stdout
            }
        },
        'loggers': {
            'properties': {
                'level': log_level,
                'handlers': ['console'],
                'propagate': False
            },
            'properties.monitoring': {
                'level': log_level,
                'handlers': ['console'],
                'propagate': False
            },
            'properties.middleware': {
                'level': log_level,
                'handlers': ['console'],
                'propagate': False
            }
        },
        'root': {
            'level': log_level,
            'handlers': ['console']
        }
    }

    # Add file handler if log_file is specified
    if log_file:
        config['handlers']['file'] = {
            'class': 'logging.FileHandler',
            'level': log_level,
            'formatter': 'structured',
            'filename': log_file,
            'encoding': 'utf-8'
        }

        # Add file handler to all loggers
        for logger_name in config['loggers']:
            config['loggers'][logger_name]['handlers'].append('file')
        config['root']['handlers'].append('file')

    # Apply configuration
    logging.config.dictConfig(config)

    # Create logger for this module
    logger = logging.getLogger('properties.logging')
    logger.info("Structured logging initialized", extra={
        'log_level': log_level,
        'log_file': log_file or 'console_only'
    })


class RequestIdFilter(logging.Filter):
    """Filter to add request_id to log records"""

    def filter(self, record):
        from flask import g, has_request_context

        if has_request_context():
            record.request_id = getattr(g, 'request_id', 'no_request')
            record.tenant_id = getattr(g, 'tenant_id', 'no_tenant')
            record.duration = getattr(g, 'request_duration', '')
        else:
            record.request_id = 'no_request'
            record.tenant_id = 'no_tenant'
            record.duration = ''

        # Ensure extra field exists
        if not hasattr(record, 'extra'):
            record.extra = ''

        return True


def add_request_id_filter():
    """Add request ID filter to all handlers"""
    filter = RequestIdFilter()

    # Add filter to root logger handlers
    root_logger = logging.getLogger()
    for handler in root_logger.handlers:
        handler.addFilter(filter)

    # Add filter to properties logger handlers
    properties_logger = logging.getLogger('properties')
    for handler in properties_logger.handlers:
        handler.addFilter(filter)
