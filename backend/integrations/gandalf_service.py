import json
import requests
from typing import Dict, Any, List, Optional
from integrations.session_store import save_session, load_session, delete_session
import uuid
import logging

# Small wrapper for calling Gandalf GraphQL API
GANDALF_URL = 'https://gandalf-api.grupozap.com/'


class GandalfError(Exception):
    pass


def _headers_from_credentials(creds: Dict[str, Any]) -> Dict[str, str]:
    # creds should contain authorization token and other X- headers
    headers = {
        'Content-Type': 'application/json'
    }
    if creds.get('authorization'):
        headers['Authorization'] = creds['authorization']
    
    logger = logging.getLogger('gandalf_service')
    logger.debug('_headers_from_credentials input creds keys: %s', list(creds.keys()))
    
    for h in ['publisher_id', 'odin_id', 'contract_id', 'client_id', 'company', 'app_version', 'publisher_contract_type']:
        v = creds.get(h)
        logger.debug('_headers_from_credentials checking %s: %s', h, v)
        if v:
            header_name = {
                'publisher_id': 'X-PublisherId',
                'odin_id': 'X-OdinID',
                'contract_id': 'X-ContractID',
                'client_id': 'X-ClientID',
                'company': 'X-Company',
                'app_version': 'X-AppVersion',
                'publisher_contract_type': 'X-PublisherContractType'
            }[h]
            headers[header_name] = str(v)
    
    logger.debug('_headers_from_credentials final headers: %s', {k: v for k, v in headers.items() if k.lower() != 'authorization'})
    return headers


def create_listing(listing: Dict[str, Any], creds: Dict[str, Any]) -> Dict[str, Any]:
    body = {
        'operationName': 'createListing',
        'variables': {'listing': listing},
        'query': 'mutation createListing($listing: ListingInputType) { createListing(listing: $listing) { id errors { field message } } }'
    }
    headers = _headers_from_credentials(creds)
    logger = logging.getLogger('gandalf_service')
    logger.debug('create_listing request headers=%s body_keys=%s', {k:v for k,v in headers.items() if k.lower()!='authorization'}, list(body.keys()))
    try:
        # Log payload truncated for debug
        try:
            logger.info('create_listing payload (full): %s', json.dumps(listing, default=str, indent=2))
        except Exception:
            logger.debug('create_listing payload (truncated): <non-serializable>')

        resp = requests.post(GANDALF_URL, headers=headers, json=body, timeout=30)
        logger.debug('create_listing response status=%s body_trunc=%s', resp.status_code, (resp.text or '')[:2000])
        if resp.status_code != 200:
            logger.error('create_listing non-200 response: %s', resp.text[:2000])
            raise GandalfError(f'create_listing failed status={resp.status_code} body={resp.text}')
        return resp.json()
    except Exception as e:
        logger.exception('create_listing exception: %s', e)
        raise


def upload_image(file_bytes: bytes, filename: str, creds: Dict[str, Any]) -> Dict[str, Any]:
    # GraphQL multipart/form-data pattern: operations + map + file
    operations = json.dumps({
        'operationName': 'uploadImage',
        'variables': {'file': None, 'bucket': None},
        'query': 'mutation uploadImage($bucket: String) { uploadImage(bucket: $bucket) { urlImage } }'
    })
    map_field = json.dumps({'0': ['variables.file']})
    headers = {k: v for k, v in _headers_from_credentials(creds).items() if k != 'Content-Type'}
    files = {
        'operations': (None, operations, 'application/json'),
        'map': (None, map_field, 'application/json'),
        '0': (filename, file_bytes, 'application/octet-stream')
    }
    logger = logging.getLogger('gandalf_service')
    try:
        logger.debug('upload_image starting filename=%s headers=%s', filename, {k:v for k,v in headers.items() if k.lower()!='authorization'})
        resp = requests.post(GANDALF_URL, headers=headers, files=files, timeout=60)
        logger.debug('upload_image response status=%s body_trunc=%s', resp.status_code, (resp.text or '')[:2000])
        if resp.status_code != 200:
            logger.error('upload_image non-200 response: %s', resp.text[:2000])
            raise GandalfError(f'upload_image failed status={resp.status_code} body={resp.text}')
        return resp.json()
    except Exception as e:
        logger.exception('upload_image exception: %s', e)
        raise


