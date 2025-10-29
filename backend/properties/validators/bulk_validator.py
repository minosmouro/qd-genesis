"""
Bulk Validator - Validações para operações em lote
"""
from typing import List, Tuple, Any


class BulkValidator:
    """Validador para operações em lote"""

    @staticmethod
    def validate_delete_request(property_ids: List[int]) -> Tuple[bool, str]:
        """
        Valida uma requisição de bulk delete

        Args:
            property_ids: Lista de IDs das propriedades

        Returns:
            Tuple (is_valid, error_message)
        """
        if not property_ids:
            return False, "No property IDs provided"

        if not isinstance(property_ids, list):
            return False, "Property IDs must be a list"

        if len(property_ids) > 100:
            return False, "Cannot delete more than 100 properties at once"

        # Validar que todos os IDs são inteiros
        for pid in property_ids:
            if not isinstance(pid, int) or pid <= 0:
                return False, f"Invalid property ID: {pid}"

        return True, ""

    @staticmethod
    def validate_update_publication_type_request(property_ids: List[int], publication_type: Any) -> Tuple[bool, str]:
        """Valida requisição de atualização em lote do publication_type"""
        if not property_ids:
            return False, "No property IDs provided"
        if not isinstance(property_ids, list):
            return False, "Property IDs must be a list"
        if len(property_ids) > 500:
            return False, "Cannot update more than 500 properties at once"

        for pid in property_ids:
            if not isinstance(pid, int) or pid <= 0:
                return False, f"Invalid property ID: {pid}"

        if not isinstance(publication_type, str) or not publication_type.strip():
            return False, "publication_type must be a non-empty string"

        return True, ""
