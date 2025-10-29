"""
Import Service - Centraliza lógica de importação de propriedades
"""
import logging
from typing import Dict, List, Any, Tuple, Optional
from flask import current_app, g
from sqlalchemy.exc import SQLAlchemyError

from models import Property, IntegrationCredentials
from extensions import db
from utils.integration_tokens import get_valid_integration_headers
from integrations.gandalf_service import list_listings
from ..mappers.property_mapper import PropertyMapper
from ..validators.import_validator import ImportValidator
from ..monitoring import monitor_operation, track_database_operation, track_api_call

logger = logging.getLogger(__name__)


class ImportService:
    """Serviço para importação de propriedades de fontes externas"""

    @staticmethod
    @monitor_operation("import_all_from_gandalf")
    def import_all_from_gandalf(tenant_id: int, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Importa todas as listagens do Gandalf para o tenant especificado

        Args:
            tenant_id: ID do tenant
            options: Opções de importação (page_size, status_filter, etc.)

        Returns:
            Dict com estatísticas da importação
        """
        options = options or {}
        page_size = options.get('page_size', 100)
        status_filter = options.get('status_filter', ['ACTIVE'])

        # Validar credenciais
        creds = ImportService._get_integration_credentials(tenant_id, 'gandalf')
        if not creds:
            raise ValueError('Integration credentials for gandalf not found')

        # Obter listings
        listings = ImportService._fetch_listings(creds, page_size, status_filter)

        # Processar importação
        return ImportService._process_listings_batch(tenant_id, listings)

    @staticmethod
    def import_single_payload(tenant_id: int, payload: Dict[str, Any], dry_run: bool = False) -> Dict[str, Any]:
        """
        Importa um único payload de propriedade

        Args:
            tenant_id: ID do tenant
            payload: Dados da propriedade
            dry_run: Se True, apenas valida sem salvar

        Returns:
            Resultado da importação
        """
        # Validar payload
        is_valid, error = ImportValidator.validate_import_payload(payload)
        if not is_valid:
            raise ValueError(f"Invalid payload: {error}")

        if dry_run:
            return ImportService._simulate_import(payload)

        return ImportService._process_single_listing(tenant_id, payload)

    # Métodos privados
    @staticmethod
    def _get_integration_credentials(tenant_id: int, provider: str) -> Optional[Any]:
        """Obtém e valida credenciais de integração"""
        creds_row = IntegrationCredentials.query.filter_by(
            tenant_id=tenant_id,
            provider=provider
        ).first()

        if not creds_row:
            return None

        try:
            return get_valid_integration_headers(tenant_id, provider)
        except Exception as e:
            logger.error(f"Failed to get valid headers for {provider}: {e}")
            raise

    @staticmethod
    def _fetch_listings(creds: Any, page_size: int, status_filter: List[str]) -> List[Dict]:
        """Busca listings da API externa"""
        try:
            listings = list_listings(creds, page_size=page_size, status_filter=status_filter)
            logger.info(f"Fetched {len(listings)} listings from external API")
            return listings
        except Exception as e:
            logger.error(f"Failed to fetch listings: {e}")
            raise

    @staticmethod
    def _process_listings_batch(tenant_id: int, listings: List[Dict]) -> Dict[str, Any]:
        """Processa um lote de listings"""
        stats = {'inserted': 0, 'updated': 0, 'skipped': 0, 'errors': []}

        for listing in listings:
            try:
                result = ImportService._process_single_listing(tenant_id, listing)
                if result.get('inserted'):
                    stats['inserted'] += 1
                elif result.get('updated'):
                    stats['updated'] += 1
                else:
                    stats['skipped'] += 1

            except Exception as e:
                external_id = listing.get('externalId') or listing.get('external_id')
                stats['errors'].append({
                    'external_id': external_id,
                    'error': str(e)
                })
                logger.error(f"Failed to process listing {external_id}: {e}")

        stats['total_listings'] = len(listings)
        return stats

    @staticmethod
    def _process_single_listing(tenant_id: int, listing: Dict) -> Dict[str, Any]:
        """Processa uma única listing"""
        external_id = listing.get('externalId') or listing.get('external_id')
        if not external_id:
            raise ValueError("Missing external_id in listing")

        # Buscar ou criar propriedade
        prop = Property.query.filter_by(
            external_id=external_id,
            tenant_id=tenant_id
        ).first()

        is_new = prop is None
        if is_new:
            prop = Property(
                external_id=external_id,
                tenant_id=tenant_id,
                title=listing.get('title', f'Imported {external_id}')
            )
            db.session.add(prop)

        # Mapear dados
        logger.info(f"🔍 ANTES do mapping: property_type={prop.property_type}, usage_types={prop.usage_types}, category={prop.category}")
        logger.info(f"🔍 Listing recebido: unitTypes={listing.get('unitTypes')}, usageTypes={listing.get('usageTypes')}, category={listing.get('category')}")
        
        PropertyMapper.map_listing_to_property(listing, prop)
        
        logger.info(f"🔍 DEPOIS do mapping: property_type={prop.property_type}, usage_types={prop.usage_types}, category={prop.category}")

        try:
            db.session.commit()
            logger.info(f"{'Created' if is_new else 'Updated'} property {external_id}")

            # Enfileirar download de imagens se necessário
            ImportService._enqueue_image_downloads(prop, listing.get('images', []))

            return {'inserted': 1 if is_new else 0, 'updated': 0 if is_new else 1}

        except SQLAlchemyError as e:
            db.session.rollback()
            raise Exception(f"Database error: {e}")

    @staticmethod
    def _simulate_import(payload: Dict) -> Dict[str, Any]:
        """Simula importação para dry_run"""
        mapped = PropertyMapper.simulate_mapping(payload)
        return {'dry_run': True, 'mapped': mapped}

    @staticmethod
    def _enqueue_image_downloads(prop: Property, images: List[str]):
        """Enfileira downloads de imagem se necessário"""
        try:
            from ..utils.helpers import needs_download
            to_download = [url for url in images if needs_download(url)]

            if to_download:
                from tasks.download_images import download_and_attach
                download_and_attach.delay(prop.id, to_download)
                logger.info(f"Enqueued {len(to_download)} images for property {prop.id}")

        except Exception as e:
            # Não falhar a importação por falha no enfileiramento
            logger.warning(f"Failed to enqueue image downloads: {e}")
