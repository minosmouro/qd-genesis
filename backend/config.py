# Configuração da Aplicação Gandalf Properties API

# ========================================
# CONFIGURAÇÃO GERAL
# ========================================

# Ambiente da aplicação
ENV = 'development'

# Debug mode
DEBUG = True

# Secret key para JWT e sessões (APENAS DESENVOLVIMENTO)
SECRET_KEY = 'dev-secret-key-gandalf-2025-not-for-production'

# Chave para criptografia Fernet (tokens e credenciais)
import os
FERNET_KEY = os.environ.get('FERNET_KEY', 'l_wPDGmWk-xnK16_6Yf0-4m8Zxu5vkBCByMng4W0GqM=')

# ========================================
# BANCO DE DADOS - DESENVOLVIMENTO
# ========================================

# SQLite para desenvolvimento (simples e local)
SQLALCHEMY_DATABASE_URI = 'sqlite:///instance/gandalf.db'

# PostgreSQL (para desenvolvimento com Docker)
# SQLALCHEMY_DATABASE_URI = 'postgresql://gandalf_user:gandalf_pass@localhost:5432/gandalf_db'

# Configurações do SQLAlchemy
SQLALCHEMY_TRACK_MODIFICATIONS = False
SQLALCHEMY_ECHO = True  # Debug de queries ativo para desenvolvimento

# Pool simplificado para desenvolvimento
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_size': 2,
    'max_overflow': 5,
    'pool_timeout': 30,
    'pool_recycle': 300,  # 5 minutos
    'pool_pre_ping': True,
}

# ========================================
# REDIS / CACHE
# ========================================

# Redis para cache e sessões
REDIS_URL = 'redis://localhost:6379/0'

# Configurações de cache
CACHE_TYPE = 'redis'
CACHE_REDIS_URL = REDIS_URL
CACHE_DEFAULT_TIMEOUT = 300  # 5 minutos

# ========================================
# JWT / AUTENTICAÇÃO - DESENVOLVIMENTO
# ========================================

# Configurações JWT (desenvolvimento - tokens mais longos para conveniência)
JWT_SECRET_KEY = SECRET_KEY
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 horas (desenvolvimento)
JWT_REFRESH_TOKEN_EXPIRE_DAYS = 7       # 7 dias

# Algoritmo JWT
JWT_ALGORITHM = 'HS256'

# ========================================
# UPLOAD / ARQUIVOS
# ========================================

# Diretório para uploads
UPLOAD_FOLDER = 'uploads/'

# Tipos de arquivo permitidos
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Tamanho máximo do arquivo (16MB)
MAX_CONTENT_LENGTH = 16 * 1024 * 1024

# ========================================
# AWS S3 - DESENVOLVIMENTO (OPCIONAL)
# ========================================

# Para desenvolvimento, AWS é opcional
# Se não configurado, fotos serão salvas localmente
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_S3_REGION = os.environ.get('AWS_S3_REGION', 'us-east-1')
AWS_S3_BUCKET_NAME = os.environ.get('AWS_S3_BUCKET_NAME', 'quadra-fotos-dev')

# ========================================
# DESENVOLVIMENTO - CONFIGURAÇÕES EXTRAS
# ========================================

# API Key para métricas (desenvolvimento)
HEALTH_API_KEY = 'dev-health-key-2025'

# Configurações de logging (verbose para desenvolvimento)
LOG_LEVEL = 'DEBUG'

# CORS mais permissivo para desenvolvimento
CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:5174', 'http://localhost:4000', 'http://127.0.0.1:3000']
LOG_FILE = 'logs/gandalf_api.log'

# ========================================
# RATE LIMITING
# ========================================

# Limites de requisições
RATELIMIT_DEFAULT = '100/minute'
RATELIMIT_STORAGE_URL = REDIS_URL

# ========================================
# CORS
# ========================================

# Origens permitidas
CORS_ORIGINS = [
    'http://localhost:3000',  # Frontend desenvolvimento
    'http://localhost:4000',  # Business Center desenvolvimento
    'http://localhost:5000',  # Própria API
    'https://gandalf.com.br', # Produção
    'https://crm.quadradois.com.br',  # CRM Produção
    'https://app.quadradois.com.br',  # Business Center Produção
    'https://api.quadradois.com.br',  # API Produção
]

# ========================================
# INTEGRAÇÕES EXTERNAS
# ========================================

# API do sistema Gandalf (para importação)
GANDALF_API_URL = 'https://api.gandalf.com.br/v1'
GANDALF_API_KEY = 'your-gandalf-api-key'

# CanalPro API
CANALPRO_API_URL = 'https://api.canalpro.com.br/v1'
CANALPRO_API_KEY = 'your-canalpro-api-key'

# ========================================
# CELERY / TAREFAS ASSÍNCRONAS
# ========================================

# Broker para Celery
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

# Configurações do Celery
CELERY_TIMEZONE = 'America/Sao_Paulo'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutos

# ========================================
# EMAIL (OPCIONAL)
# ========================================

# Configurações de email para notificações
MAIL_SERVER = 'smtp.gmail.com'
MAIL_PORT = 587
MAIL_USE_TLS = True
MAIL_USERNAME = 'noreply@gandalf.com.br'
MAIL_PASSWORD = 'your-email-password'

# ========================================
# PAGINAÇÃO
# ========================================

# Configurações padrão de paginação
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# ========================================
# CONFIGURAÇÕES POR AMBIENTE
# ========================================

class Config:
    """Configuração base"""
    SECRET_KEY = SECRET_KEY
    SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI
    SQLALCHEMY_TRACK_MODIFICATIONS = SQLALCHEMY_TRACK_MODIFICATIONS

class DevelopmentConfig(Config):
    """Configuração para desenvolvimento"""
    DEBUG = True
    SQLALCHEMY_ECHO = True
    LOG_LEVEL = 'DEBUG'

class TestingConfig(Config):
    """Configuração para testes"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///instance/test.db'
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    """Configuração para produção"""
    DEBUG = False
    SQLALCHEMY_ECHO = False
    LOG_LEVEL = 'WARNING'

# Mapeamento de configurações por ambiente
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

# ========================================
# VALIDAÇÃO DE CONFIGURAÇÃO
# ========================================

def validate_config():
    """Valida se todas as configurações necessárias estão presentes"""
    required_configs = [
        'SECRET_KEY',
        'SQLALCHEMY_DATABASE_URI',
        'JWT_SECRET_KEY',
    ]

    missing = []
    for config_item in required_configs:
        if not globals().get(config_item):
            missing.append(config_item)

    if missing:
        raise ValueError(f"Configurações obrigatórias faltando: {', '.join(missing)}")

    print("✅ Configuração validada com sucesso!")

# Executar validação ao importar
if __name__ != '__main__':
    validate_config()