def list_listings(creds: Dict[str, Any], page_size: int = 50, status_filter: List[str] = None) -> list:
    """Lista todas as propriedades do canal conectando-se à API Gandalf paginada.

    Args:
        creds: Credenciais de autenticação
        page_size: Tamanho da página para paginação
        status_filter: Lista de status para filtrar (ex: ['ACTIVE'])

    Retorna uma lista de objetos de listagem (listListing conforme resposta da API).
    """
    headers = _headers_from_credentials(creds)

    # GraphQL query (baseada na query original do CanalPro capturada via HAR)
    query = '''query listings($listingIds: [String], $externalIds: String, $externalIdPrefix: String, $neighborhood: String, $listingStatus: [ListingStatusEnumType], $publicationType: [PublicationTypeEnumType], $registrationType: [RegistrationTypeEnumType], $businessType: [BusinessEnumType], $contractType: ContractEnumType, $unitType: [String], $unitSubType: [String], $pageSize: Int, $pageNumber: Int, $orderBy: ListingOrderByEnumType, $orderDesc: Boolean, $usageType: UsageEnumType, $zipCode: String, $updatedAtInDays: Int, $transacted: Boolean, $stamps: [String], $portals: [SearchPortalEnumType], $showSubscription: Boolean, $hasFixPosition: Boolean, $useNormalizedTypes: Boolean, $nonActivationReason: [NonActivationReasonEnumType]) {
  listings(listingIds: $listingIds, externalIds: $externalIds, externalIdPrefix: $externalIdPrefix, neighborhood: $neighborhood, listingStatus: $listingStatus, publicationType: $publicationType, registrationType: $registrationType, businessType: $businessType, contractType: $contractType, unitType: $unitType, unitSubType: $unitSubType, pageSize: $pageSize, pageNumber: $pageNumber, orderBy: $orderBy, orderDesc: $orderDesc, usageType: $usageType, updatedAtInDays: $updatedAtInDays, transacted: $transacted, stamps: $stamps, zipCode: $zipCode, portals: $portals, showSubscription: $showSubscription, hasFixPosition: $hasFixPosition, useNormalizedTypes: $useNormalizedTypes, nonActivationReason: $nonActivationReason) {
    listListing {
      address {
        city
        neighborhood
        zipCode
        street
        streetNumber
        state
        name
        locationId
        complement
        precision
        point {
          lat
          lon
        }
      }
      originalAddress {
        city
        neighborhood
        zipCode
        street
        streetNumber
        state
        name
        locationId
        complement
        precision
        point {
          lat
          lon
        }
      }
      displayAddressGeolocation {
        lat
        lon
      }
      amenities
      bathrooms
      bedrooms
      buildings
      contractType
      description
      displayAddressType
      deliveredAt
      externalId
      unitsOnTheFloor
      floors
      id
      images {
        imageId
        imageUrl
        resizedUrl
      }
      legacyId
      listingType
      parkingSpaces
      providerId
      portal
      portals
      pricingInfos {
        price
        businessType
        monthlyCondoFee
        rentalInfo {
          monthlyRentalTotalPrice
          period
          warranties
        }
        yearlyIptu
        iptu
        iptuPeriod
      }
      publicationType
      status
      showPrice
      suites
      title
      score
      scoreStatus
      scoreName
      totalAreas
      unitFloor
      usageTypes
      unitTypes
      unitSubTypes
      usableAreas
      videos
      videoTourLink
      nonActivationReason
      feedsId
      moderations {
        general {
          remaining
        }
        address {
          remaining
        }
        dedup_block {
          id
          externalId
        }
      }
      createdAt
      updatedAt
    }
    pageNumber
    pageSize
    totalPages
    totalResults
  }
}'''

    all_listings = []
    page = 1
    while True:
        # Monta variáveis do payload seguindo o exemplo recebido (arrays vazias quando aplicável)
        body = {
            'operationName': 'listings',
            'variables': {
                'orderDesc': True,
                'orderBy': 'CREATED_AT',
                'pageSize': page_size,
                'pageNumber': page,
                'listingStatus': status_filter or [],
                'publicationType': [],
                'businessType': [],
                'transacted': None,
                'nonActivationReason': [],
                'contractType': 'REAL_ESTATE',
                'showSubscription': False,
                'hasFixPosition': False,
                'useNormalizedTypes': True
            },
            'query': query
        }
        logging.getLogger('gandalf_service').info('list_listings request page=%s headers=%s body_vars=%s', page, {k:v for k,v in headers.items() if k.lower()!='authorization'}, body['variables'])
        resp = requests.post(GANDALF_URL, headers=headers, json=body, timeout=30)
        logging.getLogger('gandalf_service').info('list_listings response status=%s headers=%s body_trunc=%s', resp.status_code, dict(resp.headers), (resp.text or '')[:4000])
        if resp.status_code != 200:
            # incluir body no erro para debug imediato
            raise GandalfError(f'list_listings failed status={resp.status_code} body={resp.text}')
        # parse JSON and validate structure to avoid AttributeError on unexpected/null responses
        try:
            data = resp.json()
        except Exception:
            raise GandalfError(f'list_listings response is not valid json; body={resp.text}')

        if not isinstance(data, dict):
            raise GandalfError(f'list_listings response JSON is not an object; body={resp.text}')

        listings_container = data.get('data')
        if not isinstance(listings_container, dict):
            raise GandalfError(f'list_listings response missing "data" field or it is null; body={resp.text}')

        listings_block = listings_container.get('listings')
        if not isinstance(listings_block, dict):
            raise GandalfError(f'list_listings response missing "listings" block or it is null; body={resp.text}')

        list_items = listings_block.get('listListing') or []
        if not isinstance(list_items, list):
            raise GandalfError(f'list_listings "listListing" is not a list; body={resp.text}')

        all_listings.extend(list_items)

        page_number = listings_block.get('pageNumber', page)
        total_pages = listings_block.get('totalPages', 1)
        if page_number >= total_pages:
            break
        page += 1

    return all_listings


