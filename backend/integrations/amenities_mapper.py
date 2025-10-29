"""
Mapeamento de amenities entre o sistema interno e o Canal Pro.

Este módulo contém funções para:
1. Buscar amenities disponíveis no Canal Pro
2. Mapear amenities do sistema interno para os códigos do Canal Pro
3. Validar amenities antes da exportação
"""

import logging
from typing import Dict, List, Any, Optional
from integrations.gandalf_service import get_amenities, GandalfError

logger = logging.getLogger(__name__)

# Cache para amenities do Canal Pro
_canalpro_amenities_cache = None
_canalpro_amenities_by_name = {}

def get_canalpro_amenities(creds: Dict[str, Any], force_refresh: bool = False) -> List[Dict[str, Any]]:
    """
    Busca e cacheia as amenities disponíveis no Canal Pro.

    Args:
        creds: Credenciais de autenticação
        force_refresh: Força atualização do cache

    Returns:
        Lista de amenities do Canal Pro
    """
    global _canalpro_amenities_cache, _canalpro_amenities_by_name

    if _canalpro_amenities_cache is None or force_refresh:
        try:
            logger.info("Buscando amenities disponíveis no Canal Pro...")
            # Chamar função diretamente
            _canalpro_amenities_cache = get_amenities(creds)

            # Criar índice por nome para busca rápida
            _canalpro_amenities_by_name = {
                amenity['name']: amenity
                for amenity in _canalpro_amenities_cache
            }

            logger.info(f"Encontradas {len(_canalpro_amenities_cache)} amenities no Canal Pro")
        except GandalfError as e:
            logger.error(f"Erro ao buscar amenities do Canal Pro: {e}")
            # Retornar cache antigo se existir, senão lista vazia
            if _canalpro_amenities_cache is None:
                _canalpro_amenities_cache = []
            _canalpro_amenities_by_name = {}

    return _canalpro_amenities_cache

