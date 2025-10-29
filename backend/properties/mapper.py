"""Mapper: converte um objeto Property (modelo ou objeto com atributos similares)
para o payload esperado pelo ListingInputType do Gandalf.

Função principal: map_property_to_listing(property, publication_type=None)
"""

from typing import Any, Dict, List, Optional


def _safe_list(v):
    if v is None:
        return []
    if isinstance(v, list):
        return v
    return [v]


def _first_or_none(v):
    try:
        if v is None:
            return None
        if isinstance(v, (list, tuple)) and v:
            return v[0]
        return v
    except Exception:
        return None


def map_property_to_listing(prop: Any, publication_type: Optional[str] = None) -> Dict:
    """Gera um dict compatível com ListingInputType a partir de um objeto Property.

    Observações:
    - Não modifica o objeto `prop`.
    - Usa campos presentes em `backend/models.py` como base; ignora campos ausentes.
    - `publication_type` sobrescreve qualquer escolha padrão; valor esperado: 'STANDARD'|'PREMIUM' etc.
    """
    # address
    address = {
        'zipCode': getattr(prop, 'address_zip', None),
        'street': getattr(prop, 'address_street', None),
        'city': getattr(prop, 'address_city', None),
        'state': getattr(prop, 'address_state', None),
        'neighborhood': getattr(prop, 'address_neighborhood', None),
        'streetNumber': getattr(prop, 'address_number', None),
        'complement': getattr(prop, 'address_complement', None),
        'locationId': getattr(prop, 'address_location_id', None),
        'precision': getattr(prop, 'address_precision', None),
        'name': getattr(prop, 'address_name', None),
        'country': getattr(prop, 'address_country', None),
        'reference': getattr(prop, 'address_reference', None),
        'district': getattr(prop, 'address_district', None),
        'zoningType': getattr(prop, 'zoning_type', None),
        'urbanZone': getattr(prop, 'urban_zone', None),
    }

    # displayAddressGeolocation
    display_geo = None
    lat = getattr(prop, 'display_latitude', None) or getattr(prop, 'latitude', None)
    lon = getattr(prop, 'display_longitude', None) or getattr(prop, 'longitude', None)
    if lat is not None and lon is not None:
        display_geo = {'lat': float(lat), 'lon': float(lon)}

    # pricingInfos (lista com um item por padrão)
    pricing = {
        'price': float(getattr(prop, 'price', None)) if getattr(prop, 'price', None) is not None else None,
        'currency': getattr(prop, 'currency', None) or 'BRL',
        'monthlyCondoFee': float(getattr(prop, 'condo_fee', None)) if getattr(prop, 'condo_fee', None) is not None else None,
        'iptu': float(getattr(prop, 'iptu', None)) if getattr(prop, 'iptu', None) is not None else None,
        'iptuPeriod': getattr(prop, 'iptu_period', None),
        'businessType': getattr(prop, 'business_type', None) or getattr(prop, 'businessType', None),
    }

    # physical attributes
    usable_areas = _safe_list(getattr(prop, 'usable_area', None))
    if usable_areas and isinstance(usable_areas[0], (int, float)):
        usable_areas = [float(usable_areas[0])]

    total_areas = _safe_list(getattr(prop, 'total_area', None))
    if total_areas and isinstance(total_areas[0], (int, float)):
        total_areas = [float(total_areas[0])]

    bedrooms = _first_or_none(getattr(prop, 'bedrooms', None))
    bathrooms = _first_or_none(getattr(prop, 'bathrooms', None))
    suites = _first_or_none(getattr(prop, 'suites', None))
    parking = _first_or_none(getattr(prop, 'parking_spaces', None))

    # images: prefer image_urls (lista de URLs) ou original_image_paths
    images = getattr(prop, 'image_urls', None) or getattr(prop, 'original_image_paths', None) or []
    # normalizar: se forem objetos com imageUrl, extrair
    normalized_images: List[str] = []
    for it in images:
        if not it:
            continue
        if isinstance(it, str):
            normalized_images.append(it)
        elif isinstance(it, dict):
            # aceitar chaves comuns
            normalized_images.append(it.get('imageUrl') or it.get('url') or it.get('resizedUrl'))
        else:
            # converter para str por precaução
            try:
                normalized_images.append(str(it))
            except Exception:
                pass

    # amenities / portals / videos
    amenities = getattr(prop, 'amenities', None) or []
    portals = getattr(prop, 'portals', None) or []
    videos = getattr(prop, 'videos', None) or []

    # external id
    external_id = getattr(prop, 'external_id', None) or getattr(prop, 'remote_id', None)

    # title/description
    title = getattr(prop, 'title', None)
    description = getattr(prop, 'description', None)

    # listing type and publication type
    listing_type = getattr(prop, 'listing_type', None) or getattr(prop, 'property_type', None)
    # prefer explicit arg, then prop.publication_type, finally default
    publication_type = publication_type or getattr(prop, 'publication_type', None) or 'STANDARD'

    # assemble payload
    payload: Dict = {
        'externalId': external_id,
        'title': title,
        'description': description,
        'originalAddress': address,
        'displayAddressGeolocation': display_geo,
        'publicationType': publication_type,
        'listingType': listing_type,
        'pricingInfos': [pricing],
        'usableAreas': usable_areas if usable_areas else None,
        'totalAreas': total_areas if total_areas else None,
        'bathrooms': int(bathrooms) if bathrooms is not None else None,
        'bedrooms': int(bedrooms) if bedrooms is not None else None,
        'suites': int(suites) if suites is not None else None,
        'parkingSpaces': int(parking) if parking is not None else None,
        'amenities': amenities,
        'images': [{'imageUrl': u} for u in normalized_images],
        'portals': portals,
        'videos': videos,
        'deliveredAt': getattr(prop, 'delivered_at', None),
    }

    # Remove keys with value None to keep payload compacto
    compact = {k: v for k, v in payload.items() if v is not None}
    return compact