def get_listing_by_external_id(creds: Dict[str, Any], external_id: str) -> list:
    """Busca listagens filtrando por external_id usando a query 'listings'.

    Retorna lista de objetos (pode ser vazia). Usa os mesmos campos que list_listings.
    """
    headers = _headers_from_credentials(creds)

    query = '''query listings($externalIds: String, $pageSize: Int, $pageNumber: Int, $orderBy: ListingOrderByEnumType, $orderDesc: Boolean, $contractType: ContractEnumType, $useNormalizedTypes: Boolean) {
  listings(externalIds: $externalIds, pageSize: $pageSize, pageNumber: $pageNumber, orderBy: $orderBy, orderDesc: $orderDesc, contractType: $contractType, useNormalizedTypes: $useNormalizedTypes) {
    listListing {
      address {
        city
        neighborhood
        zipCode
        street
        streetNumber
        state
        name
        locationId
        complement
        precision
        point {
          lat
          lon
        }
      }
      originalAddress {
        city
        neighborhood
        zipCode
        street
        streetNumber
        state
        name
        locationId
        complement
        precision
        point {
          lat
          lon
        }
      }
      displayAddressGeolocation {
        lat
        lon
      }
      amenities
      bathrooms
      bedrooms
      buildings
      contractType
      description
      displayAddressType
      deliveredAt
      externalId
      unitsOnTheFloor
      floors
      id
      images {
        imageId
        imageUrl
        resizedUrl
      }
      legacyId
      listingType
      parkingSpaces
      providerId
      portal
      portals
      pricingInfos {
        price
        businessType
        monthlyCondoFee
        rentalInfo {
          monthlyRentalTotalPrice
          period
          warranties
        }
        yearlyIptu
        iptu
        iptuPeriod
      }
      publicationType
      status
      showPrice
      suites
      title
      score
      scoreStatus
      scoreName
      totalAreas
      unitFloor
      usageTypes
      unitTypes
      unitSubTypes
      usableAreas
      videos
      videoTourLink
      nonActivationReason
      feedsId
      moderations {
        general {
          remaining
        }
        address {
          remaining
        }
        dedup_block {
          id
          externalId
        }
      }
      createdAt
      updatedAt
    }
    pageNumber
    pageSize
    totalPages
    totalResults
  }
}'''

    body = {
        'operationName': 'listings',
        'variables': {
            'externalIds': external_id,
            'pageSize': 50,
            'pageNumber': 1,
            'orderBy': 'CREATED_AT',
            'orderDesc': True,
            'contractType': 'REAL_ESTATE',
            'useNormalizedTypes': True
        },
        'query': query
    }

    try:
        logger = logging.getLogger('gandalf_service')
        logger.debug('get_listing_by_external_id request external_id=%s headers=%s', external_id, {k:v for k,v in headers.items() if k.lower()!='authorization'})
        resp = requests.post(GANDALF_URL, headers=headers, json=body, timeout=30)
    except Exception as e:
        logging.getLogger('gandalf_service').exception('get_listing_by_external_id request failed: %s', e)
        raise GandalfError(f'get_listing_by_external_id request failed: {e}')

    if resp.status_code != 200:
        logging.getLogger('gandalf_service').error('get_listing_by_external_id failed status=%s body=%s', resp.status_code, resp.text[:2000])
        raise GandalfError(f'get_listing_by_external_id failed status={resp.status_code} body={resp.text}')

    # parse JSON and validate structure to avoid AttributeError on unexpected/null responses
    try:
        data = resp.json()
    except Exception:
        logging.getLogger('gandalf_service').exception('get_listing_by_external_id response is not valid json')
        raise GandalfError('get_listing_by_external_id response is not valid json')

    if not isinstance(data, dict):
        logging.getLogger('gandalf_service').error('get_listing_by_external_id response JSON is not an object; body=%s', resp.text[:2000])
        raise GandalfError('get_listing_by_external_id response JSON is not an object')

    listings_container = data.get('data')
    if not isinstance(listings_container, dict):
        logging.getLogger('gandalf_service').error('get_listing_by_external_id response missing data; body=%s', resp.text[:2000])
        raise GandalfError('get_listing_by_external_id response missing "data" field or it is null')

    listings_block = listings_container.get('listings')
    if not isinstance(listings_block, dict):
        logging.getLogger('gandalf_service').error('get_listing_by_external_id response missing listings block; body=%s', resp.text[:2000])
        raise GandalfError('get_listing_by_external_id response missing "listings" block or it is null')

    list_items = listings_block.get('listListing') or []
    if not isinstance(list_items, list):
        logging.getLogger('gandalf_service').error('get_listing_by_external_id listListing is not a list; body=%s', resp.text[:2000])
        raise GandalfError('get_listing_by_external_id "listListing" is not a list')

    logging.getLogger('gandalf_service').debug('get_listing_by_external_id returning %d items', len(list_items))
    return list_items


def update_listing_publication_type(creds: Dict[str, Any], listing_ids: List[str], publication_type: str) -> Dict[str, Any]:
    """Atualiza o tipo de publicação de um ou mais imóveis no Canal Pro.

    Args:
        creds: Credenciais de autenticação
        listing_ids: Lista de IDs dos imóveis
        publication_type: Novo tipo de publicação (STANDARD, PREMIUM, etc.)

    Returns:
        Resposta da API com resultado da operação
    """
    headers = _headers_from_credentials(creds)

    query = '''mutation updateBatchListingPublicationType($listingIds: [String], $publicationType: PublicationTypeEnumType!) {
  updateBatchListingPublicationType(listingIds: $listingIds, publicationType: $publicationType) {
    success
    errors {
      field
      message
    }
  }
}'''

    body = {
        'operationName': 'updateBatchListingPublicationType',
        'variables': {
            'listingIds': listing_ids,
            'publicationType': publication_type
        },
        'query': query
    }

    try:
        resp = requests.post(GANDALF_URL, headers=headers, json=body, timeout=30)
    except Exception as e:
        raise GandalfError(f'update_listing_publication_type request failed: {e}')

    if resp.status_code != 200:
        raise GandalfError(f'update_listing_publication_type failed status={resp.status_code} body={resp.text}')

    # parse JSON and validate structure
    try:
        data = resp.json()
    except Exception:
        raise GandalfError('update_listing_publication_type response is not valid json')

    if not isinstance(data, dict):
        raise GandalfError('update_listing_publication_type response JSON is not an object')

    return data


def activate_listing(creds: Dict[str, Any], listing_id: str, publication_type: str = "STANDARD") -> Dict[str, Any]:
    """Ativa um imóvel específico no Canal Pro alterando seu tipo de publicação.

    Args:
        creds: Credenciais de autenticação
        listing_id: ID do imóvel no Canal Pro
        publication_type: Tipo de publicação (STANDARD, PREMIUM, etc.)

    Returns:
        Resposta da API com resultado da operação
    """
    headers = _headers_from_credentials(creds)

    query = '''mutation updateListingPublicationType($listingId: String!, $publicationType: PublicationTypeEnumType!) {
  updateListingPublicationType(listingId: $listingId, publicationType: $publicationType) {
    success
    errors {
      field
      message
    }
  }
}'''

    body = {
        'operationName': 'updateListingPublicationType',
        'variables': {
            'listingId': listing_id,
            'publicationType': publication_type
        },
        'query': query
    }

    try:
        resp = requests.post(GANDALF_URL, headers=headers, json=body, timeout=30)
    except Exception as e:
        raise GandalfError(f'activate_listing request failed: {e}')

    if resp.status_code != 200:
        raise GandalfError(f'activate_listing failed status={resp.status_code} body={resp.text}')

    # parse JSON and validate structure
    try:
        data = resp.json()
    except Exception:
        raise GandalfError('activate_listing response is not valid json')

    if not isinstance(data, dict):
        raise GandalfError('activate_listing response JSON is not an object')

    return data


