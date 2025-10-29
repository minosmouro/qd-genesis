"""
Constants for property operations
"""

# Pagination limits
DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 12
MAX_PAGE_SIZE = 200
MAX_PUBLIC_PAGE_SIZE = 100

# Status constants
PROPERTY_STATUS_PENDING = 'pending'
PROPERTY_STATUS_IMPORTED = 'imported'
PROPERTY_STATUS_SYNCED = 'synced'
PROPERTY_STATUS_CREATED = 'created'
PROPERTY_STATUS_ERROR = 'error'
PROPERTY_STATUS_FAILED = 'failed'
PROPERTY_STATUS_QUEUED_FAILED = 'queued_failed'

# Retry allowed statuses
RETRY_ALLOWED_STATUSES = ['error', 'queued_failed', 'failed']

# AWS S3 defaults
DEFAULT_AWS_REGION = 'us-east-2'
DEFAULT_S3_BUCKET = 'quadra-fotos'

# Property status choices for validation
PROPERTY_STATUS_CHOICES = [
    PROPERTY_STATUS_PENDING,
    PROPERTY_STATUS_IMPORTED,
    PROPERTY_STATUS_SYNCED,
    PROPERTY_STATUS_CREATED,
    PROPERTY_STATUS_ERROR,
    PROPERTY_STATUS_FAILED,
    PROPERTY_STATUS_QUEUED_FAILED
]

# Address mapping (simplified - would be expanded in production)
ADDRESS_MAPPING = {
    'street': 'address_street',
    'number': 'address_number',  
    'neighborhood': 'address_neighborhood',
    'city': 'address_city',
    'state': 'address_state',
    'zipcode': 'address_zipcode'
}
