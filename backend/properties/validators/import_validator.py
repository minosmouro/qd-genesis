"""
Import Validator - Validações para importação de propriedades
"""
from typing import Dict, Any, Tuple


class ImportValidator:
    """Validador para dados de importação"""

    @staticmethod
    def validate_import_payload(payload: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Valida um payload de importação

        Args:
            payload: Dados da propriedade a importar

        Returns:
            Tuple (is_valid, error_message)
        """
        if not payload:
            return False, "Empty payload"

        if not isinstance(payload, dict):
            return False, "Payload must be a dictionary"

        # Validar external_id
        external_id = payload.get('external_id') or payload.get('externalId')
        if not external_id:
            return False, "external_id is required"

        if not isinstance(external_id, str):
            return False, "external_id must be a string"

        # Validar title se presente
        title = payload.get('title')
        if title and not isinstance(title, str):
            return False, "title must be a string"

        return True, ""