def activate_listing_status(creds: Dict[str, Any], listing_id: str, status: str = "ACTIVE", non_activation_reason: str = None) -> Dict[str, Any]:
    """Ativa ou desativa um imóvel específico no Canal Pro alterando seu status.

    Args:
        creds: Credenciais de autenticação
        listing_id: ID do imóvel no Canal Pro
        status: Status desejado (ACTIVE, INACTIVE, etc.)
        non_activation_reason: Motivo para não ativação (opcional)

    Returns:
        Resposta da API com resultado da operação
    """
    headers = _headers_from_credentials(creds)
    logger = logging.getLogger('gandalf_service')
    query = '''mutation updateListingStatus($listingId: String!, $status: ListingStatusEnumType!, $nonActivationReason: String) {
  updateListingStatus(listingId: $listingId, status: $status, nonActivationReason: $nonActivationReason) {
    success
    errors {
      field
      message
    }
  }
}'''

    variables = {
        'listingId': listing_id,
        'status': status
    }

    if non_activation_reason:
        variables['nonActivationReason'] = non_activation_reason

    body = {
        'operationName': 'updateListingStatus',
        'variables': variables,
        'query': query
    }

    try:
        logger.debug('activate_listing_status request listing_id=%s status=%s', listing_id, status)
        logger.debug('activate_listing_status payload (truncated): %s', json.dumps(variables, default=str)[:2000])
        resp = requests.post(GANDALF_URL, headers=headers, json=body, timeout=30)
    except Exception as e:
        logger.exception('activate_listing_status request failed: %s', e)
        raise GandalfError(f'activate_listing_status request failed: {e}')

    if resp.status_code != 200:
        logger.error('activate_listing_status failed status=%s body=%s', resp.status_code, resp.text[:2000])
        raise GandalfError(f'activate_listing_status failed status={resp.status_code} body={resp.text}')

    try:
        data = resp.json()
    except Exception:
        logger.exception('activate_listing_status response is not valid json')
        raise GandalfError('activate_listing_status response is not valid json')

    logger.debug('activate_listing_status response (truncated): %s', str(data)[:2000])
    return data


def get_amenities(creds: Dict[str, Any], unit_type: str = "APARTMENT", listing_type: str = "USED", auto_suggest: bool = True, glossary_version: str = "V4") -> List[Dict[str, Any]]:
    """
    Busca a lista de amenities disponíveis no Canal Pro.

    Args:
        creds: Credenciais de autenticação
        unit_type: Tipo da unidade (APARTMENT, HOUSE, etc.)
        listing_type: Tipo do anúncio (USED, NEW)
        auto_suggest: Se deve incluir itens de sugestão automática
        glossary_version: Versão do glossário

    Returns:
        Lista de amenities com suas propriedades
    """
    body = {
        'operationName': 'amenities',
        'variables': {
            'glossaryVersion': glossary_version,
            'unitType': unit_type,
            'autoSuggestItems': auto_suggest,
            'listingType': listing_type
        },
        'query': '''query amenities($unitType: String, $autoSuggestItems: Boolean, $listingType: ListingTypeEnum, $glossaryVersion: String = "V4") {
  amenities(unitType: $unitType, autoSuggestItems: $autoSuggestItems, listingType: $listingType, version: $glossaryVersion) {
    items {
      name
      singular
      plural
      mustAppear
      autoSuggest
      propertyAmenity
      externalAmenity
    }
  }
}'''
    }

    headers = _headers_from_credentials(creds)
    logging.getLogger('gandalf_service').info('get_amenities request headers=%s', {k:v for k,v in headers.items() if k.lower()!='authorization'})

    resp = requests.post(GANDALF_URL, headers=headers, json=body, timeout=30)
    logging.getLogger('gandalf_service').info('get_amenities response status=%s', resp.status_code)

    if resp.status_code != 200:
        raise GandalfError(f'get_amenities failed status={resp.status_code} body={resp.text}')

    data = resp.json()
    amenities_data = data.get('data', {}).get('amenities', {})

    if not amenities_data or 'items' not in amenities_data:
        raise GandalfError(f'Invalid amenities response: {data}')

    return amenities_data['items']


