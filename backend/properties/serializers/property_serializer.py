"""
Property serializers for API responses
"""
from typing import Dict, Any, Optional
import json
from extensions import db


class PropertySerializer:
    """Handles property object serialization for API responses."""
    
    @staticmethod
    def _normalize_image_urls(image_urls) -> list:
        """Normalize image_urls to always return a list, even if stored as JSON string."""
        if not image_urls:
            return []
        
        # Se já é uma lista, retornar
        if isinstance(image_urls, list):
            return image_urls
        
        # Se é string JSON, fazer parse
        if isinstance(image_urls, str):
            try:
                parsed = json.loads(image_urls)
                return parsed if isinstance(parsed, list) else []
            except (json.JSONDecodeError, TypeError):
                return []
        
        return []
    
    @staticmethod
    def to_dict(prop, include_full_data: bool = False) -> Dict[str, Any]:
        """Convert Property model to dictionary for API response."""
        base_data = {
            'id': prop.id,
            'title': prop.title,
            'description': prop.description,
            'external_id': prop.external_id,
            'status': getattr(prop, 'status', None),
            'remote_id': getattr(prop, 'remote_id', None),
            'image_urls': PropertySerializer._normalize_image_urls(prop.image_urls),
            'price': prop.price,
            'price_rent': float(prop.price_rent) if prop.price_rent else None,
            'bedrooms': prop.bedrooms,
            'bathrooms': prop.bathrooms,
            'suites': prop.suites,
            'parking_spaces': prop.parking_spaces,
            # IMPORTANTE: property_type e category devem estar no base_data para serem visíveis na edição
            'property_type': prop.property_type,
            'category': getattr(prop, 'category', None),
            'publication_type': getattr(prop, 'publication_type', None),
            'features': getattr(prop, 'features', []) or [],
            'custom_features': getattr(prop, 'custom_features', None),
            'property_code': getattr(prop, 'property_code', None),
            # Associação com empreendimento
            'empreendimento_id': getattr(prop, 'empreendimento_id', None),
            # Incluir datas na resposta base
            'created_at': prop.created_at.isoformat() if prop.created_at else None,
            'updated_at': prop.updated_at.isoformat() if prop.updated_at else None
        }
        
        # Add area fields with multiple naming conventions for compatibility
        base_data.update({
            'usable_areas': prop.usable_area,
            'total_areas': prop.total_area,
            'price_sale': float(prop.price) if prop.price else None,
            # Compatibility fields
            'area_util': prop.usable_area,
            'area_total': prop.total_area,
            'garage_spots': prop.parking_spaces,
            'vagas_garagem': prop.parking_spaces,
            'preco_venda': float(prop.price) if prop.price else None,
        })
        
        # Add pricing fields
        base_data.update({
            'condo_fee': float(prop.condo_fee) if prop.condo_fee else None,
            'condo_fee_exempt': getattr(prop, 'condo_fee_exempt', False),
            'iptu': float(prop.iptu) if prop.iptu else None,
            'iptu_exempt': getattr(prop, 'iptu_exempt', False),
            'iptu_period': getattr(prop, 'iptu_period', None),
            # ✨ NOVO: Campos de classificação e facilidades de negociação
            'property_standard': getattr(prop, 'property_standard', None),
            'accepts_financing': getattr(prop, 'accepts_financing', False),
            'financing_details': getattr(prop, 'financing_details', None),
            'accepts_exchange': getattr(prop, 'accepts_exchange', False),
            'exchange_details': getattr(prop, 'exchange_details', None),
        })
        
        # Add address if available (melhorado para incluir mais campos)
        if any([prop.address_street, prop.address_neighborhood, prop.address_city]):
            base_data['address'] = {
                'street': prop.address_street,
                'number': prop.address_number,
                'neighborhood': prop.address_neighborhood,
                'city': prop.address_city,
                'state': prop.address_state,
                'zip_code': getattr(prop, 'address_zip_code', None)
            }
        else:
            base_data['address'] = None
            
        # Add condominium info a partir do Empreendimento, se houver vínculo
        condominium = None
        try:
            if getattr(prop, 'empreendimento_id', None):
                from empreendimentos.models.empreendimento import Empreendimento
                emp = db.session.query(Empreendimento).filter(
                    Empreendimento.id == prop.empreendimento_id,
                    Empreendimento.ativo == True
                ).first()
                if emp:
                    condominium = emp.to_dict()
        except Exception:
            condominium = None
        base_data['condominium'] = condominium
        
        # Add full data if requested
        if include_full_data:
            base_data.update({
                'property_type': prop.property_type,
                'usage_types': getattr(prop, 'usage_types', []) or [],
                'usage_type': getattr(prop, 'usage_types', [None])[0] if getattr(prop, 'usage_types', None) else None,  # Compatibility
                'business_type': prop.business_type,
                'listing_type': getattr(prop, 'listing_type', None),
                'unit_types': getattr(prop, 'unit_types', []) or [],
                'unit_subtypes': getattr(prop, 'unit_subtypes', []) or [],
                'usable_area': prop.usable_area,
                'total_area': prop.total_area,
                'amenities': getattr(prop, 'amenities', []) or [],
                'videos': getattr(prop, 'videos', []) or [],
                'video_tour_link': getattr(prop, 'video_tour_link', None),
                # Somente campos de unidade/bloco permanecem no Property
                'unit_floor': getattr(prop, 'unit_floor', None),
                'unit': getattr(prop, 'unit', None),
                'block': getattr(prop, 'block', None)
            })
            
            # Full address for detailed view
            if any([prop.address_street, prop.address_city]):
                base_data['address'] = {
                    'street': prop.address_street,
                    'number': prop.address_number,
                    'neighborhood': prop.address_neighborhood,
                    'city': prop.address_city,
                    'state': prop.address_state,
                    'zip_code': prop.address_zip,
                    'complement': prop.address_complement
                }
        
        return base_data
    
    @staticmethod
    def to_create_response(prop) -> Dict[str, Any]:
        """Serialize property for create response."""
        property_data = PropertySerializer.to_dict(prop, include_full_data=True)
        
        return {
            'message': 'Property created successfully',
            'property_id': prop.id,
            'property': property_data
        }
    
    @staticmethod
    def to_list_response(properties: list, total: int, page: int, page_size: int) -> Dict[str, Any]:
        """Serialize properties list response."""
        output = [PropertySerializer.to_dict(prop) for prop in properties]
        
        return {
            'data': output,
            'total': total,
            'page': page,
            'page_size': page_size
        }
