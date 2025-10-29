"""
Monitoring and Observability Module
Provides logging, metrics, and health checks for the properties module
"""
import time
import logging
import json
from functools import wraps
from flask import request, g, current_app, has_app_context, has_request_context
from typing import Dict, Any, Optional
import psutil
import os


class PropertiesLogger:
    """Enhanced logging for properties operations"""

    def __init__(self):
        self.logger = logging.getLogger('properties.monitoring')

    def log_operation(self, operation: str, tenant_id: int, duration: float,
                     success: bool, details: Dict[str, Any] = None):
        """Log operation with structured data"""
        request_id = None
        if has_app_context():
            try:
                request_id = getattr(g, 'request_id', None)
            except RuntimeError:
                request_id = None

        user_agent = 'Unknown'
        ip_address = 'Unknown'
        if has_request_context():
            try:
                user_agent = request.headers.get('User-Agent', 'Unknown')
                ip_address = request.remote_addr or 'Unknown'
            except RuntimeError:
                user_agent = 'Unknown'
                ip_address = 'Unknown'

        log_data = {
            'operation': operation,
            'tenant_id': tenant_id,
            'duration_ms': round(duration * 1000, 2),
            'success': success,
            'timestamp': time.time(),
            'request_id': request_id,
            'user_agent': user_agent,
            'ip_address': ip_address,
        }

        if details:
            log_data.update(details)

        if success:
            self.logger.info(f"Operation completed: {operation}", extra=log_data)
        else:
            self.logger.error(f"Operation failed: {operation}", extra=log_data)

    def log_performance_warning(self, operation: str, duration: float, threshold: float):
        """Log performance warnings when operations exceed thresholds"""
        self.logger.warning(
            f"Performance warning: {operation} took {duration:.2f}s (threshold: {threshold:.2f}s)",
            extra={
                'operation': operation,
                'duration': duration,
                'threshold': threshold,
                'performance_issue': True
            }
        )


class PropertiesMetrics:
    """Metrics collection for properties operations"""

    def __init__(self):
        self.metrics = {
            'requests_total': 0,
            'requests_by_endpoint': {},
            'errors_total': 0,
            'errors_by_type': {},
            'response_times': [],
            'operations_count': {},
            'database_operations': 0,
            'external_api_calls': 0
        }

    def increment_request(self, endpoint: str):
        """Increment request counter"""
        self.metrics['requests_total'] += 1
        if endpoint not in self.metrics['requests_by_endpoint']:
            self.metrics['requests_by_endpoint'][endpoint] = 0
        self.metrics['requests_by_endpoint'][endpoint] += 1

    def record_error(self, error_type: str):
        """Record error occurrence"""
        self.metrics['errors_total'] += 1
        if error_type not in self.metrics['errors_by_type']:
            self.metrics['errors_by_type'][error_type] = 0
        self.metrics['errors_by_type'][error_type] += 1

    def record_response_time(self, duration: float):
        """Record response time"""
        self.metrics['response_times'].append(duration)
        # Keep only last 1000 measurements
        if len(self.metrics['response_times']) > 1000:
            self.metrics['response_times'] = self.metrics['response_times'][-1000:]

    def increment_operation(self, operation: str):
        """Increment operation counter"""
        if operation not in self.metrics['operations_count']:
            self.metrics['operations_count'][operation] = 0
        self.metrics['operations_count'][operation] += 1

    def increment_database_ops(self):
        """Increment database operations counter"""
        self.metrics['database_operations'] += 1

    def increment_api_calls(self):
        """Increment external API calls counter"""
        self.metrics['external_api_calls'] += 1

    def get_summary(self) -> Dict[str, Any]:
        """Get metrics summary"""
        response_times = self.metrics['response_times']
        return {
            'total_requests': self.metrics['requests_total'],
            'total_errors': self.metrics['errors_total'],
            'error_rate': self.metrics['errors_total'] / max(self.metrics['requests_total'], 1),
            'avg_response_time': sum(response_times) / max(len(response_times), 1),
            'max_response_time': max(response_times) if response_times else 0,
            'min_response_time': min(response_times) if response_times else 0,
            'requests_by_endpoint': self.metrics['requests_by_endpoint'],
            'errors_by_type': self.metrics['errors_by_type'],
            'operations_count': self.metrics['operations_count'],
            'database_operations': self.metrics['database_operations'],
            'external_api_calls': self.metrics['external_api_calls']
        }