def map_amenity_to_canalpro(amenity_name: str, canalpro_amenities: List[Dict[str, Any]]) -> Optional[str]:
    """
    Mapeia uma amenity do sistema interno para o código do Canal Pro.

    Args:
        amenity_name: Nome da amenity no sistema interno
        canalpro_amenities: Lista de amenities do Canal Pro

    Returns:
        Código da amenity no Canal Pro ou None se não encontrado
    """
    if not amenity_name or not isinstance(amenity_name, str):
        return None

    amenity_lower = amenity_name.lower().strip()

    # Mapeamentos diretos por nome exato
    direct_mappings = {
        'academia': 'GYM',
        'piscina': 'POOL',
        'churrasqueira': 'BARBECUE_GRILL',
        'elevador': 'ELEVATOR',
        'portaria 24h': 'CONCIERGE_24H',
        'portão eletrônico': 'ELECTRONIC_GATE',
        'segurança 24h': 'CONCIERGE_24H',
        'salão de festas': 'PARTY_HALL',
        'salão de jogos': 'GAMES_ROOM',
        'sauna': 'SAUNA',
        'spa': 'SPA',
        'quadra de tênis': 'TENNIS_COURT',
        'quadra poliesportiva': 'SPORTS_COURT',
        'quadra de squash': 'SQUASH',
        'bicicletário': 'BICYCLES_PLACE',
        'coworking': 'COWORKING',
        'lavanderia': 'LAUNDRY',
        'jardim': 'GARDEN',
        'playground': 'PLAYGROUND',
        'cinema': 'CINEMA',
        'espaço gourmet': 'GOURMET_SPACE',
        'ar condicionado': 'AIR_CONDITIONING',
        'aceita animais': 'PETS_ALLOWED',
        'acesso para deficientes': 'DISABLED_ACCESS',
        'closet': 'CLOSET',
        'condomínio fechado': 'GATED_COMMUNITY',
        'cozinha americana': 'AMERICAN_KITCHEN',
        'lareira': 'FIREPLACE',
        'mobiliado': 'FURNISHED',
        'varanda gourmet': 'GOURMET_BALCONY',
        'conexão à internet': 'INTERNET_ACCESS',
        'ambientes integrados': 'INTEGRATED_ENVIRONMENTS',
        'andar inteiro': 'FULL_FLOOR',
        'área de serviço': 'SERVICE_AREA',
        'armário embutido': 'BUILTIN_WARDROBE',
        'banheira': 'BATHTUB',
        'banheiro de serviço': 'SERVICE_BATHROOM',
        'bar': 'BAR',
        'bar na piscina': 'POOL_BAR',
        'biblioteca': 'LIBRARY',
        'box blindex': 'BLINDEX_BOX',
        'brinquedoteca': 'TOYS_PLACE',
        'câmera de segurança': 'SECURITY_CAMERA',
        'campo de futebol': 'FOOTBALL_FIELD',
        'campo de golfe': 'GOLF_FIELD',
        'canil': 'DOG_KENNEL',
        'carpete': 'CARPET',
        'casa de caseiro': 'CARETAKER_HOUSE',
        'casa de fundo': 'BACKGROUND_HOUSE',
        'casa sede': 'HEADQUARTERS',
        'celeiro': 'BARN',
        'centro de estética': 'BEAUTY_CENTER',
        'cerca': 'FENCE',
        'children care': 'CHILDREN_CARE',
        'churrasqueira na varanda': 'BARBECUE_BALCONY',
        'chuveiro a gás': 'GAS_SHOWER',
        'cimento queimado': 'BURNT_CEMENT',
        'circuito de segurança': 'SAFETY_CIRCUIT',
        'cobertura coletiva': 'COVERAGE',
        'coffee shop': 'COFFEE_SHOP',
        'copa': 'COPA',
        'cozinha gourmet': 'GOURMET_KITCHEN',
        'cozinha grande': 'LARGE_KITCHEN',
        'curral': 'CORRAL',
        'deck': 'DECK',
        'dependência de empregados': 'EMPLOYEE_DEPENDENCY',
        'despensa': 'PANTRY',
        'drywall': 'DRYWALL',
        'edícula': 'EDICULE',
        'entrada de serviço': 'SERVICE_ENTRANCE',
        'entrada lateral': 'SIDE_ENTRANCE',
        'escada': 'STAIR',
        'escritório': 'HOME_OFFICE',
        'espaço teen': 'TEEN_SPACE',
        'espaço pet': 'PET_SPACE',
        'espaço verde / parque': 'GREEN_SPACE',
        'espaço zen': 'ZEN_SPACE',
        'estacionamento para visitantes': 'GUEST_PARKING',
        'fogão': 'COOKER',
        'forno de pizza': 'PIZZA_OVEN',
        'freezer': 'FREEZER',
        'geminada': 'GEMINADA',
        'gerador elétrico': 'ELECTRIC_GENERATOR',
        'gesso - sanca - teto rebaixado': 'SANCA',
        'gramado': 'GRASS',
        'guarita': 'SECURITY_CABIN',
        'hall de entrada': 'ENTRANCE_HALL',
        'heliponto': 'HELIPAD',
        'hidromassagem': 'WHIRLPOOL',
        'horta': 'VEGETABLE_GARDEN',
        'imóvel de esquina': 'CORNER_PROPERTY',
        'interfone': 'INTERCOM',
        'isolamento acústico': 'SOUNDPROOFING',
        'isolamento térmico': 'THERMAL_INSULATION',
        'janela de alumínio': 'ALUMINUM_WINDOW',
        'janela grande': 'LARGE_WINDOW',
        'lago': 'LAKE',
        'laje': 'SLAB',
        'lavabo': 'LAVABO',
        'marina': 'MARINA',
        'meio andar': 'HALF_FLOOR',
        'mezanino': 'MEZZANINE',
        'móvel planejado': 'PLANNED_FURNITURE',
        'muro de escalada': 'CLIMBING_WALL',
        'muro de vidro': 'GLASS_WALL',
        'muro e grade': 'WALLS_GRIDS',
        'ofurô': 'HOT_TUB',
        'orchidário': 'ORCHID_PLACE',
        'pasto': 'PASTURE',
        'pé direito alto': 'HIGH_CEILING_HEIGHT',
        'piscina aquecida': 'HEATED_POOL',
        'piscina coberta': 'COVERED_POOL',
        'piscina infantil': 'CHILDRENS_POOL',
        'piscina para adulto': 'ADULT_POOL',
        'piscina privativa': 'PRIVATE_POOL',
        'piso de madeira': 'WOOD_FLOOR',
        'piso elevado': 'RAISED_FLOOR',
        'piso frio': 'COLD_FLOOR',
        'piso laminado': 'LAMINATED_FLOOR',
        'piso vinílico': 'VINYL_FLOOR',
        'pista de cooper': 'HIKING_TRAIL',
        'pista de skate': 'SKATE_LANE',
        'platibanda': 'PLATIBANDA',
        'poço': 'WELL',
        'poço artesiano': 'ARTESIAN_WELL',
        'pomar': 'POMAR',
        'porcelanato': 'PORCELAIN',
        'possui divisória': 'DIVIDERS',
        'praça': 'SQUARE',
        'quarto de serviço': 'SERVICE_ROOM',
        'quarto extra reversível': 'REVERSIBLE_ROOM',
        'quintal': 'BACKYARD',
        'recepção': 'RECEPTION',
        'redario': 'REDARIO',
        'reservatório de água': 'WATER_TANK',
        'restaurante': 'RESTAURANT',
        'rio': 'RIVER',
        'ronda/vigilância': 'PATROL',
        'sala de almoço': 'LUNCH_ROOM',
        'sala de jantar': 'DINNER_ROOM',
        'sala de massagem': 'MASSAGE',
        'sala de reunião': 'MEETING_ROOM',
        'sala grande': 'LARGE_ROOM',
        'sala pequena': 'SMALL_ROOM',
        'salão de convenção': 'COVENTION_HALL',
        'serviços pay per use': 'PAY_PER_USE_SERVICES',
        'sistema de alarme': 'ALARM_SYSTEM',
        'solarium': 'SOLARIUM',
        'tv a cabo': 'CABLE_TV',
        'varanda': 'BALCONY',
        'varanda fechada com vidro': 'WALL_BALCONY',
        'ventilação natural': 'NATURAL_VENTILATION',
        'vestiário para diaristas': 'DRESS_ROOM2',
        'vigia': 'WATCHMAN',
        'vista para o mar': 'SEA_VIEW',
        'vista panorâmica': 'PANORAMIC_VIEW',
        'vista para a montanha': 'MOUNTAIN_VIEW',
        'vista para lago': 'LAKE_VIEW'
    }

    # Verificar mapeamento direto
    canalpro_code = direct_mappings.get(amenity_lower)
    if canalpro_code:
        return canalpro_code

    # Buscar por similaridade nas amenities do Canal Pro
    for canalpro_amenity in canalpro_amenities:
        # Verificar se o nome do Canal Pro contém palavras da nossa amenity
        canalpro_name_lower = canalpro_amenity['singular'].lower()
        if amenity_lower in canalpro_name_lower or canalpro_name_lower in amenity_lower:
            return canalpro_amenity['name']

        # Verificar plural também
        if canalpro_amenity.get('plural'):
            canalpro_plural_lower = canalpro_amenity['plural'].lower()
            if amenity_lower in canalpro_plural_lower or canalpro_plural_lower in amenity_lower:
                return canalpro_amenity['name']

    logger.warning(f"Amenity '{amenity_name}' não encontrada no mapeamento do Canal Pro")
    return None

