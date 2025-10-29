"""
Property Mapper - Mapeia dados entre formatos externos e modelo interno
"""
from typing import Dict, Any, List, Optional
import logging

from models import Property
from properties.utils.helpers import first_int, first_float, parse_date_br
from constants import normalize_publication_type, DEFAULT_PUBLICATION_TYPE
from ..monitoring import monitor_operation

logger = logging.getLogger(__name__)


class PropertyMapper:
    """Mapper para conversão entre propriedades externas e modelo interno"""

    @staticmethod
    @monitor_operation("map_listing_to_property")
    def map_listing_to_property(listing: Dict[str, Any], prop: Property) -> Property:
        """
        Mapeia dados de listing externo para propriedade interna

        Args:
            listing: Dados do listing externo
            prop: Instância da propriedade a ser atualizada

        Returns:
            Propriedade atualizada
        """
        # Dados básicos
        PropertyMapper._map_basic_info(listing, prop)

        # Endereço
        PropertyMapper._map_address(listing, prop)

        # Preços
        PropertyMapper._map_pricing(listing, prop)

        # Características físicas
        PropertyMapper._map_physical_attributes(listing, prop)

        # Tipos e classificações
        PropertyMapper._map_classifications(listing, prop)

        # Metadados
        PropertyMapper._map_metadata(listing, prop)

        # Imagens e mídia
        PropertyMapper._map_media(listing, prop)

        return prop

    @staticmethod
    def simulate_mapping(listing: Dict[str, Any]) -> Dict[str, Any]:
        """Simula mapeamento para dry_run"""
        result = {}

        # Mapear campos principais para simulação
        result['external_id'] = listing.get('externalId') or listing.get('external_id')
        result['title'] = listing.get('title')
        result['description'] = listing.get('description')

        # Endereço básico
        addr = listing.get('address', {})
        result['address'] = {
            'street': addr.get('street'),
            'number': addr.get('streetNumber'),
            'neighborhood': addr.get('neighborhood'),
            'city': addr.get('city'),
            'state': addr.get('state'),
            'zip': addr.get('zipCode')
        }

        # Preço
        pricing = (listing.get('pricingInfos') or [])
        if pricing:
            try:
                result['price'] = float(pricing[0].get('price', 0))
            except (ValueError, TypeError):
                result['price'] = None

        return result

    # Métodos privados de mapeamento
    @staticmethod
    def _map_basic_info(listing: Dict, prop: Property):
        """Mapeia informações básicas"""
        prop.title = listing.get('title') or prop.title
        prop.description = listing.get('description') or prop.description
        prop.status = listing.get('status') or prop.status
        # ID remoto do CanalPro
        try:
            remote_id = listing.get('id')
            if isinstance(remote_id, (str, int)) and remote_id:
                prop.remote_id = str(remote_id)
        except Exception:
            # Mantém valor atual em caso de formato inesperado
            pass
        prop.provider_raw = listing

    @staticmethod
    def _map_address(listing: Dict, prop: Property):
        """Mapeia dados de endereço"""
        addr = listing.get('address', {})
        point = addr.get('point', {})
        display_point = listing.get('displayAddressGeolocation', {})

        prop.address_street = addr.get('street') or prop.address_street
        prop.address_number = addr.get('streetNumber') or prop.address_number
        prop.address_complement = addr.get('complement') or prop.address_complement
        prop.address_neighborhood = addr.get('neighborhood') or prop.address_neighborhood
        prop.address_city = addr.get('city') or prop.address_city
        prop.address_state = addr.get('state') or prop.address_state
        prop.address_zip = addr.get('zipCode') or prop.address_zip
        prop.address_name = addr.get('name') or prop.address_name

        # Coordenadas
        prop.latitude = point.get('lat') or prop.latitude
        prop.longitude = point.get('lon') or prop.longitude
        prop.display_latitude = display_point.get('lat') or prop.display_latitude
        prop.display_longitude = display_point.get('lon') or prop.display_longitude

    @staticmethod
    def _map_pricing(listing: Dict, prop: Property):
        """Mapeia informações de preço"""
        pricing = listing.get('pricingInfos', [])
        if not pricing:
            return

        pricing0 = pricing[0]

        # Preço principal
        try:
            price = pricing0.get('price')
            prop.price = float(price) if price not in (None, '') else prop.price
        except (ValueError, TypeError):
            pass

        # Taxa de condomínio
        try:
            condo = pricing0.get('monthlyCondoFee') or pricing0.get('monthlyCondominiumFee')
            prop.condo_fee = float(condo) if condo not in (None, '') else prop.condo_fee
        except (ValueError, TypeError):
            pass

        # IPTU
        try:
            iptu = pricing0.get('iptu') or pricing0.get('yearlyIptu')
            prop.iptu = float(iptu) if iptu not in (None, '') else prop.iptu
        except (ValueError, TypeError):
            pass

        prop.iptu_period = pricing0.get('iptuPeriod') or prop.iptu_period
        prop.business_type = pricing0.get('businessType') or prop.business_type

    @staticmethod
    def _map_physical_attributes(listing: Dict, prop: Property):
        """Mapeia atributos físicos"""
        bedrooms_val = listing.get('bedrooms')
        prop.bedrooms = first_int(bedrooms_val) if bedrooms_val is not None else prop.bedrooms

        bathrooms_val = listing.get('bathrooms')
        prop.bathrooms = first_int(bathrooms_val) if bathrooms_val is not None else prop.bathrooms

        suites_val = listing.get('suites')
        prop.suites = first_int(suites_val) if suites_val is not None else prop.suites

        parking_val = listing.get('parkingSpaces')
        prop.parking_spaces = first_int(parking_val) if parking_val is not None else prop.parking_spaces

        usable_areas_val = listing.get('usableAreas')
        prop.usable_area = first_float(usable_areas_val) if usable_areas_val is not None else prop.usable_area

        # Total area com validação especial
        total_areas = listing.get('totalAreas')
        if isinstance(total_areas, list) and total_areas:
            try:
                prop.total_area = float(total_areas[0]) if total_areas[0] not in (None, '', 0) else prop.total_area
            except (ValueError, TypeError):
                pass

    @staticmethod
    def _map_classifications(listing: Dict, prop: Property):
        """Mapeia classificações e tipos"""
        
        # Mapeamento de aliases do CanalPro para códigos internos
        CANALPRO_TO_INTERNAL = {
            'CONDOMINIUM': 'CASA_CONDOMINIO',  # CanalPro: CONDOMINIUM → Interno: CASA_CONDOMINIO
            'HOME': 'HOUSE',                    # CanalPro: HOME → Interno: HOUSE
            'ALLOTMENT_LAND': 'LOTE_TERRENO',   # CanalPro: ALLOTMENT_LAND → Interno: LOTE_TERRENO
        }
        
        # Mapear tipo de imóvel (priorizar unitType singular sobre unitTypes array)
        unit_type = listing.get('unitType')
        if unit_type:
            # Converter alias do CanalPro para código interno
            prop.property_type = CANALPRO_TO_INTERNAL.get(unit_type, unit_type)
        elif listing.get('unitTypes'):
            unit_types = listing.get('unitTypes')
            if isinstance(unit_types, list) and unit_types:
                # Converter alias do CanalPro para código interno
                prop.property_type = CANALPRO_TO_INTERNAL.get(unit_types[0], unit_types[0])

        # Derivar categoria a partir de unitSubTypes quando possível
        subtypes = listing.get('unitSubTypes') or listing.get('unitSubtypes')
        derived_category = PropertyMapper._derive_category_from_subtypes(prop.property_type, subtypes)
        if derived_category:
            prop.category = derived_category
        else:
            # Fallback: usar category fornecida pelo listing (ex.: STANDARD/HIGH_STANDARD)
            category = listing.get('category')
            if category:
                prop.category = category

        prop.listing_type = listing.get('listingType') or prop.listing_type
        prop.usage_types = listing.get('usageTypes') or prop.usage_types
        prop.unit_types = listing.get('unitTypes') or prop.unit_types
        prop.unit_subtypes = listing.get('unitSubTypes') or listing.get('unitSubtypes') or prop.unit_subtypes

    @staticmethod
    def _map_metadata(listing: Dict, prop: Property):
        """Mapeia metadados"""
        prop.portals = listing.get('portals') or prop.portals
        prop.stamps = listing.get('stamps') or prop.stamps
        prop.amenities = listing.get('amenities') or prop.amenities
        prop.moderations = listing.get('moderations') or prop.moderations

        prop.score = listing.get('score') or prop.score
        prop.score_name = listing.get('scoreName') or prop.score_name
        prop.score_status = listing.get('scoreStatus') or prop.score_status

        # Datas
        delivered_at_str = listing.get('deliveredAt')
        prop.delivered_at = parse_date_br(delivered_at_str) if delivered_at_str else prop.delivered_at

        created_at_str = listing.get('createdAt') or listing.get('publishedAt')
        prop.published_at = parse_date_br(created_at_str) if created_at_str else prop.published_at

        updated_at_str = listing.get('updatedAt')
        prop.updated_at = parse_date_br(updated_at_str) if updated_at_str else prop.updated_at

        # publication_type (tipo de destaque) com normalização
        publication_type_raw = listing.get('publicationType') or listing.get('publication_type')
        if isinstance(publication_type_raw, str) and publication_type_raw.strip():
            try:
                prop.publication_type = normalize_publication_type(publication_type_raw)
            except Exception:
                # Se vier inválido, aplicar padrão
                prop.publication_type = DEFAULT_PUBLICATION_TYPE

    @staticmethod
    def _map_media(listing: Dict, prop: Property):
        """Mapeia imagens e mídia"""
        images = listing.get('images', [])
        image_urls = PropertyMapper._extract_image_urls(images)

        if image_urls:
            prop.image_urls = image_urls

        prop.videos = listing.get('videos') or prop.videos
        prop.video_tour_link = listing.get('videoTourLink') or prop.video_tour_link

    @staticmethod
    def _process_vivareal_url(url: str) -> str:
        """
        Processa URLs da CDN VivaReal que contêm templates.
        Substitui placeholders {action}/{width}x{height} por valores fixos.
        Exemplo: https://resizedimgs.vivareal.com/{action}/{width}x{height}/vr.images.sp/xxx.jpg
        Retorna: https://resizedimgs.vivareal.com/fit-in/870x653/vr.images.sp/xxx.jpg
        """
        if '{action}' in url and '{width}' in url and '{height}' in url:
            # Usar dimensões padrão para listagem de imóveis
            return url.replace('{action}', 'fit-in').replace('{width}x{height}', '870x653')
        return url

    @staticmethod
    def _extract_image_urls(images: List) -> List[str]:
        """Extrai URLs de imagens de diferentes formatos"""
        image_urls = []

        if not isinstance(images, list):
            return image_urls

        for img in images:
            if isinstance(img, dict):
                # PRIORIDADE: resizedUrl primeiro (VivaReal CDN), depois imageUrl (pode ser S3 temporário)
                url = (img.get('resizedUrl') or img.get('imageUrl') or
                      img.get('url') or img.get('src') or
                      img.get('path') or img.get('image'))
                if url:
                    # Processar URLs com templates da VivaReal CDN
                    processed_url = PropertyMapper._process_vivareal_url(url)
                    image_urls.append(processed_url)
            elif isinstance(img, str) and img.strip():
                # Processar URLs com templates da VivaReal CDN
                processed_url = PropertyMapper._process_vivareal_url(img.strip())
                image_urls.append(processed_url)

        # Deduplicate mantendo ordem
        seen = set()
        return [url for url in image_urls if url and not (url in seen or seen.add(url))]

    @staticmethod
    def _derive_category_from_subtypes(property_type: Optional[str], unit_subtypes: Optional[List[str]]) -> Optional[str]:
        """Deriva categoria interna a partir dos unitSubTypes do CanalPro.

        Retorna valores compatíveis com o mapeamento de exportação (ex.: 'Studio', 'Duplex',
        'Cobertura', 'Térrea', 'Sobrado', 'Kitnet/Conjugado', 'Padrão').
        """
        try:
            if not unit_subtypes or not isinstance(unit_subtypes, list):
                return None

            # Normalizar para upper sem espaços
            subs = [str(s).strip().upper() for s in unit_subtypes if s]
            pt = (property_type or '').strip().upper()

            if pt == 'APARTMENT':
                if 'STUDIO' in subs:
                    return 'Studio'
                if 'DUPLEX' in subs:
                    return 'Duplex'
                if 'PENTHOUSE' in subs:
                    return 'Cobertura'
                # Sem subtipos específicos → padrão
                return 'Padrão'

            if pt in ('HOUSE', 'HOME'):
                if 'SINGLE_STOREY_HOUSE' in subs:
                    return 'Térrea'
                if 'TWO_STORY_HOUSE' in subs:
                    return 'Sobrado'
                if 'KITNET' in subs:
                    return 'Kitnet/Conjugado'
                return 'Padrão'

            if pt in ('CASA_CONDOMINIO', 'CONDOMINIUM'):
                if 'SINGLE_STOREY_HOUSE' in subs:
                    return 'Térrea'
                if 'TWO_STORY_HOUSE' in subs:
                    return 'Sobrado'
                if 'KITNET' in subs:
                    return 'Kitnet/Conjugado'
                # Condomínio sem especificação → Padrão
                return 'Padrão'

            # Tipos não mapeados: não inferir
            return None
        except Exception:
            return None
