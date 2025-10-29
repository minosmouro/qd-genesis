"""
Helper functions for property operations
"""
from typing import List, Any, Optional
from datetime import datetime


def parse_date_br(date_str: str) -> Optional[datetime]:
    """Parse Brazilian date format DD/MM/YYYY HH:MM:SS to datetime."""
    if not date_str or not isinstance(date_str, str):
        return None
    
    try:
        # Try DD/MM/YYYY HH:MM:SS format first
        return datetime.strptime(date_str.strip(), '%d/%m/%Y %H:%M:%S')
    except ValueError:
        try:
            # Try DD/MM/YYYY format
            return datetime.strptime(date_str.strip(), '%d/%m/%Y')
        except ValueError:
            try:
                # Try ISO format as fallback
                return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            except ValueError:
                return None


def first_int(arr: List[Any]) -> Optional[int]:
    """Extract first integer value from an array or scalar safely.

    Accepts: list (first element), int/float, or numeric string.
    """
    try:
        if isinstance(arr, list) and arr:
            return int(arr[0])
        if isinstance(arr, (int, float)) and not isinstance(arr, bool):
            return int(arr)
        if isinstance(arr, str) and arr.strip() != '':
            return int(float(arr.strip()))
    except Exception:
        return None
    return None


def first_float(arr: List[Any]) -> Optional[float]:
    """Extract first float value from an array or scalar safely.

    Accepts: list (first element), int/float, or numeric string.
    """
    try:
        if isinstance(arr, list) and arr:
            return float(arr[0])
        if isinstance(arr, (int, float)) and not isinstance(arr, bool):
            return float(arr)
        if isinstance(arr, str) and arr.strip() != '':
            return float(arr.strip())
    except Exception:
        return None
    return None


def safe_float(value: Any) -> Optional[float]:
    """Safely convert value to float."""
    try:
        if value not in (None, ''):
            return float(value)
    except Exception:
        return None
    return None


def first_non_empty_list(arr: List[Any]) -> Optional[List[Any]]:
    """Return the list if it's not empty, otherwise None."""
    if isinstance(arr, list) and len(arr) > 0:
        return arr
    return None


def infer_apartment_subtype(raw_data: dict) -> Optional[List[str]]:
    """Infer apartment subtype based on property characteristics."""
    unit_types = raw_data.get('unitTypes', [])
    
    # Only infer for apartments
    if not isinstance(unit_types, list) or 'APARTMENT' not in unit_types:
        return None
    
    # Check characteristics to infer subtype
    amenities = raw_data.get('amenities', [])
    bedrooms = raw_data.get('bedrooms', [])
    suites = raw_data.get('suites', [])
    total_areas = raw_data.get('totalAreas', [])
    unit_floor = raw_data.get('unitFloor')
    
    # Extract values
    bedrooms_count = bedrooms[0] if isinstance(bedrooms, list) and bedrooms else 0
    suites_count = suites[0] if isinstance(suites, list) and suites else 0
    area = total_areas[0] if isinstance(total_areas, list) and total_areas else 0
    
    # Convert amenities to lowercase for easier matching
    amenities_lower = [a.lower() for a in amenities] if isinstance(amenities, list) else []
    
    # Studio/Kitnet inference (small area, 0-1 bedrooms)
    if bedrooms_count == 0 or (bedrooms_count <= 1 and area < 60):
        return ['STUDIO']
    
    # Cobertura/Penthouse inference (top floor amenities)
    penthouse_amenities = ['private_pool', 'terrace', 'penthouse', 'private_terrace', 'rooftop']
    if any(amenity in ' '.join(amenities_lower) for amenity in penthouse_amenities):
        return ['PENTHOUSE']
    
    # Duplex inference
    if 'duplex' in ' '.join(amenities_lower) or 'double_floor' in ' '.join(amenities_lower):
        return ['DUPLEX']
    
    # Garden apartment inference (ground floor with garden access)
    garden_amenities = ['garden', 'private_garden', 'garden_view']
    if unit_floor == 1 and any(amenity in ' '.join(amenities_lower) for amenity in garden_amenities):
        return ['GARDEN_APARTMENT']
    
    # Loft inference (full floor, high ceiling characteristics)
    if 'full_floor' in amenities_lower and area > 100:
        return ['LOFT']
    
    # Standard apartment with suite
    if suites_count > 0:
        return ['APARTMENT_WITH_SUITE']
    
    # Standard apartment (fallback for regular apartments)
    return ['STANDARD_APARTMENT']


def needs_download(url: str) -> bool:
    """Check if a URL needs to be downloaded (not already hosted)."""
    if not url or not isinstance(url, str):
        return False
    url = url.strip().lower()
    return not (url.startswith('http://') or url.startswith('https://') or url.startswith('s3://'))


def sanitize_ids(ids: List[Any]) -> List[int]:
    """Sanitize a list of IDs to integers."""
    clean_ids = []
    for i in ids:
        try:
            clean_ids.append(int(i))
        except Exception:
            continue
    return clean_ids
