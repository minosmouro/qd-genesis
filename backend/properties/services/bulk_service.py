"""
Bulk Service - Operações em lote para propriedades
"""
import logging
from typing import List, Dict, Any
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from models import Property
from extensions import db
from constants.publication_types import VALID_PUBLICATION_TYPES, normalize_publication_type
from ..validators.bulk_validator import BulkValidator
from ..utils.helpers import sanitize_ids
from ..monitoring import monitor_operation, track_database_operation

from .property_delete_service import PropertyDeleteService

logger = logging.getLogger(__name__)


class BulkService:
    """Serviço para operações em lote"""

    @staticmethod
    @monitor_operation("bulk_delete")
    @track_database_operation()
    def bulk_delete(
        tenant_id: int,
        property_ids: List[int],
        deletion_type: str = None,
        reason: str = None,  # pylint: disable=unused-argument
        notes: str = None,  # pylint: disable=unused-argument
        confirmed: bool = False
    ) -> Dict[str, Any]:
        """
        Deleta propriedades em lote de forma segura

        Args:
            tenant_id: ID do tenant
            property_ids: Lista de IDs das propriedades
            deletion_type: Tipo de deleção ('soft', 'local', 'canalpro', 'both')
            reason: Razão da exclusão
            notes: Notas adicionais
            confirmed: Confirmação para deleções destrutivas

        Returns:
            Estatísticas da operação
        """
        is_valid, error = BulkValidator.validate_delete_request(property_ids)
        if not is_valid:
            raise ValueError(error)

        clean_ids = sanitize_ids(property_ids)
        if not clean_ids:
            raise ValueError('No valid property IDs provided')

        # O tipo de deleção padrão é 'soft' se não for especificado
        effective_deletion_type = deletion_type or 'soft'

        # Para 'both', exigir confirmação
        if effective_deletion_type == 'both' and not confirmed:
            raise ValueError("Confirmation is required for 'both' deletion type")

        try:
            summary = BulkService._delete_properties(
                tenant_id, clean_ids, effective_deletion_type, confirmed
            )

            result = {
                'message': f"{summary['success_count']} of {summary['total_processed']} properties processed.",
                'deleted': summary['success_count'],  # manter compatibilidade
                'refresh_jobs_deleted': 0,
                **summary
            }

            logger.info(f"Bulk delete completed: {result}")
            return result

        except Exception as e:
            logger.error("Bulk delete failed: %s", str(e))
            raise RuntimeError(f"Failed to delete properties: {e}") from e


    @staticmethod
    def _delete_properties(
        tenant_id: int,
        property_ids: List[int],
        deletion_type: str,
        confirmed: bool,
        query=None,
    ) -> Dict[str, Any]:
        """Processa a exclusão em lote com base no deletion_type"""
        active_query = query or Property.query

        # Buscar propriedades que existem para processar uma por uma
        properties = active_query.filter(
            Property.id.in_(property_ids),
            Property.tenant_id == tenant_id
        ).all()

        summary = {
            'total_processed': len(properties),
            'success_count': 0,
            'failure_count': 0,
            'results': [],
            'deletion_type': deletion_type
        }

        for prop in properties:
            success = False
            result = {}
            try:
                if deletion_type == 'soft':
                    success, result = PropertyDeleteService.soft_delete_property(prop.id)
                elif deletion_type == 'local':
                    success, result = PropertyDeleteService.delete_local_only(prop.id)
                elif deletion_type == 'canalpro':
                    success, result = PropertyDeleteService.delete_canalpro_only(prop.id)
                elif deletion_type == 'both':
                    if not confirmed:
                        raise ValueError("Confirmation missing for 'both' deletion")
                    success, result = PropertyDeleteService.delete_from_both(prop.id)
                else:
                    raise ValueError(f'Unsupported deletion_type: {deletion_type}')

                if success:
                    summary['success_count'] += 1
                else:
                    summary['failure_count'] += 1
                    logger.warning(
                        f"Failed to delete property {prop.id} during bulk operation: {result.get('message')}"
                    )

                summary['results'].append({
                    'property_id': prop.id,
                    'success': success,
                    **result
                })

            except Exception as e:
                summary['failure_count'] += 1
                logger.error(f"Error deleting property {prop.id} in bulk: {e}")
                summary['results'].append({
                    'property_id': prop.id,
                    'success': False,
                    'message': str(e),
                    'status': 500
                })

        return summary

    @staticmethod
    @monitor_operation("bulk_update_publication_type")
    @track_database_operation()
    def bulk_update_publication_type(tenant_id: int, property_ids: List[int], publication_type: str) -> Dict[str, Any]:
        """Atualiza o campo publication_type (tipo de destaque) em lote.

        Apenas atualiza no banco de dados local. A sincronização com o CanalPro
        deve ser feita separadamente via export_and_activate.

        Args:
            tenant_id: ID do tenant
            property_ids: Lista de IDs de propriedades
            publication_type: Novo tipo de publicação (STANDARD, PREMIUM, ...)

        Returns:
            Estatísticas da operação
        """
        from ..validators.bulk_validator import BulkValidator
        from models import Property

        # Validar parâmetros
        is_valid, error = BulkValidator.validate_update_publication_type_request(property_ids, publication_type)
        if not is_valid:
            raise ValueError(error)

        clean_ids = sanitize_ids(property_ids)
        if not clean_ids:
            raise ValueError('No valid property IDs provided')

        # Normalizar publication_type usando função centralizada
        try:
            normalized = normalize_publication_type(publication_type)
        except ValueError as e:
            raise ValueError(str(e))

        try:
            # Atualizar em lote utilizando ORM com filtro por tenant
            properties = Property.query.filter(
                Property.id.in_(clean_ids),
                Property.tenant_id == tenant_id
            ).all()

            updated = 0
            for prop in properties:
                prop.publication_type = normalized
                updated += 1

            db.session.commit()

            return {
                'updated': updated,
                'publication_type': normalized,
                'message': f'{updated} properties updated successfully'
            }
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Bulk update publication_type failed: %s", str(e))
            raise RuntimeError(f"Database error: {e}") from e