class GandalfService:
    """Service wrapper for Gandalf GraphQL interactions.

    Provides a helper to perform the two-step login flow (login -> loginWithOtpValidate)
    and parse credentials. Also includes minimal stubs for OAuth-related methods used
    elsewhere in the codebase.
    """

    def __init__(self, base_url: str = GANDALF_URL, user_agent: str = 'ZapImoveis/6.13.4'):
        self.base_url = base_url
        self.user_agent = user_agent

    def get_authorization_url(self, state: str) -> str:
        # The CanalPro/Gandalf integration used in this project does not expose a
        # standard OAuth2 authorization URL in the current reverse-engineered flow.
        # Keep a stub so existing code that calls this method will fail explicitly.
        raise NotImplementedError('OAuth authorization URL is not implemented for Gandalf GraphQL API')

    def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        # Stub for compatibility with existing callback flow. If you later implement
        # an OAuth flow, replace this with the proper token exchange.
        raise NotImplementedError('OAuth code exchange is not implemented for Gandalf GraphQL API')

    def start_login_session(self, email: str, password: str, device_id: str) -> Dict[str, Any]:
        """Inicia a sessão de login usando loginWithOtp mutation (descoberto via análise HAR).

        Retorna {'needs_otp': True, 'session_id': '...'} ou {'credentials': {...}} se device já é confiável.
        """
        logger = logging.getLogger('gandalf_service')
        logger.info(f'🔐 Starting loginWithOtp for email: {email[:3]}***@{email.split("@")[1] if "@" in email else "unknown"}')
        logger.info(f'🔐 Device ID: {device_id}')
        
        session = requests.Session()
        # ✅ Headers corrigidos conforme HAR - incluindo X-ClientID e User-Agent do navegador
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0',
            'Accept': '*/*',
            'Accept-Language': 'pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3',
            'X-ClientID': 'CANALPRO_WEB',
            'Disabled-Druid': 'true',
            'Origin': 'https://canalpro.grupozap.com',
            'Referer': 'https://canalpro.grupozap.com/'
        }
        session.headers.update(headers)

        # ✅ Query corrigida conforme HAR - loginWithOtp com isSafeDevice
        body_login = {
            'operationName': 'loginWithOtp',
            'variables': {
                'username': email,  # ✅ Mudou de 'email' para 'username'
                'password': password,
                'deviceId': device_id
            },
            'query': 'query loginWithOtp($username: String!, $password: String!, $deviceId: String!) {\n  loginWithOtp(username: $username, password: $password, deviceId: $deviceId) {\n    credentials {\n      accessToken\n      refreshToken\n      expiresIn\n      origin\n    }\n    isSafeDevice\n  }\n}\n'
        }

        logger.info(f'📤 === REQUEST DETAILS ===')
        logger.info(f'📤 URL: {self.base_url}')
        logger.info(f'📤 Email/Username: {email}')
        logger.info(f'📤 Password length: {len(password)} chars')
        logger.info(f'📤 Password first 3 chars: {password[:3]}...')
        logger.info(f'📤 DeviceId: {device_id}')
        logger.info(f'📤 Headers: {headers}')
        logger.info(f'📤 Body: {body_login}')
        logger.debug(f'📤 Sending loginWithOtp to: {self.base_url}')

        try:
            resp = session.post(self.base_url, json=body_login, timeout=30)
        except Exception as e:
            logger.error(f'❌ loginWithOtp request failed with exception: {e}')
            raise GandalfError(f'loginWithOtp request failed: {e}')

        logger.debug(f'📥 CanalPro API response status: {resp.status_code}')
        logger.info(f'📥 === RESPONSE DETAILS ===')
        logger.info(f'📥 Status: {resp.status_code}')
        logger.info(f'📥 Response Body: {resp.text[:500]}...')

        if resp.status_code != 200:
            logger.error(f'❌ loginWithOtp failed with status {resp.status_code}: {resp.text}')
            raise GandalfError(f'loginWithOtp failed status={resp.status_code} body={resp.text}')

        try:
            data = resp.json()
        except Exception:
            logger.error('❌ loginWithOtp response is not valid JSON')
            raise GandalfError('loginWithOtp response is not valid json')

        # 🔥 CORREÇÃO CRÍTICA: Verificar se tem dados ANTES de verificar erros!
        # Cenário 1: loginWithOtp = null (sem errors) → Precisa OTP (credenciais OK!)
        # Cenário 2: errors presente com G0002 → Credenciais inválidas
        # Cenário 3: loginWithOtp com credentials → Login direto (device confiável)
        
        login_block = data.get('data', {}).get('loginWithOtp') if isinstance(data.get('data'), dict) else None
        
        # CENÁRIO 1: loginWithOtp é None MAS não tem errors → Precisa OTP
        if login_block is None and ('errors' not in data or not data['errors']):
            logger.info('📧 loginWithOtp returned null (sem errors) - credentials válidas, aguardando OTP')
            # Salvar cookies e sessão para usar no request_otp_email
            cookies = {}
            for c in session.cookies:
                cookies[c.name] = c.value

            session_id = str(uuid.uuid4())
            save_session(session_id, cookies)
            
            logger.info(f'💾 Session saved with ID: {session_id}')
            
            # ✅ ENVIAR OTP AUTOMATICAMENTE
            logger.info(f'📧 Enviando OTP automaticamente para {email[:3]}***')
            try:
                otp_result = self.request_otp_email(session_id, email, device_id)
                logger.info(f'✅ OTP enviado com sucesso: {otp_result}')
            except Exception as otp_error:
                logger.error(f'❌ Erro ao enviar OTP: {otp_error}')
            
            logger.info('✅ Login iniciado com sucesso - OTP necessário')
            return {'needs_otp': True, 'session_id': session_id, 'message': 'OTP required. Use session_id to validate.'}
        
        # CENÁRIO 2: Tem errors → Credenciais inválidas ou outro erro real
        if 'errors' in data and data['errors']:
            error = data['errors'][0]
            error_msg = error.get('message', 'Unknown error')
            error_code = error.get('code', 'N/A')
            logger.error(f'❌ GraphQL error: {error_msg} (code: {error_code})')
            
            # Erros específicos
            if error_code == 'G0002' or error.get('statusCode') == 401:
                raise GandalfError('Invalid email or password')
            else:
                raise GandalfError(f'CanalPro error: {error_msg} (code: {error_code})')

        # CENÁRIO 3: Se chegou aqui, login_block é um dict válido (tem dados)
        is_safe_device = login_block.get('isSafeDevice', False)
        credentials = login_block.get('credentials')

        logger.info(f'📊 isSafeDevice: {is_safe_device}')
        logger.info(f'📊 Credentials present: {bool(credentials)}')

        # Se device é confiável E tem credentials, retornar imediatamente
        if is_safe_device and credentials:
            logger.info('✅ Login successful - device is safe, credentials received directly')
            return {'credentials': credentials}

        # Se chegou aqui, login_block existe mas credentials é null → precisa OTP
        if not credentials:
            logger.info('⚠️  loginWithOtp returned with null credentials - OTP required')
            # Salvar cookies e sessão para usar no request_otp_email
            cookies = {}
            for c in session.cookies:
                cookies[c.name] = c.value

            session_id = str(uuid.uuid4())
            save_session(session_id, cookies)
            
            logger.info(f'💾 Session saved with ID: {session_id}')
            
            # ✅ ENVIAR OTP AUTOMATICAMENTE
            logger.info(f'📧 Enviando OTP automaticamente para {email[:3]}***')
            try:
                otp_result = self.request_otp_email(session_id, email, device_id)
                logger.info(f'✅ OTP enviado com sucesso: {otp_result}')
            except Exception as otp_error:
                logger.error(f'❌ Erro ao enviar OTP: {otp_error}')
                # Continua mesmo com erro - usuário pode tentar reenviar manualmente
            
            return {'needs_otp': True, 'session_id': session_id, 'message': 'OTP required. Use session_id to validate.'}
        
        # Caso inesperado
        logger.warning(f'⚠️  Unexpected code path reached. Response: {data}')
        raise GandalfError('Unexpected login response state')

    def request_otp_email(self, session_id: str, email: str, device_id: str) -> Dict[str, Any]:
        """Solicita o envio do código OTP por email usando os cookies da sessão."""
        cookies = load_session(session_id)
        if not cookies:
            raise GandalfError('Session not found or expired')

        session = requests.Session()
        # 🔥 CORREÇÃO: Headers baseados no HAR real - com User-Agent do navegador
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0',
            'Accept': '*/*',
            'Accept-Language': 'pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3',
            'X-ClientID': 'CANALPRO_WEB',  # ✅ Presente no HAR
            'Disabled-Druid': 'true',  # ✅ Presente no HAR
            'Origin': 'https://canalpro.grupozap.com',
            'Referer': 'https://canalpro.grupozap.com/'
        }
        session.headers.update(headers)

        # carregar cookies no session
        for k, v in cookies.items():
            session.cookies.set(k, v)

        # Solicita o envio do OTP usando a mutation correta descoberta nos HARs
        body_request_otp = {
            'operationName': 'mfaGenerateOtpCode',
            'variables': {
                'value': email,  # ✅ CORRETO: 'value', não 'email'
                'channel': 'EMAIL',  # ✅ CORRETO: especificar canal EMAIL
                'template': 'CanalProNewDeviceOtpValidationPure'  # ✅ CORRETO: template específico
            },
            'query': (
                # 🔥 CORREÇÃO CRÍTICA: $template: String (sem !) - descoberto via HAR file
                'mutation mfaGenerateOtpCode($value: String!, $channel: MfaGenerateOtpCodeMessageChannelType!, $template: String) {\n'
                '  mfaGenerateOtpCode(value: $value, channel: $channel, template: $template) {\n'
                '    success\n'
                '  }\n'
                '}\n'
            )
        }

        logger = logging.getLogger('gandalf_service')
        logger.info(f'🎯 request_otp_email - Email que será enviado para Gandalf: {email}')
        logger.info(f'🎯 request_otp_email - SessionID: {session_id[:20]}...')
        logger.info(f'🎯 request_otp_email - DeviceID: {device_id}')
        logger.debug(f'Requesting OTP email for: {email[:3]}***@{email.split("@")[1] if "@" in email else "unknown"}')

        try:
            resp = session.post(self.base_url, json=body_request_otp, timeout=30)
        except Exception as e:
            raise GandalfError(f'mfaGenerateOtpCode request failed: {e}')

        logger.debug(f'OTP request response status: {resp.status_code}')

        if resp.status_code != 200:
            raise GandalfError(f'mfaGenerateOtpCode failed status={resp.status_code} body={resp.text}')

        try:
            data = resp.json()
            logger.info(f'OTP email request completed successfully - Response: {data}')
            
            # 🔍 DEBUG: Verificar se o email foi realmente enviado
            if data.get('data', {}).get('mfaGenerateOtpCode', {}).get('success'):
                logger.info('✅ Gandalf API confirmou: Email OTP ENVIADO com sucesso!')
            else:
                logger.warning(f'⚠️ Gandalf API não confirmou sucesso: {data}')
            
            return data
        except Exception:
            raise GandalfError('mfaGenerateOtpCode response is not valid json')

    def validate_login_with_session(self, session_id: str, email: str, device_id: str, otp: str, is_safe_device: bool = True) -> Dict[str, Any]:
        """Valida o OTP usando loginWithOtpValidate mutation.
        
        CRÍTICO: O código OTP é enviado no HEADER 'x-code-otp', NÃO no body GraphQL!
        O servidor valida o código no backend e retorna as credenciais se correto.
        """
        logger = logging.getLogger('gandalf_service')
        logger.info(f'🔐 validate_login_with_session - Email: {email[:3]}***@{email.split("@")[1] if "@" in email else "unknown"}')
        logger.info(f'🔐 validate_login_with_session - DeviceId: {device_id}')
        logger.info(f'🔐 validate_login_with_session - isSafeDevice: {is_safe_device}')
        logger.info(f'🔐 validate_login_with_session - OTP code: {otp[:2]}*** (enviado no header x-code-otp)')
        
        cookies = load_session(session_id)
        if not cookies:
            raise GandalfError('Session not found or expired')

        session = requests.Session()
        # 🔥 CORREÇÃO CRÍTICA: O código OTP vai no HEADER x-code-otp, não no body!
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0',
            'Accept': '*/*',
            'Accept-Language': 'pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3',
            'x-code-otp': otp,  # ⭐ AQUI! Código OTP vai no HEADER!
            'Disabled-Druid': 'true',
            'Origin': 'https://canalpro.grupozap.com',
            'Referer': 'https://canalpro.grupozap.com/'
        }
        session.headers.update(headers)
        
        logger.info(f'📤 Header x-code-otp: {otp[:2]}***')  # Log do header OTP

        # carregar cookies no session
        for k, v in cookies.items():
            session.cookies.set(k, v)

        # ✅ Mutation REAL descoberta nos HARs - loginWithOtpValidate
        body_validate = {
            'operationName': 'loginWithOtpValidate',
            'variables': {
                'email': email,
                'isSafeDevice': is_safe_device,  # Sempre True após validação do OTP
                'deviceId': device_id
                # ✅ Código OTP é enviado no HEADER 'x-code-otp', NÃO aqui no body!
            },
            'query': (
                'mutation loginWithOtpValidate($email: String!, $isSafeDevice: Boolean!, $deviceId: String!) {\n'
                '  loginWithOtpValidate(email: $email, isSafeDevice: $isSafeDevice, deviceId: $deviceId) {\n'
                '    credentials {\n'
                '      accessToken\n'
                '      refreshToken\n'
                '      expiresIn\n'
                '      origin\n'
                '    }\n'
                '  }\n'
                '}'
            )
        }

        logger.info(f'📤 Enviando loginWithOtpValidate para: {self.base_url}')
        logger.debug(f'📤 Body: {body_validate}')

        try:
            resp2 = session.post(self.base_url, json=body_validate, timeout=30)
        except Exception as e:
            logger.error(f'❌ loginWithOtpValidate request failed: {e}')
            raise GandalfError(f'loginWithOtpValidate request failed: {e}')

        logger.info(f'📥 Response status: {resp2.status_code}')
        logger.debug(f'📥 Response body: {resp2.text[:500]}...')

        if resp2.status_code != 200:
            logger.error(f'❌ loginWithOtpValidate failed with status {resp2.status_code}: {resp2.text}')
            raise GandalfError(f'loginWithOtpValidate failed status={resp2.status_code} body={resp2.text}')

        try:
            data2 = resp2.json()
        except Exception:
            logger.error('❌ loginWithOtpValidate response is not valid JSON')
            raise GandalfError('loginWithOtpValidate response is not valid json')

        # Verificar erros do GraphQL
        if 'errors' in data2 and data2['errors']:
            error = data2['errors'][0]
            error_msg = error.get('message', 'Unknown error')
            error_code = error.get('code', 'N/A')
            logger.error(f'❌ GraphQL error in loginWithOtpValidate: {error_msg} (code: {error_code})')
            raise GandalfError(f'OTP validation failed: {error_msg} (code: {error_code})')

        lw = data2.get('data', {}).get('loginWithOtpValidate') if isinstance(data2.get('data'), dict) else None
        
        if not lw:
            logger.error(f'❌ loginWithOtpValidate returned null. Response: {data2}')
            raise GandalfError('OTP validation returned null - check if OTP was validated correctly')
        
        if lw.get('credentials'):
            logger.info('✅ Login successful - credentials received!')
            # apagar session temporária
            delete_session(session_id)
            return {'credentials': lw['credentials']}

        logger.error(f'❌ No credentials in response. Response: {data2}')
        raise GandalfError('No credentials returned after OTP validation. Check OTP and deviceId.')

    def login_and_get_credentials(self, email: str, password: str, device_id: str, otp: Optional[str] = None) -> Dict[str, Any]:
        """
        Método unificado para fazer login e obter credenciais.
        
        Se OTP não for fornecido, faz o login inicial e retorna {'needs_otp': True, 'session_id': '...'} se necessário.
        Se OTP for fornecido, valida usando o session_id armazenado e retorna credenciais.
        """
        logger = logging.getLogger('gandalf_service')
        
        if otp:
            # Se temos OTP, precisamos encontrar o session_id correspondente
            # Como não temos session_id aqui, vamos fazer nova tentativa de login com OTP
            logger.info('Attempting login with OTP directly')
            
            # Para simplificar, vamos fazer o fluxo completo aqui
            # 1. Fazer login inicial para obter session
            result = self.start_login_session(email, password, device_id)
            
            if result.get('credentials'):
                # Login direto sem OTP
                return result
            
            if not result.get('needs_otp'):
                raise GandalfError('Unexpected result from login session')
            
            session_id = result.get('session_id')
            if not session_id:
                raise GandalfError('No session ID returned')
            
            # 2. Validar com OTP
            return self.validate_login_with_session(session_id, email, device_id, otp)
        else:
            # Sem OTP, fazer apenas login inicial
            return self.start_login_session(email, password, device_id)

    def refresh_access_token(self, refresh_token: str, device_id: str) -> Dict[str, Any]:
        """Renova o token de acesso usando o refresh token.
        
        Args:
            refresh_token: Token de refresh obtido no login
            device_id: ID do dispositivo usado no login original
            
        Returns:
            Dicionário com novas credenciais ou erro se refresh token inválido
        """
        logger = logging.getLogger('gandalf_service')
        logger.debug('Attempting to refresh access token')
        
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': self.user_agent,
            'x-device-id': device_id,
            'Origin': 'https://canalpro.grupozap.com',
            'Referer': 'https://canalpro.grupozap.com/'
        }

        body_refresh = {
            'operationName': 'refreshToken',
            'variables': {
                'refreshToken': refresh_token,
                'deviceId': device_id
            },
            'query': (
                'mutation refreshToken($refreshToken: String!, $deviceId: String!) {\n'
                '  refreshToken(refreshToken: $refreshToken, deviceId: $deviceId) {\n'
                '    accessToken\n'
                '    refreshToken\n'
                '    expiresIn\n'
                '    origin\n'
                '  }\n'
                '}'
            )
        }

        try:
            resp = requests.post(self.base_url, headers=headers, json=body_refresh, timeout=30)
            
            if resp.status_code != 200:
                logger.warning(f'Refresh token failed with status {resp.status_code}')
                raise GandalfError(f'refreshToken failed status={resp.status_code} body={resp.text}')

            data = resp.json()
            refresh_result = data.get('data', {}).get('refreshToken')
            
            if refresh_result and refresh_result.get('accessToken'):
                logger.info('Token refresh successful')
                return {'credentials': refresh_result}
            else:
                logger.warning('No access token in refresh response')
                raise GandalfError('No access token returned from refresh')
                
        except requests.exceptions.RequestException as e:
            logger.error(f'Refresh token request failed: {e}')
            raise GandalfError(f'refreshToken request failed: {e}')
        except Exception as e:
            logger.error(f'Unexpected error during token refresh: {e}')
            raise GandalfError(f'refreshToken unexpected error: {e}')


