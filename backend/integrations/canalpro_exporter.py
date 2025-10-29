#!/usr/bin/env python3
"""
Exportação de Imóveis para Canal Pro (Grupo ZAP)

Este script automatiza o processo completo de exportação de imóveis do sistema Gandalf
para o Canal Pro do Grupo ZAP, seguindo a documentação técnica em docs/cadastro.md.

Funcionalidades:
- Login automático no Canal Pro
- Busca de imóveis pendentes no banco local
- Conversão de dados para formato GraphQL do Canal Pro
- Upload de imagens para o servidor ZAP
- Cadastro de imóveis via API GraphQL
- Atualização de status e logs no banco local
- Tratamento de erros e retry automático

Uso:
    python -m integrations.canalpro_exporter

Variáveis de ambiente necessárias:
- GANDALF_EMAIL: Email do usuário Canal Pro
- GANDALF_PASSWORD: Senha do usuário Canal Pro
- GANDALF_DEVICE_ID: ID do dispositivo para autenticação
"""

import os
import sys
import json
import time
import logging
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

# Adicionar o diretório backend ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from extensions import db
from models import Property, IntegrationCredentials
from integrations.gandalf_service import (
    GandalfService,
    GandalfError,
    upload_image,
    create_listing,
    update_listing,
    get_listing_by_external_id,
)
from integrations.session_store import save_session, load_session
from utils.integration_tokens import get_valid_integration_headers
from integrations.amenities_mapper import map_amenities_list


# Traduções das features internas para labels legíveis (usados no mapeamento CanalPro)
PROPERTY_FEATURE_TRANSLATIONS = {
    'pets_allowed': 'Aceita animais',
    'air_conditioning': 'Ar condicionado',
    'furnished': 'Mobiliado',
    'balcony': 'Varanda',
    'american_kitchen': 'Cozinha americana',
    'barbecue': 'Churrasqueira',
    'barbecue_grill': 'Churrasqueira',
    'fireplace': 'Lareira',
    'closet': 'Closet',
    'gourmet_balcony': 'Varanda gourmet',
    'office': 'Escritório',
    'service_area': 'Área de serviço',
    'maid_room': 'Dependência de empregados',
    'garden': 'Jardim',
    'terrace': 'Terraço',
    'storage': 'Depósito',
    'garage': 'Garagem',
    'covered_garage': 'Garagem coberta',
    'pool': 'Piscina privativa',
    'built_in_wardrobe': 'Armário embutido',
}

CONDO_FEATURE_TRANSLATIONS = {
    'gym': 'Academia',
    'barbecue': 'Churrasqueira',
    'cinema': 'Cinema',
    'gourmet_space': 'Espaço gourmet',
    'garden': 'Jardim',
    'pool': 'Piscina',
    'playground': 'Playground',
    'squash_court': 'Quadra de squash',
    'tennis_court': 'Quadra de tênis',
    'sports_court': 'Quadra poliesportiva',  # ✅ ID correto do frontend
    'multi_sport': 'Quadra poliesportiva',    # Alias legado
    'party_hall': 'Salão de festas',
    'game_room': 'Salão de jogos',
    'accessibility': 'Acesso para deficientes',
    'bike_rack': 'Bicicletário',
    'coworking': 'Coworking',
    'elevator': 'Elevador',
    'laundry': 'Lavanderia',
    'sauna': 'Sauna',
    'spa': 'Spa',
    'gated_community': 'Condomínio fechado',  # ✅ ID correto do frontend
    'closed_condo': 'Condomínio fechado',     # Alias legado
    'electronic_gate': 'Portão eletrônico',
    'security_24h': 'Portaria 24h',
}


def _ensure_list(value: Any) -> List[Any]:
    """Normaliza um campo para lista (aceita list, str JSON, str separada por vírgula)."""
    if value is None:
        return []

    if isinstance(value, list):
        return value

    if isinstance(value, tuple) or isinstance(value, set):
        return list(value)

    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        # tentar JSON primeiro
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return parsed
        except Exception:  # noqa: BLE001 - fallback para split simples
            pass
        return [item.strip() for item in text.split(',') if item.strip()]

    return [value]


def _split_custom_features(value: Any) -> List[str]:
    """Divide campos personalizados (string ou lista) em valores individuais."""
    if value is None:
        return []

    if isinstance(value, str):
        return [item.strip() for item in value.split(',') if item.strip()]

    items: List[str] = []
    if isinstance(value, (list, tuple, set)):
        for entry in value:
            if isinstance(entry, str):
                items.extend(_split_custom_features(entry))
            elif entry is not None:
                items.append(str(entry).strip())
        return [item for item in items if item]

    return [str(value).strip()]


def _translate_feature_values(raw_values: Any, translations: Dict[str, str]) -> List[str]:
    """Converte IDs internos em labels amigáveis utilizando o dicionário fornecido."""
    labels: List[str] = []
    for value in _ensure_list(raw_values):
        if value is None:
            continue
        key = str(value).strip()
        if not key:
            continue
        normalized = key.lower()
        label = translations.get(normalized)
        if not label:
            label = translations.get(key)
        if not label:
            label = ' '.join(part.capitalize() for part in key.replace('_', ' ').replace('-', ' ').split())
        if label:
            labels.append(label)
    return labels


def _dedupe_preserve_order(values: List[Any]) -> List[Any]:
    seen = set()
    deduped: List[Any] = []
    for item in values:
        if item is None:
            continue
        key = str(item).strip()
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(item if isinstance(item, str) else key)
    return deduped


