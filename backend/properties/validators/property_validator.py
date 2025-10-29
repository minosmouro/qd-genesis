"""
Property validation functions
"""
from typing import Dict, Any, Tuple, Optional


class PropertyValidator:
    """Handles property data validation."""
    
    @staticmethod
    def validate_create_data(data: Dict[str, Any]) -> Tuple[bool, Optional[Dict]]:
        """Validate data for property creation."""
        if not data:
            return False, {'message': 'No data provided', 'status': 400}
        
        title = data.get('title')
        external_id = data.get('external_id')
        
        if not title or not external_id:
            return False, {'message': 'Missing title or external_id', 'status': 400}
        
        return True, None
    
    @staticmethod
    def validate_bulk_delete_data(data: Dict[str, Any]) -> Tuple[bool, Optional[Dict]]:
        """Validate data for bulk delete operation."""
        if not data:
            return False, {'message': 'No data provided', 'status': 400}
        
        ids = data.get('ids') or data.get('property_ids') or []
        
        if not isinstance(ids, list) or not ids:
            return False, {'message': 'No property IDs provided', 'status': 400}
        
        return True, None
    
    @staticmethod
    def validate_import_payload_data(data: Dict[str, Any]) -> Tuple[bool, Optional[Dict]]:
        """Validate data for import payload operation."""
        if not data:
            return False, {'message': 'No data provided', 'status': 400}
        
        external_id = data.get('external_id') or data.get('externalId')
        
        if not external_id:
            return False, {'message': 'external_id is required', 'status': 400}
        
        return True, None
    
    @staticmethod
    def validate_pagination_params(page: Any, page_size: Any, max_page_size: int = 200) -> Tuple[int, int]:
        """Validate and sanitize pagination parameters."""
        try:
            page = int(page) if page else 1
        except Exception:
            page = 1
            
        try:
            page_size = int(page_size) if page_size else 12
        except Exception:
            page_size = 12
        
        # Apply limits
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 12
        if page_size > max_page_size:
            page_size = max_page_size
        
        return page, page_size