def update_listing(listing: Dict[str, Any], creds: Dict[str, Any]) -> Dict[str, Any]:
    """Atualiza um listing existente no Gandalf usando a mutation `updateListing`.

    Args:
        listing: dicionário com os campos do ListingInputType (deve conter `id` ou `externalId`)
        creds: cabeçalhos/credenciais retornados por get_valid_integration_headers

    Returns:
        JSON da resposta da API (parsed)
    """
    body = {
        'operationName': 'updateListing',
        'variables': {'listing': listing},
        'query': 'mutation updateListing($listing: ListingInputType) { updateListing(listing: $listing) { id errors { field message } } }'
    }
    headers = _headers_from_credentials(creds)
    logger = logging.getLogger('gandalf_service')
    logger.debug('update_listing request headers=%s body_keys=%s', {k: v for k, v in headers.items() if k.lower() != 'authorization'}, list(body.keys()))
    try:
        try:
            logger.debug('update_listing payload (truncated): %s', json.dumps(listing, default=str)[:4000])
        except Exception:
            logger.debug('update_listing payload (truncated): <non-serializable>')

        resp = requests.post(GANDALF_URL, headers=headers, json=body, timeout=30)
        logger.debug('update_listing response status=%s body_trunc=%s', resp.status_code, (resp.text or '')[:2000])
        if resp.status_code != 200:
            logger.error('update_listing non-200 response: %s', resp.text[:2000])
            raise GandalfError(f'update_listing failed status={resp.status_code} body={resp.text}')

        try:
            return resp.json()
        except Exception:
            logger.exception('update_listing response is not valid json; body=%s', resp.text[:2000])
            raise GandalfError(f'update_listing response is not valid json; body={resp.text}')
    except Exception as e:
        logger.exception('update_listing exception: %s', e)
        raise