class CanalProExporter:
    """Exportador de imóveis para Canal Pro"""

    def __init__(self, tenant_id: int = 1, user_id: int = None):
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.logger = self._setup_logger()
        self.service = GandalfService()
        self.credentials = None
        self.session_id = None

    def _classify_error(self, message: str) -> str:
        """Classifica erros conhecidos em códigos estáveis para o frontend.
        Retorna um código string como 'PLAN_HIGHLIGHT_NOT_ALLOWED' ou 'EXPORT_ERROR'.
        """
        if not isinstance(message, str):
            return 'EXPORT_ERROR'
        msg = message.lower()
        highlight_markers = [
            'plano não permite o tipo de destaque',
            'tipo de destaque requerido',
            'publicationtype',
            'publication type',
            'destaque não permitido'
        ]
        if any(m in msg for m in highlight_markers):
            return 'PLAN_HIGHLIGHT_NOT_ALLOWED'
        return 'EXPORT_ERROR'

    def _setup_logger(self) -> logging.Logger:
        """Configura o logger para o exportador"""
        logger = logging.getLogger('canalpro_exporter')
        logger.setLevel(logging.INFO)

        # Handler para arquivo
        file_handler = logging.FileHandler('canalpro_export.log')
        file_handler.setLevel(logging.INFO)

        # Handler para console
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)

        # Formato
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)

        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

        return logger

    def _format_delivery_date(self, delivery_at_year: Optional[str], delivered_at_datetime: Optional[Any]) -> str:
        """
        Converte ano de entrega para formato ISO timestamp compatível com Canal Pro.
        
        O Canal Pro rejeita timestamps inválidos com erro:
        'invalid message body: Failed to parse timestamp: "2012"'
        
        Args:
            delivery_at_year: Ano como string (ex: "2012") ou None
            delivered_at_datetime: Data completa (datetime object) ou None
        
        Returns:
            String no formato ISO 8601 (ex: "2012-01-01T00:00:00.000Z")
        
        Examples:
            >>> _format_delivery_date("2012", None)
            "2012-01-01T00:00:00.000Z"
            >>> _format_delivery_date(None, datetime(2015, 6, 15))
            "2015-06-15T00:00:00.000Z"
        """
        from datetime import datetime
        
        # Priorizar delivered_at_datetime se disponível e válido
        if delivered_at_datetime:
            try:
                if isinstance(delivered_at_datetime, datetime):
                    return delivered_at_datetime.strftime("%Y-%m-%dT%H:%M:%S.000Z")
                elif isinstance(delivered_at_datetime, str):
                    # Tentar parsear string de data
                    parsed = datetime.fromisoformat(delivered_at_datetime.replace('Z', '+00:00'))
                    return parsed.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            except (ValueError, AttributeError) as e:
                self.logger.warning(f"Erro ao processar delivered_at_datetime: {e}")
        
        # Converter delivery_at_year (string com ano) para timestamp ISO
        if delivery_at_year and isinstance(delivery_at_year, str):
            year_str = delivery_at_year.strip()
            if year_str:
                try:
                    year = int(year_str)
                    # Validação: ano deve estar em range razoável
                    if 1900 <= year <= 2100:
                        return f"{year}-01-01T00:00:00.000Z"
                    else:
                        self.logger.warning(f"Ano fora do range válido (1900-2100): {year}")
                except (ValueError, AttributeError) as e:
                    self.logger.warning(f"Erro ao converter ano '{year_str}' para timestamp: {e}")
        
        # Fallback padrão: ano 2010
        self.logger.debug("Usando data de entrega padrão: 2010-01-01")
        return "2010-01-01T00:00:00.000Z"

    def authenticate(self, app_context=None) -> bool:
        """Realiza autenticação no Canal Pro usando o sistema de credenciais existente"""
        try:
            self.logger.info("Obtendo credenciais do sistema de integração...")

            # Usar contexto fornecido ou criar um novo
            if app_context:
                with app_context:
                    try:
                        self.credentials = get_valid_integration_headers(
                            tenant_id=self.tenant_id,
                            provider='gandalf'
                        )
                        self.logger.info("✅ Credenciais válidas obtidas")
                        return True
                    except RuntimeError as e:
                        self.logger.warning(f"Credenciais expiradas/inválidas: {e}")
                        self.logger.info("Tentando reautenticação...")
                        return self._re_authenticate(app_context)
            else:
                # Tentar obter contexto atual ou criar um novo
                from app import create_app
                app = create_app()
                with app.app_context():
                    try:
                        self.credentials = get_valid_integration_headers(
                            tenant_id=self.tenant_id,
                            provider='gandalf'
                        )
                        self.logger.info("✅ Credenciais válidas obtidas")
                        return True
                    except RuntimeError as e:
                        self.logger.warning(f"Credenciais expiradas/inválidas: {e}")
                        self.logger.info("Tentando reautenticação...")
                        return self._re_authenticate(app.app_context())

        except RuntimeError as e:
            self.logger.error(f"❌ Erro de autenticação: {e}")
            return False
        except Exception as e:
            self.logger.error(f"❌ Erro inesperado ao obter credenciais: {e}")
            self.logger.error(f"Tipo do erro: {type(e).__name__}")
            return False

    def _re_authenticate(self, app_context) -> bool:
        """Tenta reautenticar quando as credenciais estão expiradas"""
        try:
            self.logger.info("🔄 Iniciando reautenticação...")

            with app_context:
                from models import IntegrationCredentials

                # Buscar credenciais no banco
                cred = IntegrationCredentials.query.filter_by(
                    tenant_id=self.tenant_id,
                    provider='gandalf'
                ).first()

                if not cred:
                    self.logger.error("❌ Nenhuma credencial encontrada para reautenticação")
                    return False

                # Verificar metadados disponíveis
                metadata = cred.metadata_json or {}
                self.logger.info(f"📋 Metadados disponíveis: {list(metadata.keys())}")

                # Verificar se temos informações suficientes
                device_id = metadata.get('device_id')
                if not device_id:
                    self.logger.error("❌ Device ID não encontrado nos metadados")
                    self.logger.error("💡 O usuário precisa reconfigurar as credenciais manualmente")
                    return False

                # Verificar se temos email/senha (não temos, pois não são armazenados por segurança)
                self.logger.warning("⚠️ Email e senha não estão armazenados por segurança")
                self.logger.warning("💡 Reautenticação automática não é possível")
                self.logger.warning("💡 O usuário deve usar /integrations/canalpro/setup para renovar credenciais")

                return False

        except Exception as e:
            self.logger.error(f"❌ Erro durante tentativa de reautenticação: {e}")
            return False

    def get_pending_properties(self, app_context=None) -> List[Property]:
        """Busca imóveis pendentes de exportação"""
        try:
            # Usar contexto fornecido ou criar um novo
            if app_context:
                with app_context:
                    # Buscar imóveis que ainda não foram exportados (remote_id é NULL)
                    # e que estão ativos (status ACTIVE ou active)
                    properties = Property.query.filter(
                        Property.tenant_id == self.tenant_id,
                        Property.remote_id.is_(None),
                        Property.status.in_(['ACTIVE', 'active', 'pending'])
                    ).limit(10).all()
            else:
                from app import create_app
                app = create_app()
                with app.app_context():
                    # Buscar imóveis que ainda não foram exportados (remote_id é NULL)
                    # e que estão ativos (status ACTIVE ou active)
                    properties = Property.query.filter(
                        Property.tenant_id == self.tenant_id,
                        Property.remote_id.is_(None),
                        Property.status.in_(['ACTIVE', 'active', 'pending'])
                    ).limit(10).all()

            self.logger.info(f"Encontrados {len(properties)} imóveis pendentes de exportação")
            return properties

        except Exception as e:
            self.logger.error(f"Erro ao buscar imóveis pendentes: {e}")
            return []

    def _needs_building_info(self, property_type: str) -> bool:
        """Determina se o tipo de imóvel precisa de informações de prédio"""
        building_types = [
            'APARTMENT',              # Apartamento
            'PENTHOUSE',              # Cobertura
            'LOFT',                   # Loft
            'STUDIO',                 # Studio
            'FLAT',                   # Flat
            'KITNET'                  # Kitnet/Conjugado
        ]
        return property_type in building_types

    def convert_property_to_canalpro_format(self, property: Property) -> Dict[str, Any]:
        """Converte dados do imóvel para formato Canal Pro"""

        # Endereço
        original_address = {
            "zipCode": property.address_zip or "",
            "street": property.address_street or "",
            "city": property.address_city or "",
            "state": property.address_state or "",
            "neighborhood": property.address_neighborhood or "",
            "streetNumber": property.address_number or "",
            "complement": property.address_complement or "",
            "name": property.address_name,
            "point": {
                "lat": property.latitude,
                "lon": property.longitude
            } if property.latitude and property.longitude else None,
            "locationId": property.address_location_id,
            "precision": property.address_precision or "ROOFTOP"
        }

        # Preços
        pricing_infos = []
        if property.price:
            pricing_infos.append({
                "businessType": "SALE",
                "price": float(property.price),
                "monthlyCondoFee": float(property.condo_fee) if property.condo_fee else 0,
                "yearlyIptu": float(property.iptu) if property.iptu else 0,
                "iptu": float(property.iptu) if property.iptu else 0,
                "iptuPeriod": property.iptu_period or "YEARLY",
                "rentalInfo": None
            })

        if property.price_rent:
            pricing_infos.append({
                "businessType": "RENTAL",
                "price": float(property.price_rent),
                "monthlyCondoFee": float(property.condo_fee) if property.condo_fee else 0,
                "yearlyIptu": 0,
                "iptu": 0,
                "iptuPeriod": "YEARLY",
                "rentalInfo": {
                    "period": "MONTHLY",
                    "warranties": [],
                    "monthlyRentalTotalPrice": float(property.price_rent)
                }
            })

        # Tipo do imóvel
        # Valores OFICIAIS da API Gandalf (obtidos via query unitTypes)
        # Ref: https://gandalf-api.grupozap.com/graphql
        type_mapping = {
            # Apartamentos
            'APARTMENT': ['APARTMENT'],
            'PENTHOUSE': ['PENTHOUSE'],
            'FLAT': ['FLAT'],
            'KITNET': ['KITNET'],
            'COBERTURA': ['PENTHOUSE'],  # Cobertura = Penthouse
            
            # Casas
            'HOUSE': ['HOME'],  # Casa simples = HOME
            'CASA_CONDOMINIO': ['CONDOMINIUM'],  # Casa em condomínio = CONDOMINIUM
            'CASA_VILA': ['HOME'],  # Casa de vila = HOME
            'SOBRADO': ['TWO_STORY_HOUSE'],  # Sobrado

            # Terrenos
            'LAND': ['RESIDENTIAL_ALLOTMENT_LAND'],  # Terreno residencial
            'LOTE_TERRENO': ['RESIDENTIAL_ALLOTMENT_LAND'],  # Lote/Terreno residencial
            'LOTE_COMERCIAL': ['COMMERCIAL_ALLOTMENT_LAND'],  # Lote comercial

            # Comerciais
            'COMMERCIAL': ['COMMERCIAL_PROPERTY'],
            'SALA_COMERCIAL': ['OFFICE'],  # Sala/Conjunto = OFFICE
            'LOJA': ['BUSINESS'],  # Loja/Ponto comercial = BUSINESS
            'GALPAO': ['SHED_DEPOSIT_WAREHOUSE'],  # Galpão/Depósito = SHED_DEPOSIT_WAREHOUSE
            'PREDIO_COMERCIAL': ['COMMERCIAL_BUILDING'],  # Prédio comercial inteiro
            'CONSULTORIO': ['CLINIC'],  # Consultório = CLINIC

            # Fazendas e Rurais
            'FARM': ['FARM'],
            'FAZENDA': ['FARM'],  # Fazenda/Sítio
            'CHACARA': ['COUNTRY_HOUSE'],  # Chácara = COUNTRY_HOUSE
            
            # Prédios inteiros
            'PREDIO_RESIDENCIAL': ['RESIDENTIAL_BUILDING'],  # Edifício residencial
            'PREDIO_INTEIRO': ['BUILDING'],  # Prédio inteiro
        }

        # 🎯 MAPEAMENTO DE CATEGORIAS (baseado em análise de payloads HAR reais)
        # Define unitTypes E unitSubTypes com base em property_type + category
        category_mapping = {
            # Casa em Condomínio
            ('CASA_CONDOMINIO', 'Térrea'): {
                'unitTypes': ['HOME'],
                'unitSubTypes': ['CONDOMINIUM', 'SINGLE_STOREY_HOUSE']
            },
            ('CASA_CONDOMINIO', 'Sobrado'): {
                'unitTypes': ['HOME'],
                'unitSubTypes': ['CONDOMINIUM', 'TWO_STORY_HOUSE']
            },
            ('CASA_CONDOMINIO', 'Padrão'): {
                'unitTypes': ['HOME'],
                'unitSubTypes': ['CONDOMINIUM']
            },
            
            # Casa
            ('HOUSE', 'Térrea'): {
                'unitTypes': ['HOME'],
                'unitSubTypes': ['SINGLE_STOREY_HOUSE']
            },
            ('HOUSE', 'Sobrado'): {
                'unitTypes': ['HOME'],
                'unitSubTypes': ['TWO_STORY_HOUSE']
            },
            ('HOUSE', 'Kitnet/Conjugado'): {
                'unitTypes': ['HOME'],
                'unitSubTypes': ['KITNET']
            },
            ('HOUSE', 'Padrão'): {
                'unitTypes': ['HOME'],
                'unitSubTypes': []
            },
            
            # Apartamento
            ('APARTMENT', 'Padrão'): {
                'unitTypes': ['APARTMENT'],
                'unitSubTypes': []
            },
            ('APARTMENT', 'Studio'): {
                'unitTypes': ['APARTMENT'],
                'unitSubTypes': ['STUDIO']
            },
            ('APARTMENT', 'Duplex'): {
                'unitTypes': ['APARTMENT'],
                'unitSubTypes': ['DUPLEX']
            },
            ('APARTMENT', 'Cobertura'): {
                'unitTypes': ['APARTMENT'],
                'unitSubTypes': ['PENTHOUSE']
            },
        }
        
        # Tentar pegar mapeamento específico com categoria
        property_type = property.property_type if hasattr(property, 'property_type') else None
        category = property.category if hasattr(property, 'category') else None
        
        mapping_key = (property_type, category)
        if mapping_key in category_mapping:
            # ✅ Encontrou mapeamento específico com categoria
            config = category_mapping[mapping_key]
            unit_types = config['unitTypes']
            unit_sub_types = config['unitSubTypes']
        else:
            # 🔄 Fallback: usar apenas type_mapping (sem categoria)
            mapped_unit_types = type_mapping.get(property.property_type)
            if mapped_unit_types:
                unit_types = mapped_unit_types
            elif property.unit_types and len(property.unit_types) > 0:
                # Respeita unit_types customizados apenas quando não temos mapeamento definido
                # E quando o array não está vazio
                unit_types = property.unit_types if isinstance(property.unit_types, list) else [property.unit_types]
            else:
                unit_types = ['APARTMENT']
            
            # 🎯 FIX: Usar unit_subtypes do banco quando disponível (importado do CanalPro)
            if hasattr(property, 'unit_subtypes') and property.unit_subtypes:
                if isinstance(property.unit_subtypes, list) and len(property.unit_subtypes) > 0:
                    unit_sub_types = property.unit_subtypes
                else:
                    unit_sub_types = []
            else:
                # Sem categoria específica e sem dados no banco, unitSubTypes fica vazio
                unit_sub_types = []

        # Amenidades - consolidar recursos internos e mapear para códigos Canal Pro
        consolidated_amenities: List[str] = []
        
        # Traduzir features do imóvel
        property_features_translated = _translate_feature_values(property.features, PROPERTY_FEATURE_TRANSLATIONS)
        if property_features_translated:
            consolidated_amenities.extend(property_features_translated)
        
        # ✅ PRIORIDADE: Features do EMPREENDIMENTO vinculado (tabela dedicada)
        if hasattr(property, 'empreendimento') and property.empreendimento:
            emp_caracteristicas = property.empreendimento.caracteristicas
            if emp_caracteristicas and isinstance(emp_caracteristicas, list):
                emp_features_translated = _translate_feature_values(emp_caracteristicas, CONDO_FEATURE_TRANSLATIONS)
                if emp_features_translated:
                    consolidated_amenities.extend(emp_features_translated)
        
        # ✅ FALLBACK: Traduzir features do condomínio (campo legado property.condo_features)
        condo_features_translated = _translate_feature_values(property.condo_features, CONDO_FEATURE_TRANSLATIONS)
        if condo_features_translated:
            consolidated_amenities.extend(condo_features_translated)
        
        # Custom features
        consolidated_amenities.extend(_split_custom_features(getattr(property, 'custom_features', None)))
        consolidated_amenities.extend(_split_custom_features(getattr(property, 'custom_condo_features', None)))

        existing_amenities = _ensure_list(property.amenities)
        consolidated_amenities.extend(existing_amenities)
        consolidated_amenities = _dedupe_preserve_order(consolidated_amenities)
        

        amenities: List[str] = []
        if consolidated_amenities:
            try:
                creds = getattr(self, 'credentials', {})
                if creds:
                    amenities = map_amenities_list(consolidated_amenities, creds)
                    self.logger.info(
                        "Mapeadas %s amenities (de %s itens consolidados) para o Canal Pro",
                        len(amenities),
                        len(consolidated_amenities)
                    )
                else:
                    self.logger.warning("Credenciais não disponíveis para mapeamento de amenities; usando rótulos consolidados")
                    amenities = consolidated_amenities
            except Exception as exc:  # noqa: BLE001
                self.logger.error(f"Erro ao mapear amenities consolidadas: {exc}")
                amenities = consolidated_amenities

            # Garantir que códigos existentes não sejam perdidos
            for code in existing_amenities:
                if isinstance(code, str) and code.strip():
                    normalized_code = code.strip()
                    if normalized_code not in amenities:
                        amenities.append(normalized_code)

            amenities = _dedupe_preserve_order(amenities)
        # Imagens
        images = []
        if property.image_urls:
            if isinstance(property.image_urls, list):
                for url in property.image_urls:
                    images.append({"imageUrl": url})
            elif isinstance(property.image_urls, str):
                try:
                    urls = json.loads(property.image_urls)
                    for url in urls:
                        images.append({"imageUrl": url})
                except:
                    pass

        # Verificar se o tipo de imóvel precisa de informações de prédio
        needs_building = self._needs_building_info(property.property_type or '')
        
        # Publication type normalization (aliases to valores oficiais CanalPro)
        pub = getattr(property, 'publication_type', None)
        if isinstance(pub, str) and pub:
            normalized_pub = pub.strip().upper().replace(' ', '_')
            alias_map = {
                # Mapeamentos oficiais
                'PADRAO': 'STANDARD',
                'PADRÃO': 'STANDARD',
                'DESTAQUE_PADRAO': 'PREMIUM',
                'DESTAQUE_PADRÃO': 'PREMIUM',
                'DESTAQUE': 'PREMIUM',
                'SUPER_DESTAQUE': 'SUPER_PREMIUM',
                'SUPER-DESTAQUE': 'SUPER_PREMIUM',
                'EXCLUSIVO': 'PREMIERE_1',
                'SUPERIOR': 'PREMIERE_2',
                'TRIPLO': 'TRIPLE',
                # Aliases legados usados anteriormente
                'ALTO_PADRAO': 'PREMIUM',
                'ALTO_PADRÃO': 'PREMIUM',
                'HIGH': 'PREMIUM',
                'LUXO': 'PREMIERE_1',
                'ECONOMICO': 'STANDARD',
                'ECONÔMICO': 'STANDARD',
                'HIGHLIGHT': 'PREMIUM',
                'SUPER_HIGHLIGHT': 'SUPER_PREMIUM',
                'EXCLUSIVE': 'PREMIERE_1',
                'PREMIERE1': 'PREMIERE_1',
                'PREMIERE2': 'PREMIERE_2'
            }
            normalized_pub = alias_map.get(normalized_pub, normalized_pub)
            valid_pub = {'STANDARD', 'PREMIUM', 'SUPER_PREMIUM', 'PREMIERE_1', 'PREMIERE_2', 'TRIPLE'}
            publication_type_value = normalized_pub if normalized_pub in valid_pub else 'STANDARD'
        else:
            publication_type_value = 'STANDARD'
        
        # Estrutura final compatível com HAR
        listing_data = {
            "displayAddressGeolocation": {
                "lat": property.display_latitude or property.latitude,
                "lon": property.display_longitude or property.longitude
            } if (property.display_latitude or property.latitude) else {"lat": -16.735336, "lon": -49.35024},

            "displayAddressType": "ALL",
            "bathrooms": [property.bathrooms] if property.bathrooms else [1],
            "bedrooms": [property.bedrooms] if property.bedrooms else [1],
            "suites": [property.suites] if property.suites else [0],
            "totalAreas": property.total_area if property.total_area else (property.usable_area or 50),  # Número, não array
            "unitTypes": unit_types,
            "unitSubTypes": unit_sub_types,  # ✅ Agora usa valor do category_mapping
            "usableAreas": property.usable_area if property.usable_area else 50,  # Número, não array
            "parkingSpaces": [property.parking_spaces] if property.parking_spaces else [0],
            "amenities": amenities,
            "contractType": "REAL_ESTATE",
            "images": images,
            "pricingInfos": pricing_infos,
            "description": property.description or f"Imóvel localizado em {property.address_city}",
            "title": property.title,
            "externalId": property.property_code or property.external_id,
            "usageTypes": ["RESIDENTIAL"],  # Array, não string
            "originalAddress": original_address,
            "publicationType": publication_type_value,
            "listingType": property.listing_type or "USED",
            "portal": "GRUPOZAP",
            "portals": ["ZAP", "VIVAREAL", "OLX"],
            "showPrice": True,
            "status": "ACTIVE",
            "videos": property.videos or []
        }
        
        # Adicionar campos de prédio apenas se aplicável
        if needs_building:
            # Buscar dados do empreendimento vinculado (tabela dedicada)
            emp = property.empreendimento if hasattr(property, 'empreendimento') else None
            
            listing_data["unitFloor"] = property.unit_floor or 1
            listing_data["unitsOnTheFloor"] = property.units_on_floor or 4
            
            # ✅ DADOS DO EMPREENDIMENTO: andares, torres/blocos, ano de construção
            if emp:
                listing_data["floors"] = [emp.andares] if emp.andares else [1]
                listing_data["buildings"] = emp.blocos or 1
                # Converter ano de entrega (formato YYYY-MM ou YYYY)
                if emp.entrega_em:
                    ano = emp.entrega_em[:4] if len(emp.entrega_em) >= 4 else emp.entrega_em
                    listing_data["deliveredAt"] = self._format_delivery_date(ano, None)
                else:
                    listing_data["deliveredAt"] = self._format_delivery_date(None, getattr(property, 'delivered_at', None))
            else:
                # Fallback para campos legados (caso não tenha empreendimento vinculado)
                listing_data["floors"] = [property.floors] if property.floors else [1]
                listing_data["buildings"] = property.buildings or 1
                listing_data["deliveredAt"] = self._format_delivery_date(
                    getattr(property, 'delivery_at', None),
                    getattr(property, 'delivered_at', None)
                )

        return listing_data

    def upload_property_images(self, property: Property) -> List[str]:
        """Faz upload das imagens do imóvel e retorna URLs"""
        uploaded_urls = []

        if not property.image_urls:
            return uploaded_urls

        # Credenciais para upload (usando sistema existente)
        creds = self.credentials.copy()
        # Adicionar valores padrão se não estiver nos metadados
        creds.setdefault('publisher_id', os.environ.get('GANDALF_PUBLISHER_ID', '119007'))
        creds.setdefault('odin_id', os.environ.get('GANDALF_ODIN_ID', '49262cbf-1279-1804-c045-8f950d084c70'))
        creds.setdefault('contract_id', os.environ.get('GANDALF_CONTRACT_ID', '517f13eb-6730-4b6b-3c92-9e657428a0a0'))
        creds.setdefault('client_id', 'CANALPRO_WEB')
        creds.setdefault('company', 'ZAP_OLX')
        creds.setdefault('app_version', 'v2.305.3')
        creds.setdefault('publisher_contract_type', 'IMC')

        # Processar imagens
        image_urls = []
        if isinstance(property.image_urls, list):
            image_urls = property.image_urls
        elif isinstance(property.image_urls, str):
            try:
                image_urls = json.loads(property.image_urls)
            except:
                image_urls = []

        for i, image_url in enumerate(image_urls[:10]):  # Máximo 10 imagens
            try:
                self.logger.info(f"Baixando imagem {i+1}: {image_url}")

                # Baixar imagem
                response = requests.get(image_url, timeout=30)
                if response.status_code != 200:
                    self.logger.warning(f"Falha ao baixar imagem {image_url}")
                    continue

                image_data = response.content
                filename = f"property_{property.id}_image_{i+1}.jpg"

                # Upload para Canal Pro
                self.logger.info(f"Fazendo upload da imagem {filename}")
                result = upload_image(image_data, filename, creds)

                if 'data' in result and 'uploadImage' in result['data']:
                    uploaded_url = result['data']['uploadImage']['urlImage']
                    uploaded_urls.append(uploaded_url)
                    self.logger.info(f"Upload bem-sucedido: {uploaded_url}")
                else:
                    self.logger.error(f"Falha no upload da imagem: {result}")

            except Exception as e:
                self.logger.error(f"Erro no upload da imagem {image_url}: {e}")
                continue

        return uploaded_urls

    def export_property(self, property: Property, app_context=None, is_refresh=False) -> bool:
        """Exporta um imóvel específico para o Canal Pro
        
        Args:
            property: Objeto Property a ser exportado
            app_context: Contexto da aplicação Flask (opcional)
            is_refresh: Se é uma operação de refresh (ignora verificações de duplicata)
        """
        try:
            self.logger.info(f"Iniciando exportação do imóvel {property.property_code or property.external_id}")

            # ✅ VERIFICAÇÃO PARA EVITAR DUPLICATAS (exceto durante refresh)
            if not is_refresh and property.status == 'exported' and getattr(property, 'remote_id', None):
                self.logger.info(f"Imóvel {property.property_code or property.external_id} já foi exportado (ID: {property.remote_id}). Pulando exportação...")
                return True  # Considera como sucesso para não quebrar o fluxo

            # 1. Converter dados
            listing_data = self.convert_property_to_canalpro_format(property)

            # 2. Upload de imagens (se necessário)
            if not listing_data['images']:
                self.logger.info("Fazendo upload das imagens...")
                uploaded_urls = self.upload_property_images(property)
                listing_data['images'] = [{"imageUrl": url} for url in uploaded_urls]

            # 3. Credenciais para cadastro (usando sistema existente)
            creds = self.credentials.copy()
            # Adicionar valores padrão se não estiverem nos metadados
            creds.setdefault('publisher_id', os.environ.get('GANDALF_PUBLISHER_ID', '119007'))
            creds.setdefault('odin_id', os.environ.get('GANDALF_ODIN_ID', '49262cbf-1279-1804-c045-8f950d084c70'))
            creds.setdefault('contract_id', os.environ.get('GANDALF_CONTRACT_ID', '517f13eb-6730-4b6b-3c92-9e657428a0a0'))
            creds.setdefault('client_id', 'CANALPRO_WEB')
            creds.setdefault('company', 'ZAP_OLX')
            creds.setdefault('app_version', 'v2.305.3')
            creds.setdefault('publisher_contract_type', 'IMC')

            # 4. Atualizar ou Criar imóvel no Canal Pro
            self.logger.info("Enviando dados para Canal Pro (create/update)...")

            result = None

            # Se já temos remote_id no banco, tentamos UPDATE
            remote_id = getattr(property, 'remote_id', None)
            if remote_id:
                try:
                    listing_payload = dict(listing_data)
                    listing_payload['id'] = str(remote_id)
                    result = update_listing(listing_payload, creds)
                    # Se o UPDATE falhou (tem erros), resetar result para None
                    if isinstance(result, dict) and result.get('errors'):
                        self.logger.warning(f"UPDATE falhou para remote_id {remote_id}, tentando CREATE")
                        result = None
                except Exception as e:
                    self.logger.warning(f"Falha ao atualizar listing {remote_id}, fallback para tentativa de criação se necessário: {e}")
                    result = None

            # Se não temos resultado de update, tentamos encontrar por externalId e atualizar
            if result is None and listing_data.get('externalId'):
                try:
                    external_id_str = str(listing_data.get('externalId')) if listing_data.get('externalId') else None
                    if external_id_str:
                        found = get_listing_by_external_id(creds, external_id_str)
                        if isinstance(found, list) and len(found) > 0:
                            found_id = found[0].get('id')
                            if found_id:
                                self.logger.info(f"Encontrado listing remoto por externalId: {found_id}, tentando UPDATE")
                                listing_payload = dict(listing_data)
                                listing_payload['id'] = str(found_id)
                                result = update_listing(listing_payload, creds)
                                # persistir remote_id
                                property.remote_id = found_id
                        else:
                            self.logger.info("Nenhum listing remoto encontrado com externalId; seguirá para criação")
                    else:
                        self.logger.warning("externalId não definido para busca de listing remoto")
                except Exception as e:
                    self.logger.warning(f"Erro ao buscar listing por externalId: {e}")

            # Finalmente, se ainda não obtivemos um resultado de update, criar listing
            if result is None:
                try:
                    result = create_listing(listing_data, creds)
                except Exception as e:
                    self.logger.error(f"Erro ao criar listing: {e}")
                    result = {'error': str(e)}

            # 5. Verificar resultado (suporta tanto createListing quanto updateListing responses)
            try:
                # Handle GraphQL errors (status 200 but with errors array)
                if isinstance(result, dict) and result.get('errors'):
                    errors = result.get('errors', [])
                    error_messages = [e.get('message', str(e)) for e in errors]
                    raise Exception(f'Gandalf GraphQL errors: {error_messages}')
                
                # Caso resposta do updateListing
                if 'data' in result and 'updateListing' in result['data']:
                    update_block = result['data']['updateListing']
                    if update_block is None:
                        raise Exception('updateListing returned null - likely server error')
                    canalpro_id = update_block.get('id')
                    errors = update_block.get('errors', [])
                # Caso resposta do createListing
                elif 'data' in result and 'createListing' in result['data']:
                    create_block = result['data']['createListing']
                    if create_block is None:
                        raise Exception('createListing returned null - likely server error')
                    canalpro_id = create_block.get('id')
                    errors = create_block.get('errors', [])
                # Caso resposta de erro simplificada
                elif isinstance(result, dict) and result.get('error'):
                    raise Exception(result.get('error'))
                else:
                    # Estrutura inesperada
                    raise Exception(f'Resposta inesperada: {result}')

                if errors:
                    self.logger.error(f"Erros na operação (create/update): {errors}")
                    property.status = 'error'
                    property.error = str(errors)
                else:
                    self.logger.info(f"Operação create/update bem-sucedida. ID remoto: {canalpro_id}")
                    property.status = 'exported'
                    property.remote_id = canalpro_id
                    property.error = None

                property.updated_at = datetime.utcnow()

                # Commit com contexto da aplicação
                # IMPORTANTE: merge e commit devem estar no mesmo contexto
                if app_context:
                    with app_context:
                        # Garantir que o objeto está na sessão antes do commit
                        property = db.session.merge(property)
                        self.logger.info(f"[DEBUG] Antes do commit: id={property.id}, external_id={property.external_id}, remote_id={property.remote_id}, status={property.status}")
                        db.session.commit()
                        self.logger.info(f"[DEBUG] Após commit: id={property.id}, external_id={property.external_id}, remote_id={property.remote_id}, status={property.status}")
                else:
                    from app import create_app
                    app = create_app()
                    with app.app_context():
                        # Garantir que o objeto está na sessão antes do commit
                        property = db.session.merge(property)
                        self.logger.info(f"[DEBUG] Antes do commit: id={property.id}, external_id={property.external_id}, remote_id={property.remote_id}, status={property.status}")
                        db.session.commit()
                        self.logger.info(f"[DEBUG] Após commit: id={property.id}, external_id={property.external_id}, remote_id={property.remote_id}, status={property.status}")

                return not bool(errors)

            except Exception as e:
                error_msg = str(e)
                self.logger.error(f"Falha ao processar resposta de create/update: {error_msg}")
                property.status = 'error'
                property.error = error_msg
                property.updated_at = datetime.utcnow()

                # Commit com contexto da aplicação
                if app_context:
                    with app_context:
                        db.session.commit()
                else:
                    from app import create_app
                    app = create_app()
                    with app.app_context():
                        db.session.commit()

                return False

        except GandalfError as e:
            self.logger.error(f"Erro do Gandalf API: {e}")
            property.status = 'error'
            property.error = str(e)
            property.updated_at = datetime.utcnow()

            # Commit com contexto da aplicação
            if app_context:
                with app_context:
                    db.session.commit()
            else:
                from app import create_app
                app = create_app()
                with app.app_context():
                    db.session.commit()

            return False

        except Exception as e:
            self.logger.error(f"Erro inesperado: {e}")
            property.status = 'error'
            property.error = str(e)
            property.updated_at = datetime.utcnow()

            # Commit com contexto da aplicação
            if app_context:
                with app_context:
                    db.session.commit()
            else:
                from app import create_app
                app = create_app()
                with app.app_context():
                    db.session.commit()

            return False

    def run_export(self, property_ids: List[int] = None, app_context=None) -> Dict[str, Any]:
        """Executa o processo completo de exportação"""
        export_id = f"export_{int(time.time())}"

        stats = {
            'export_id': export_id,
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'skipped': 0,
            'start_time': datetime.now().isoformat(),
            'status': 'running',
            'errors': []
        }

        try:
            # 1. Autenticação
            if not self.authenticate(app_context):
                self.logger.error("Falha na autenticação. Abortando exportação.")
                stats['status'] = 'failed'
                stats['error'] = 'Authentication failed'
                return stats

            # 2. Buscar imóveis
            if property_ids:
                # Buscar imóveis específicos
                properties = self.get_properties_by_ids(property_ids, app_context)
            else:
                # Buscar imóveis pendentes
                properties = self.get_pending_properties(app_context)

            if not properties:
                self.logger.info("Nenhum imóvel encontrado.")
                stats['status'] = 'completed'
                return stats

            # 3. Processar cada imóvel
            for property in properties:
                stats['processed'] += 1

                try:
                    success = self.export_property(property, app_context)

                    if success:
                        stats['successful'] += 1
                        self.logger.info(f"Imóvel {property.external_id} exportado com sucesso")
                    else:
                        stats['failed'] += 1
                        self.logger.error(f"Falha na exportação do imóvel {property.external_id}")
                        # Adicionar detalhe de erro ao resumo
                        err_msg = getattr(property, 'error', None) or 'Falha na exportação'
                        stats['errors'].append({
                            'property_id': getattr(property, 'id', None),
                            'external_id': getattr(property, 'external_id', None),
                            'remote_id': getattr(property, 'remote_id', None),
                            'code': self._classify_error(err_msg),
                            'message': err_msg,
                            'step': 'export'
                        })

                    # Pequena pausa entre imóveis para não sobrecarregar a API
                    time.sleep(2)

                except Exception as e:
                    stats['failed'] += 1
                    self.logger.error(f"Erro crítico no imóvel {property.external_id}: {e}")
                    stats['errors'].append({
                        'property_id': getattr(property, 'id', None),
                        'external_id': getattr(property, 'external_id', None),
                        'remote_id': getattr(property, 'remote_id', None),
                        'code': self._classify_error(str(e)),
                        'message': str(e),
                        'step': 'export'
                    })

            # 4. Finalizar
            stats['end_time'] = datetime.now().isoformat()
            stats['status'] = 'completed' if stats['successful'] > 0 else 'failed'

            # Salvar no histórico (simulado - em produção usaria banco de dados)
            self.save_export_history(stats)

            # 5. Resumo final
            self.logger.info("=" * 50)
            self.logger.info("RESUMO DA EXPORTAÇÃO")
            self.logger.info("=" * 50)
            self.logger.info(f"Total processado: {stats['processed']}")
            self.logger.info(f"Sucessos: {stats['successful']}")
            self.logger.info(f"Falhas: {stats['failed']}")
            self.logger.info(f"Taxa de sucesso: {(stats['successful']/stats['processed']*100):.1f}%" if stats['processed'] > 0 else "0%")

        except Exception as e:
            self.logger.error(f"Erro crítico na exportação: {e}")
            stats['status'] = 'failed'
            stats['error'] = str(e)
            stats['end_time'] = datetime.now().isoformat()

        return stats

    def get_properties_by_ids(self, property_ids: List[int], app_context=None) -> List[Property]:
        """Busca imóveis específicos por IDs"""
        if app_context:
            with app_context:
                return Property.query.filter(Property.id.in_(property_ids)).all()
        else:
            return Property.query.filter(Property.id.in_(property_ids)).all()

    def save_export_history(self, stats: Dict[str, Any]):
        """Salva o histórico da exportação (simulado)"""
        # Em produção, isso seria salvo no banco de dados
        self.logger.info(f"Export {stats['export_id']} salvo no histórico")

    def get_export_status(self) -> Dict[str, Any]:
        """Retorna o status da exportação atual (simulado)"""
        # Em produção, isso seria consultado do banco de dados
        return {
            'is_running': False,  # Alterado de 'status' para 'is_running'
            'current_progress': 0,  # Alterado de 'progress' para 'current_progress'
            'total_properties': 0,  # Alterado de 'total' para 'total_properties'
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'message': 'No export running'
        }

    def get_export_history(self, page: int = 1, limit: int = 10) -> Dict[str, Any]:
        """Retorna o histórico de exportações (simulado)"""
        # Em produção, isso seria consultado do banco de dados
        return {
            'data': [],  # Alterado de 'exports' para 'data' para compatibilidade com PaginatedResponse
            'total': 0,
            'page': page,
            'page_size': limit,  # Alterado de 'limit' para 'page_size'
            'total_pages': 0  # Alterado de 'pages' para 'total_pages'
        }

    def setup_credentials(self, email: str, password: str, device_id: str, otp: str = None) -> Dict[str, Any]:
        """Configura as credenciais do Canal Pro"""
        try:
            service = GandalfService()
            result = service.login_and_get_credentials(
                email=email,
                password=password,
                device_id=device_id,
                otp=otp
            )

            if result.get('needs_otp'):
                return {
                    'needs_otp': True,
                    'message': result.get('message', 'OTP required')
                }

            creds = result.get('credentials', {})
            access_token = creds.get('accessToken')
            refresh_token = creds.get('refreshToken')

            if not access_token:
                raise Exception('No access token returned')

            # Salvar credenciais (simulado - em produção usaria o banco)
            self.logger.info("Credentials configured successfully")

            return {
                'success': True,
                'user_info': {
                    'email': email,
                    'name': 'Canal Pro User'
                }
            }

        except Exception as e:
            self.logger.error(f"Error setting up credentials: {e}")
            raise

    def check_credentials_status(self) -> Dict[str, Any]:
        """Verifica o status das credenciais"""
        try:
            # Verificar se existem credenciais salvas
            cred = IntegrationCredentials.query.filter_by(
                tenant_id=self.tenant_id,
                provider='gandalf'
            ).first()

            if not cred:
                return {
                    'has_credentials': False,
                    'is_valid': False,
                    'message': 'No credentials configured'
                }

            # Verificar se o token ainda é válido
            is_valid = True
            if cred.expires_at and cred.expires_at < datetime.utcnow():
                is_valid = False

            return {
                'has_credentials': True,
                'is_valid': is_valid,
                'last_validated': cred.last_validated_at.isoformat() if cred.last_validated_at else None,
                'expires_at': cred.expires_at.isoformat() if cred.expires_at else None,
                'user_info': {
                    'email': 'user@canalpro.com',  # Simulado
                    'name': 'Canal Pro User'
                }
            }

        except Exception as e:
            self.logger.error(f"Error checking credentials: {e}")
            return {
                'has_credentials': False,
                'is_valid': False,
                'error': str(e)
            }