class HealthChecker:
    """Health checks for the properties service"""

    def __init__(self):
        self.logger = logging.getLogger('properties.health')

    def check_database(self) -> Dict[str, Any]:
        """Check database connectivity"""
        try:
            from models import db
            from sqlalchemy import text

            # Simple query to test connection
            db.session.execute(text('SELECT 1'))
            return {'status': 'healthy', 'message': 'Database connection OK'}
        except Exception as e:
            self.logger.error(f"Database health check failed: {e}")
            return {'status': 'unhealthy', 'message': f'Database error: {str(e)}'}

    def check_external_apis(self) -> Dict[str, Any]:
        """Check external API connectivity"""
        try:
            # This would check connectivity to external services like Gandalf API
            # For now, return a placeholder
            return {'status': 'healthy', 'message': 'External APIs OK'}
        except Exception as e:
            return {'status': 'unhealthy', 'message': f'External API error: {str(e)}'}

    def check_system_resources(self) -> Dict[str, Any]:
        """Check system resource usage"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')

            health_status = 'healthy'
            warnings = []

            if cpu_percent > 90:
                health_status = 'warning'
                warnings.append(f'High CPU usage: {cpu_percent}%')

            if memory.percent > 90:
                health_status = 'warning'
                warnings.append(f'High memory usage: {memory.percent}%')

            if disk.percent > 90:
                health_status = 'warning'
                warnings.append(f'Low disk space: {disk.percent}% used')

            return {
                'status': health_status,
                'message': 'System resources OK' if health_status == 'healthy' else '; '.join(warnings),
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'disk_percent': disk.percent
            }
        except Exception as e:
            return {'status': 'unknown', 'message': f'System check error: {str(e)}'}

    def get_overall_health(self) -> Dict[str, Any]:
        """Get overall system health"""
        database = self.check_database()
        external_apis = self.check_external_apis()
        system = self.check_system_resources()

        # Determine overall status
        statuses = [database['status'], external_apis['status'], system['status']]
        if 'unhealthy' in statuses:
            overall_status = 'unhealthy'
        elif 'warning' in statuses:
            overall_status = 'warning'
        else:
            overall_status = 'healthy'

        return {
            'status': overall_status,
            'timestamp': time.time(),
            'checks': {
                'database': database,
                'external_apis': external_apis,
                'system': system
            }
        }


# Global instances
logger = PropertiesLogger()
metrics = PropertiesMetrics()
health_checker = HealthChecker()


def monitor_operation(operation_name: str):
    """Decorator to monitor operation performance and success"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            success = False
            error_type = None

            tenant_id = 1
            try:
                if has_request_context():
                    tenant_id = getattr(g, 'tenant_id', tenant_id)
            except RuntimeError:
                # Fora de um contexto de aplicação Flask
                tenant_id = 1

            try:
                result = func(*args, **kwargs)
                success = True
                return result

            except Exception as e:
                error_type = type(e).__name__
                metrics.record_error(error_type)
                raise
            finally:
                duration = time.time() - start_time
                metrics.record_response_time(duration)
                metrics.increment_operation(operation_name)

                # Log performance warning if operation took too long
                if duration > 5.0:  # 5 seconds threshold
                    logger.log_performance_warning(operation_name, duration, 5.0)

                # Log operation details
                details = {'error_type': error_type} if error_type else None
                logger.log_operation(operation_name, tenant_id, duration, success, details)

        return wrapper
    return decorator


def track_database_operation():
    """Decorator to track database operations"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            metrics.increment_database_ops()
            return result
        return wrapper
    return decorator


def track_api_call():
    """Decorator to track external API calls"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            metrics.increment_api_calls()
            return result
        return wrapper
    return decorator
