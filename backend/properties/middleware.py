"""
Middleware for Request Monitoring
Intercepts all requests to collect metrics and log operations
"""
import time
import logging
from flask import request, g, current_app
from .monitoring import metrics, logger
from .logging_config import add_request_id_filter

logger_middleware = logging.getLogger('properties.middleware')


class RequestMetricsMiddleware:
    """Middleware to collect request metrics"""

    def __init__(self, app):
        self.app = app
        self.app.before_request(self.before_request)
        self.app.after_request(self.after_request)

    def before_request(self):
        """Called before each request"""
        # Store start time
        g.request_start_time = time.time()

        # Generate request ID if not present
        if not hasattr(g, 'request_id'):
            import uuid
            g.request_id = str(uuid.uuid4())[:8]

        # Increment request counter
        endpoint = request.endpoint or 'unknown'
        metrics.increment_request(endpoint)

        # Log incoming request
        logger_middleware.info("Request started", extra={
            'method': request.method,
            'path': request.path,
            'endpoint': endpoint,
            'request_id': g.request_id,
            'user_agent': request.headers.get('User-Agent', 'Unknown'),
            'ip': request.remote_addr
        })

    def after_request(self, response):
        """Called after each request"""
        if hasattr(g, 'request_start_time'):
            # Calculate response time
            duration = time.time() - g.request_start_time
            metrics.record_response_time(duration)

            # Log response
            logger_middleware.info("Request completed", extra={
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'duration': duration,
                'request_id': getattr(g, 'request_id', None)
            })

            # Log slow requests
            if duration > 2.0:  # 2 seconds threshold
                logger_middleware.warning("Slow request detected", extra={
                    'method': request.method,
                    'path': request.path,
                    'duration': duration,
                    'status_code': response.status_code,
                    'request_id': getattr(g, 'request_id', None)
                })

        return response


def setup_monitoring(app):
    """Setup monitoring middleware for the Flask app"""
    # Add request metrics middleware
    RequestMetricsMiddleware(app)

    # Configure structured logging
    from .logging_config import setup_structured_logging
    log_level = app.config.get('LOG_LEVEL', 'INFO')
    log_file = app.config.get('LOG_FILE', None)
    setup_structured_logging(log_level, log_file)

    # Add request ID filter to all handlers
    add_request_id_filter()

    app.logger.info("Monitoring middleware initialized")
