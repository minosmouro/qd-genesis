"""
Health Check Routes
Provides endpoints for monitoring system health and metrics
"""
from flask import Blueprint, jsonify, request
from ..monitoring import health_checker, metrics, logger
from functools import wraps
import time

health_bp = Blueprint('health', __name__, url_prefix='/health')


def require_api_key(f):
    """Decorator to require API key for sensitive endpoints"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        expected_key = 'gandalf-health-2024'  # In production, use environment variable

        if not api_key or api_key != expected_key:
            return jsonify({'error': 'Invalid or missing API key'}), 401

        return f(*args, **kwargs)
    return decorated_function


@health_bp.route('/', methods=['GET'])
def health_check():
    """Basic health check endpoint"""
    start_time = time.time()
    health_status = health_checker.get_overall_health()
    response_time = time.time() - start_time

    # Log health check
    logger.logger.info("Health check performed", extra={
        'endpoint': '/health',
        'response_time': response_time,
        'status': health_status['status']
    })

    # Return appropriate HTTP status
    status_code = 200
    if health_status['status'] == 'warning':
        status_code = 200  # Still OK but with warnings
    elif health_status['status'] == 'unhealthy':
        status_code = 503  # Service Unavailable

    return jsonify(health_status), status_code


@health_bp.route('/detailed', methods=['GET'])
@require_api_key
def detailed_health():
    """Detailed health check with all component statuses"""
    health_status = health_checker.get_overall_health()

    # Add additional system information
    import platform
    import sys

    health_status['system_info'] = {
        'python_version': sys.version,
        'platform': platform.platform(),
        'architecture': platform.architecture(),
        'processor': platform.processor()
    }

    return jsonify(health_status)


@health_bp.route('/metrics', methods=['GET'])
@require_api_key
def get_metrics():
    """Get system metrics"""
    metrics_summary = metrics.get_summary()

    # Add current timestamp
    metrics_summary['timestamp'] = time.time()

    return jsonify(metrics_summary)


@health_bp.route('/metrics/reset', methods=['POST'])
@require_api_key
def reset_metrics():
    """Reset metrics counters (for testing/debugging)"""
    # Reset metrics
    metrics.metrics = {
        'requests_total': 0,
        'requests_by_endpoint': {},
        'errors_total': 0,
        'errors_by_type': {},
        'response_times': [],
        'operations_count': {},
        'database_operations': 0,
        'external_api_calls': 0
    }

    logger.logger.info("Metrics reset performed")

    return jsonify({'message': 'Metrics reset successfully'})


@health_bp.route('/ping', methods=['GET'])
def ping():
    """Simple ping endpoint for load balancer health checks"""
    return jsonify({'status': 'pong', 'timestamp': time.time()})
