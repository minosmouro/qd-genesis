"""
Service para gerenciar a operação de refresh de imóveis.
"""
import logging
from typing import Tuple, Dict, Any
from datetime import datetime, timezone

from extensions import db
from models import Property, RefreshOperation

logger = logging.getLogger(__name__)

class RefreshService:
    """
    Serviço responsável pela lógica de refresh (delete/recreate) de um imóvel.
    """

    @staticmethod
    def refresh_property(property_id: int, tenant_id: int) -> Tuple[bool, Dict[str, Any]]:
        """
        Executa o processo de refresh para um único imóvel.

        1.  Verifica se o imóvel existe.
        2.  Cria um registro de auditoria na tabela `refresh_operations`.
        3.  Faz backup dos dados do imóvel.
        4.  (Placeholder) Deleta o imóvel do portal externo.
        5.  (Placeholder) Recria o imóvel no portal externo.
        6.  Atualiza o `remote_id` local.
        7.  Atualiza o status da operação de refresh.
        """
        # 1. Encontrar o imóvel do tenant e iniciar a operação
        property_obj = Property.query.filter_by(id=property_id, tenant_id=tenant_id).first()
        if not property_obj:
            return False, {
                "success": False,
                "error": "Imóvel não encontrado",
                "status": "not_found"
            }

        if not property_obj.remote_id:
            return False, {
                "success": False,
                "error": "Imóvel não está integrado/exportado",
                "status": "not_integrated"
            }

        operation = RefreshOperation(
            property_id=property_id,
            status='in_progress',
            original_remote_id=property_obj.remote_id,
            started_at=datetime.now(timezone.utc)
        )
        db.session.add(operation)
        db.session.commit()

        try:
            logger.info("Iniciando refresh para o imóvel ID: %s", property_id)

            # 2. Fazer backup dos dados
            backup_data = RefreshService._backup_property_data(property_obj)
            operation.backup_data = backup_data
            db.session.commit()
            logger.info("Backup dos dados do imóvel %s concluído.", property_id)

            # ==================================================================
            # USAR PropertyService.refresh_property() QUE JÁ ESTÁ COMPLETO
            # ==================================================================
            from properties.services.property_service import PropertyService

            # Configurar tenant_id no contexto Flask
            from flask import g
            g.tenant_id = tenant_id

            # Executar refresh usando PropertyService (delete + create no CanalPro)
            success, result = PropertyService.refresh_property(property_id)

            if success:
                # Atualizar operação com sucesso
                operation.status = 'completed'
                operation.new_remote_id = result.get('refresh_details', {}).get('new_remote_id')
                operation.completed_at = datetime.now(timezone.utc)
                db.session.commit()

                logger.info("Refresh do imóvel ID: %s concluído com sucesso.", property_id)
                return True, {
                    "success": True,
                    "message": "Refresh concluído com sucesso!",
                    "operation_id": operation.id,
                    "new_remote_id": operation.new_remote_id,
                    "refresh_details": result.get('refresh_details'),
                    "status": "completed"
                }
            else:
                # Falha no refresh
                operation.status = 'failed'
                operation.error_message = result.get('error', 'Refresh operation failed')
                operation.completed_at = datetime.now(timezone.utc)
                db.session.commit()

                logger.error("Refresh do imóvel ID: %s falhou: %s", property_id, operation.error_message)
                return False, {
                    "success": False,
                    "error": "Falha ao executar o refresh",
                    "operation_id": operation.id,
                    "details": result,
                    "status": "failed"
                }

        except Exception as e:  # pylint: disable=broad-except
            logger.error("Falha no refresh do imóvel ID: %s. Erro: %s", property_id, str(e), exc_info=True)

            # Em caso de erro, reverter e registrar a falha
            db.session.rollback()

            # Precisamos buscar a operação novamente pois a sessão foi revertida
            operation = RefreshOperation.query.get(operation.id)
            if operation:
                operation.status = 'failed'
                operation.error_message = str(e)
                operation.completed_at = datetime.now(timezone.utc)
                db.session.add(operation)  # Adicionar de volta à sessão
                db.session.commit()

            return False, {
                "success": False,
                "error": "Falha ao executar o refresh",
                "details": str(e),
                "operation_id": operation.id if operation else None,
                "status": "failed"
            }

    @staticmethod
    def _backup_property_data(property_obj: Property) -> Dict[str, Any]:
        """
        Cria um dicionário com os dados do imóvel para o backup.
        Isso deve ser um subconjunto dos dados do modelo `Property` que são
        relevantes para a recriação no portal.
        """
        # Função auxiliar para converter tipos não serializáveis
        def decimal_to_float(value):
            return float(value) if value is not None else None
        
        def datetime_to_iso(value):
            return value.isoformat() if value is not None else None

        # Exemplo de dados. Isso deve ser ajustado conforme a necessidade da API do Canal Pro.
        return {
            "title": property_obj.title,
            "description": property_obj.description,
            "property_type": property_obj.property_type,
            "price": decimal_to_float(property_obj.price),
            "price_rent": decimal_to_float(property_obj.price_rent),
            "condo_fee": decimal_to_float(property_obj.condo_fee),
            "iptu": decimal_to_float(property_obj.iptu),
            "currency": property_obj.currency,
            "address_street": property_obj.address_street,
            "address_number": property_obj.address_number,
            "address_neighborhood": property_obj.address_neighborhood,
            "address_city": property_obj.address_city,
            "address_state": property_obj.address_state,
            "address_zip": getattr(property_obj, 'address_zip', None),
            "created_at": datetime_to_iso(property_obj.created_at),
            "updated_at": datetime_to_iso(property_obj.updated_at),
            # ... outros campos necessários
        }