def bulk_delete_listing(listing_ids: List[str], creds: Dict[str, Any]) -> Dict[str, Any]:
    """Exclui múltiplos listings do Gandalf usando a mutation `bulkDeleteListing`.

    Args:
        listing_ids: Lista de IDs dos listings a serem excluídos
        creds: Cabeçalhos/credenciais retornados por get_valid_integration_headers

    Returns:
        JSON da resposta da API (parsed)
    """
    body = {
        'operationName': 'bulkDeleteListing',
        'variables': {'listingIds': listing_ids},
        'query': 'mutation bulkDeleteListing($listingIds: [String]) {\n  bulkDeleteListing(listingIds: $listingIds) {\n    message\n  }\n}\n'
    }
    headers = _headers_from_credentials(creds)
    logger = logging.getLogger('gandalf_service')
    logger.debug('bulk_delete_listing request headers=%s listing_ids=%s', {k: v for k, v in headers.items() if k.lower() != 'authorization'}, listing_ids)

    # Try up to 3 times with exponential backoff
    for attempt in range(3):
        try:
            logger.info('bulk_delete_listing attempt %d/3', attempt + 1)
            resp = requests.post(GANDALF_URL, headers=headers, json=body, timeout=30)
            logger.info('bulk_delete_listing response status=%s body_trunc=%s', resp.status_code, (resp.text or '')[:2000])

            if resp.status_code != 200:
                logger.error('bulk_delete_listing non-200 response: %s', resp.text[:2000])
                # For server errors (5xx), retry
                if resp.status_code >= 500 and attempt < 2:
                    import time
                    wait_time = (attempt + 1) * 2  # 2s, 4s
                    logger.warning('bulk_delete_listing server error %d, retrying in %ds', resp.status_code, wait_time)
                    time.sleep(wait_time)
                    continue
                raise GandalfError(f'bulk_delete_listing failed status={resp.status_code} body={resp.text}')

            return resp.json()

        except requests.exceptions.ConnectionError as e:
            error_msg = str(e)
            logger.warning('bulk_delete_listing connection error on attempt %d: %s', attempt + 1, error_msg)
            # For connection errors, retry with backoff
            if attempt < 2:
                import time
                wait_time = (attempt + 1) * 3  # 3s, 6s
                logger.info('bulk_delete_listing connection error, retrying in %ds', wait_time)
                time.sleep(wait_time)
                continue
            else:
                logger.error('bulk_delete_listing failed after all retries due to connection error')
                raise GandalfError(f'bulk_delete_listing connection failed: {error_msg}')

        except requests.exceptions.Timeout as e:
            logger.warning('bulk_delete_listing timeout on attempt %d', attempt + 1)
            # For timeouts, retry with backoff
            if attempt < 2:
                import time
                wait_time = (attempt + 1) * 2  # 2s, 4s
                logger.info('bulk_delete_listing timeout, retrying in %ds', wait_time)
                time.sleep(wait_time)
                continue
            else:
                logger.error('bulk_delete_listing failed after all retries due to timeout')
                raise GandalfError(f'bulk_delete_listing timeout: {e}')

        except Exception as e:
            logger.exception('bulk_delete_listing exception on attempt %d: %s', attempt + 1, e)
            # For other exceptions, don't retry
            raise

    # If we get here, all retries failed
    raise GandalfError('bulk_delete_listing failed after all retry attempts')