def map_amenities_list(amenities_list: List[str], creds: Dict[str, Any]) -> List[str]:
    """
    Mapeia uma lista de amenities do sistema interno para códigos do Canal Pro.

    Args:
        amenities_list: Lista de amenities do sistema interno
        creds: Credenciais para buscar amenities do Canal Pro

    Returns:
        Lista de códigos de amenities válidos no Canal Pro
    """
    if not amenities_list:
        return []

    # Buscar amenities disponíveis no Canal Pro
    canalpro_amenities = get_canalpro_amenities(creds)

    mapped_amenities = []
    for amenity in amenities_list:
        mapped = map_amenity_to_canalpro(amenity, canalpro_amenities)
        if mapped:
            mapped_amenities.append(mapped)
        else:
            logger.warning(f"Amenity '{amenity}' não pôde ser mapeada para o Canal Pro")

    # Remover duplicatas mantendo ordem
    seen = set()
    unique_mapped = []
    for amenity in mapped_amenities:
        if amenity not in seen:
            seen.add(amenity)
            unique_mapped.append(amenity)

    logger.info(f"Mapeadas {len(unique_mapped)} de {len(amenities_list)} amenities para o Canal Pro")
    return unique_mapped

def validate_amenities(amenities_codes: List[str], creds: Dict[str, Any]) -> List[str]:
    """
    Valida se os códigos de amenities existem no Canal Pro.

    Args:
        amenities_codes: Lista de códigos de amenities
        creds: Credenciais para buscar amenities do Canal Pro

    Returns:
        Lista de códigos válidos
    """
    if not amenities_codes:
        return []

    # Buscar amenities disponíveis no Canal Pro
    canalpro_amenities = get_canalpro_amenities(creds)
    valid_codes = {amenity['name'] for amenity in canalpro_amenities}

    valid_amenities = [code for code in amenities_codes if code in valid_codes]

    if len(valid_amenities) < len(amenities_codes):
        invalid_count = len(amenities_codes) - len(valid_amenities)
        logger.warning(f"{invalid_count} códigos de amenities inválidos foram removidos")

    return valid_amenities
