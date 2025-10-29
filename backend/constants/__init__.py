"""
Módulo de constantes centralizadas do backend.
"""
from .publication_types import (
    VALID_PUBLICATION_TYPES,
    PUBLICATION_TYPE_ALIASES,
    DEFAULT_PUBLICATION_TYPE,
    normalize_publication_type
)

__all__ = [
    'VALID_PUBLICATION_TYPES',
    'PUBLICATION_TYPE_ALIASES',
    'DEFAULT_PUBLICATION_TYPE',
    'normalize_publication_type'
]
