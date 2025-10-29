"""
Validation Service - Validações centralizadas
"""
from typing import Dict, Any, Tuple


class ValidationService:
    """Serviço de validações centralizadas"""

    @staticmethod
    def validate_property_data(data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Valida dados básicos de uma propriedade

        Args:
            data: Dados da propriedade

        Returns:
            Tuple (is_valid, error_message)
        """
        if not data:
            return False, "Empty data"

        if not isinstance(data, dict):
            return False, "Data must be a dictionary"

        # Validar campos obrigatórios
        required_fields = ['title']
        for field in required_fields:
            if not data.get(field):
                return False, f"Field '{field}' is required"

        return True, ""
