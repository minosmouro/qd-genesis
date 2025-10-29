"""
Enhanced Property Validator with comprehensive validation rules
"""
from typing import Dict, Any, Tuple, Optional, List
from decimal import Decimal
import re


class PropertyValidationError(Exception):
    """Custom exception for property validation errors"""
    def __init__(self, message: str, field: str = None):
        self.message = message
        self.field = field
        super().__init__(self.message)


class EnhancedPropertyValidator:
    """Comprehensive property data validator with business rules"""
    
    # Constants for validation
    MAX_BEDROOMS = 50
    MAX_BATHROOMS = 20
    MAX_SUITES = 20
    MAX_PARKING = 20
    MAX_FLOORS = 200
    MAX_UNITS_PER_FLOOR = 50
    MAX_BUILDINGS = 50
    MIN_AREA = 1
    MAX_AREA = 10000  # m²
    MIN_PRICE = 1
    MAX_PRICE = 999999999
    
    VALID_USAGE_TYPES = ['RESIDENTIAL', 'COMMERCIAL']
    VALID_PROPERTY_TYPES = [
        'APARTMENT', 'HOUSE', 'COBERTURA', 'LOFT', 'STUDIO',
        'CASA_CONDOMINIO', 'LOTE_TERRENO', 'SALA_COMERCIAL', 'LOJA'
    ]
    VALID_BUSINESS_TYPES = ['SALE', 'RENTAL', 'SALE_RENTAL']
    VALID_IPTU_PERIODS = ['MONTHLY', 'YEARLY']
    VALID_STATUSES = ['pending', 'active', 'imported', 'exported', 'error']
    
    # Property types that require condominium info
    CONDO_REQUIRED_TYPES = ['APARTMENT', 'COBERTURA', 'LOFT', 'STUDIO', 'CASA_CONDOMINIO']
    
    @classmethod
    def validate_create_data(cls, data: Dict[str, Any]) -> Tuple[bool, Optional[Dict]]:
        """Validate data for property creation with comprehensive checks"""
        try:
            cls._validate_required_fields(data)
            cls._validate_field_types(data)
            cls._validate_field_ranges(data)
            cls._validate_business_rules(data)
            cls._validate_address(data)
            cls._validate_pricing(data)
            cls._validate_dependencies(data)
            
            return True, None
            
        except PropertyValidationError as e:
            return False, {
                'message': e.message,
                'field': e.field,
                'status': 400
            }
        except Exception as e:
            return False, {
                'message': f'Validation error: {str(e)}',
                'status': 500
            }
    
    @classmethod
    def _validate_required_fields(cls, data: Dict[str, Any]) -> None:
        """Validate all required fields are present"""
        required_fields = ['title', 'external_id', 'usage_type', 'property_type', 'business_type']
        
        for field in required_fields:
            if not data.get(field):
                raise PropertyValidationError(f'{field} é obrigatório', field)
    
    @classmethod
    def _validate_field_types(cls, data: Dict[str, Any]) -> None:
        """Validate field data types"""
        # String fields
        string_fields = ['title', 'description', 'external_id', 'usage_type', 'property_type']
        for field in string_fields:
            if field in data and data[field] is not None and not isinstance(data[field], str):
                raise PropertyValidationError(f'{field} deve ser uma string', field)
        
        # Integer fields
        int_fields = ['bedrooms', 'bathrooms', 'suites', 'parking_spaces', 'unit_floor', 'floors', 'units_on_floor', 'buildings']
        for field in int_fields:
            if field in data and data[field] is not None:
                try:
                    data[field] = int(data[field])
                except (ValueError, TypeError):
                    raise PropertyValidationError(f'{field} deve ser um número inteiro', field)
        
        # Float/Decimal fields
        float_fields = ['usable_area', 'total_area', 'price_sale', 'price_rent', 'condo_fee', 'iptu']
        for field in float_fields:
            if field in data and data[field] is not None:
                try:
                    data[field] = float(data[field])
                except (ValueError, TypeError):
                    raise PropertyValidationError(f'{field} deve ser um número', field)
    
    @classmethod
    def _validate_field_ranges(cls, data: Dict[str, Any]) -> None:
        """Validate field value ranges"""
        # Validate counts
        if data.get('bedrooms') is not None:
            if not (0 <= data['bedrooms'] <= cls.MAX_BEDROOMS):
                raise PropertyValidationError(f'Quartos deve estar entre 0 e {cls.MAX_BEDROOMS}', 'bedrooms')
        
        if data.get('bathrooms') is not None:
            if not (0 <= data['bathrooms'] <= cls.MAX_BATHROOMS):
                raise PropertyValidationError(f'Banheiros deve estar entre 0 e {cls.MAX_BATHROOMS}', 'bathrooms')
        
        if data.get('suites') is not None:
            if not (0 <= data['suites'] <= cls.MAX_SUITES):
                raise PropertyValidationError(f'Suítes deve estar entre 0 e {cls.MAX_SUITES}', 'suites')
        
        if data.get('parking_spaces') is not None:
            if not (0 <= data['parking_spaces'] <= cls.MAX_PARKING):
                raise PropertyValidationError(f'Vagas deve estar entre 0 e {cls.MAX_PARKING}', 'parking_spaces')
        
        # Validate areas
        if data.get('usable_area') is not None:
            if not (cls.MIN_AREA <= data['usable_area'] <= cls.MAX_AREA):
                raise PropertyValidationError(f'Área útil deve estar entre {cls.MIN_AREA} e {cls.MAX_AREA} m²', 'usable_area')
        
        if data.get('total_area') is not None:
            if not (cls.MIN_AREA <= data['total_area'] <= cls.MAX_AREA):
                raise PropertyValidationError(f'Área total deve estar entre {cls.MIN_AREA} e {cls.MAX_AREA} m²', 'total_area')
        
        # Validate prices
        if data.get('price_sale') is not None:
            if not (cls.MIN_PRICE <= data['price_sale'] <= cls.MAX_PRICE):
                raise PropertyValidationError(f'Preço de venda deve estar entre R$ {cls.MIN_PRICE} e R$ {cls.MAX_PRICE}', 'price_sale')
        
        if data.get('price_rent') is not None:
            if not (cls.MIN_PRICE <= data['price_rent'] <= cls.MAX_PRICE):
                raise PropertyValidationError(f'Valor do aluguel deve estar entre R$ {cls.MIN_PRICE} e R$ {cls.MAX_PRICE}', 'price_rent')
    
    @classmethod
    def _validate_business_rules(cls, data: Dict[str, Any]) -> None:
        """Validate business logic rules"""
        # Validate enum values
        if data.get('usage_type') not in cls.VALID_USAGE_TYPES:
            raise PropertyValidationError('Tipo de uso inválido', 'usage_type')
        
        if data.get('property_type') not in cls.VALID_PROPERTY_TYPES:
            raise PropertyValidationError('Tipo de imóvel inválido', 'property_type')
        
        if data.get('business_type') not in cls.VALID_BUSINESS_TYPES:
            raise PropertyValidationError('Modalidade de negócio inválida', 'business_type')
        
        # Validate title length
        if data.get('title') and len(data['title']) > 255:
            raise PropertyValidationError('Título deve ter no máximo 255 caracteres', 'title')
        
        if data.get('title') and len(data['title']) < 3:
            raise PropertyValidationError('Título deve ter pelo menos 3 caracteres', 'title')
        
        # Area consistency check
        if (data.get('usable_area') and data.get('total_area') and 
            data['usable_area'] > data['total_area']):
            raise PropertyValidationError('Área útil não pode ser maior que área total', 'usable_area')
        
        # Suites cannot exceed bedrooms
        if (data.get('suites') and data.get('bedrooms') and 
            data['suites'] > data['bedrooms']):
            raise PropertyValidationError('Número de suítes não pode exceder o número de quartos', 'suites')
    
    @classmethod
    def _validate_address(cls, data: Dict[str, Any]) -> None:
        """Validate address data"""
        address = data.get('address', {})
        
        if not address:
            return
        
        # Required address fields
        required_address_fields = ['street', 'city', 'zip_code']
        for field in required_address_fields:
            if not address.get(field):
                raise PropertyValidationError(f'{field} do endereço é obrigatório', f'address.{field}')
        
        # Validate CEP format (Brazilian postal code)
        zip_code = address.get('zip_code', '')
        if zip_code and not re.match(r'^\d{5}-?\d{3}$', zip_code):
            raise PropertyValidationError('CEP deve estar no formato 00000-000', 'address.zip_code')
        
        # Validate state (Brazilian states)
        state = address.get('state')
        if state and len(state) != 2:
            raise PropertyValidationError('Estado deve ter 2 caracteres (ex: SP)', 'address.state')
    
    @classmethod
    def _validate_pricing(cls, data: Dict[str, Any]) -> None:
        """Validate pricing based on business type"""
        business_type = data.get('business_type')
        
        if business_type in ['SALE', 'SALE_RENTAL']:
            if not data.get('price_sale') or data['price_sale'] <= 0:
                raise PropertyValidationError('Preço de venda é obrigatório para modalidade de venda', 'price_sale')
        
        if business_type in ['RENTAL', 'SALE_RENTAL']:
            if not data.get('price_rent') or data['price_rent'] <= 0:
                raise PropertyValidationError('Valor do aluguel é obrigatório para modalidade de locação', 'price_rent')
        
        # Validate fees
        if data.get('condo_fee') is not None and data['condo_fee'] < 0:
            raise PropertyValidationError('Taxa de condomínio não pode ser negativa', 'condo_fee')
        
        if data.get('iptu') is not None and data['iptu'] < 0:
            raise PropertyValidationError('IPTU não pode ser negativo', 'iptu')
        
        # Validate IPTU period
        if data.get('iptu_period') and data['iptu_period'] not in cls.VALID_IPTU_PERIODS:
            raise PropertyValidationError('Período do IPTU inválido', 'iptu_period')
    
    @classmethod
    def _validate_dependencies(cls, data: Dict[str, Any]) -> None:
        """Validate field dependencies"""
        property_type = data.get('property_type')
        
        # Condominium info required for certain property types
        if property_type in cls.CONDO_REQUIRED_TYPES:
            if not data.get('building_name'):
                raise PropertyValidationError('Nome do empreendimento é obrigatório para este tipo de imóvel', 'building_name')
        
        # Unit and block validation for apartments
        if property_type in ['APARTMENT', 'LOFT', 'STUDIO']:
            if data.get('unit_floor') is not None and data.get('floors') is not None:
                if data['unit_floor'] > data['floors']:
                    raise PropertyValidationError('Andar da unidade não pode exceder o número total de andares', 'unit_floor')
        
        # IPTU period should be provided if IPTU value exists
        if data.get('iptu') and data['iptu'] > 0 and not data.get('iptu_period'):
            raise PropertyValidationError('Período do IPTU é obrigatório quando valor do IPTU é informado', 'iptu_period')
    
    @classmethod
    def validate_bulk_delete_data(cls, data: Dict[str, Any]) -> Tuple[bool, Optional[Dict]]:
        """Validate data for bulk delete operation"""
        if not data:
            return False, {'message': 'No data provided', 'status': 400}
        
        ids = data.get('ids') or data.get('property_ids') or []
        
        if not isinstance(ids, list) or not ids:
            return False, {'message': 'No property IDs provided', 'status': 400}
        
        # Validate ID format
        for prop_id in ids:
            try:
                int(prop_id)
            except (ValueError, TypeError):
                return False, {'message': f'Invalid property ID: {prop_id}', 'status': 400}
        
        # Limit bulk operations
        if len(ids) > 1000:
            return False, {'message': 'Maximum 1000 properties can be deleted at once', 'status': 400}
        
        return True, None
    
    @classmethod
    def validate_import_payload_data(cls, data: Dict[str, Any]) -> Tuple[bool, Optional[Dict]]:
        """Validate data for import payload operation"""
        if not data:
            return False, {'message': 'No data provided', 'status': 400}
        
        external_id = data.get('external_id') or data.get('externalId')
        
        if not external_id:
            return False, {'message': 'external_id is required', 'status': 400}
        
        # Validate external_id format
        if not isinstance(external_id, str) or len(external_id.strip()) == 0:
            return False, {'message': 'external_id must be a non-empty string', 'status': 400}
        
        if len(external_id) > 100:
            return False, {'message': 'external_id cannot exceed 100 characters', 'status': 400}
        
        return True, None
    
    @classmethod
    def validate_pagination_params(cls, page: Any, page_size: Any, max_page_size: int = 200) -> Tuple[int, int]:
        """Validate and sanitize pagination parameters"""
        try:
            page = int(page) if page else 1
        except (ValueError, TypeError):
            page = 1
            
        try:
            page_size = int(page_size) if page_size else 12
        except (ValueError, TypeError):
            page_size = 12
        
        # Apply limits
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 12
        if page_size > max_page_size:
            page_size = max_page_size
        
        return page, page_size
    
    @classmethod
    def normalize_property_data(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize and clean property data"""
        normalized = data.copy()
        
        # Strip whitespace from string fields
        string_fields = ['title', 'description', 'external_id', 'building_name', 'unit', 'block']
        for field in string_fields:
            if field in normalized and isinstance(normalized[field], str):
                normalized[field] = normalized[field].strip()
        
        # Normalize property_type to uppercase
        if 'property_type' in normalized:
            normalized['property_type'] = str(normalized['property_type']).upper()
        
        # Clean empty strings
        for key, value in list(normalized.items()):
            if value == '':
                normalized[key] = None
        
        return normalized
