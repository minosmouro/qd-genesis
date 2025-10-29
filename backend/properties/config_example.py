"""
Configuration Example for Properties Module
Shows how to configure monitoring, logging, and other settings
"""
import os

# Flask Configuration
class Config:
    """Base configuration"""
    SECRET_KEY = 'your-secret-key-here'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///gandalf.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Monitoring Configuration
    LOG_LEVEL = 'INFO'  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    LOG_FILE = 'logs/properties.log'  # Optional: set to None for console only

    # Performance Thresholds
    SLOW_REQUEST_THRESHOLD = 2.0  # seconds
    PERFORMANCE_WARNING_THRESHOLD = 5.0  # seconds

    # Health Check Configuration
    HEALTH_CHECK_API_KEY = 'gandalf-health-2024'  # Change in production

    # External API Timeouts
    EXTERNAL_API_TIMEOUT = 30  # seconds
    EXTERNAL_API_RETRIES = 3

    # Database Configuration
    SQLALCHEMY_POOL_SIZE = 10
    SQLALCHEMY_MAX_OVERFLOW = 20
    SQLALCHEMY_POOL_TIMEOUT = 30

    # Redis Configuration (if using Redis for caching)
    REDIS_URL = 'redis://localhost:6379/0'

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    LOG_LEVEL = 'DEBUG'
    LOG_FILE = None  # Console only in development

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    LOG_LEVEL = 'INFO'
    LOG_FILE = '/var/log/gandalf/properties.log'

    # Use environment variables in production
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'fallback-secret-key'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or Config.SQLALCHEMY_DATABASE_URI
    HEALTH_CHECK_API_KEY = os.environ.get('HEALTH_API_KEY') or Config.HEALTH_CHECK_API_KEY

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

# Usage example:
"""
from flask import Flask
from properties import properties_bp, init_monitoring
from config import config

app = Flask(__name__)
app.config.from_object(config['development'])

# Register properties blueprint
app.register_blueprint(properties_bp)

# Initialize monitoring
init_monitoring(app)

if __name__ == '__main__':
    app.run(debug=True)
"""
