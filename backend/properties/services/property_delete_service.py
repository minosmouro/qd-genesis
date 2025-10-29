"""
Serviço de exclusão de imóveis com proteção contra exclusão indevida no Canal Pro

Este módulo implementa soft delete e proteções para evitar exclusão acidental
de imóveis no Canal Pro quando o usuário só quer excluir do Quadradois.
"""

from typing import Dict, Any, Tuple
from flask import current_app, g
from extensions import db
from models import Property
from datetime import datetime
import traceback


class PropertyDeleteService:
    """Serviço de exclusão de imóveis com proteções"""
    
    @staticmethod
    def soft_delete_property(property_id: int) -> Tuple[bool, Dict[str, Any]]:
        """
        Marca imóvel como deletado sem remover do banco (soft delete).
        NÃO deleta do Canal Pro.
        
        Args:
            property_id: ID do imóvel
            
        Returns:
            Tuple[bool, Dict]: (sucesso, resposta)
        """
        try:
            prop = Property.query.filter_by(id=property_id, tenant_id=g.tenant_id).first()
            
            if not prop:
                return False, {
                    'message': 'Property not found',
                    'status': 404
                }
            
            # Marcar como deletado
            prop.status = 'deleted'
            prop.deleted_at = datetime.utcnow()
            
            db.session.commit()
            
            current_app.logger.info(
                f"✅ Property {property_id} soft deleted (status=deleted, "
                f"remote_id={prop.remote_id})"
            )
            
            return True, {
                'message': 'Imóvel excluído com sucesso (pode ser reativado)',
                'status': 200,
                'deletion_type': 'soft',
                'canalpro_status': 'not_affected',
                'can_restore': True
            }
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Erro ao soft delete property {property_id}: {e}")
            return False, {
                'message': f'Erro ao excluir imóvel: {str(e)}',
                'status': 500
            }
    
    @staticmethod
    def delete_local_only(property_id: int) -> Tuple[bool, Dict[str, Any]]:
        """
        Deleta imóvel APENAS do Quadradois, mantém no Canal Pro.
        
        Args:
            property_id: ID do imóvel
            
        Returns:
            Tuple[bool, Dict]: (sucesso, resposta)
        """
        try:
            prop = Property.query.filter_by(id=property_id, tenant_id=g.tenant_id).first()
            
            if not prop:
                return False, {
                    'message': 'Property not found',
                    'status': 404
                }
            
            remote_id = prop.remote_id
            
            # Deletar do banco local
            db.session.delete(prop)
            db.session.commit()
            
            current_app.logger.info(
                f"✅ Property {property_id} deleted from local database only "
                f"(remote_id={remote_id} preserved in CanalPro)"
            )
            
            return True, {
                'message': 'Imóvel excluído do Quadradois (mantido no Canal Pro)',
                'status': 200,
                'deletion_type': 'local_only',
                'canalpro_status': 'preserved',
                'remote_id': remote_id,
                'warning': 'Imóvel ainda está ativo no Canal Pro e portais'
            }
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Erro ao deletar local property {property_id}: {e}")
            return False, {
                'message': f'Erro ao excluir imóvel: {str(e)}',
                'status': 500
            }
    
    @staticmethod
    def delete_from_both(property_id: int) -> Tuple[bool, Dict[str, Any]]:
        """
        Deleta imóvel do Quadradois E do Canal Pro.
        ATENÇÃO: Esta ação é irreversível!
        
        Args:
            property_id: ID do imóvel
            
        Returns:
            Tuple[bool, Dict]: (sucesso, resposta)
        """
        try:
            prop = Property.query.filter_by(id=property_id, tenant_id=g.tenant_id).first()
            
            if not prop:
                return False, {
                    'message': 'Property not found',
                    'status': 404
                }
            
            remote_id = prop.remote_id
            canalpro_deleted = False
            canalpro_error = None
            
            # STEP 1: Deletar do Canal Pro (se tiver remote_id)
            if remote_id:
                try:
                    from utils.integration_tokens import get_valid_integration_headers
                    from integrations.gandalf_service import bulk_delete_listing
                    
                    creds = get_valid_integration_headers(g.tenant_id, 'gandalf')
                    result = bulk_delete_listing([str(remote_id)], creds)
                    
                    current_app.logger.info(
                        f"Canal Pro deletion result for property {property_id}: {result}"
                    )
                    
                    canalpro_deleted = True
                    
                except Exception as e:
                    canalpro_error = str(e)
                    current_app.logger.error(
                        f"Erro ao deletar property {property_id} do Canal Pro: {e}"
                    )
                    
                    # Não falhar a operação se Canal Pro falhar
                    # Apenas registrar o erro
            
            # STEP 2: Deletar do banco local
            db.session.delete(prop)
            db.session.commit()
            
            current_app.logger.info(
                f"✅ Property {property_id} deleted from both systems "
                f"(local=success, canalpro={canalpro_deleted})"
            )
            
            return True, {
                'message': 'Imóvel excluído de ambos os sistemas',
                'status': 200,
                'deletion_type': 'both',
                'local_status': 'deleted',
                'canalpro_status': 'deleted' if canalpro_deleted else 'failed',
                'canalpro_error': canalpro_error,
                'warning': 'Esta ação é irreversível!'
            }
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Erro ao deletar property {property_id}: {e}")
            return False, {
                'message': f'Erro ao excluir imóvel: {str(e)}',
                'status': 500
            }

    @staticmethod
    def delete_canalpro_only(property_id: int, reason: str = None, notes: str = None) -> Tuple[bool, Dict[str, Any]]:
        """
        Deleta APENAS do Canal Pro, mantendo o imóvel no Quadradois.

        - Se não houver remote_id: considera como "não necessário" e mantém local
        - Em caso de sucesso: limpa remote_id e marca status local como 'deleted_remote'
        - Em caso de falha de credenciais: retorna erro informativo

        Returns:
            Tuple[bool, Dict[str, Any]]
        """
        try:
            prop = Property.query.filter_by(id=property_id, tenant_id=g.tenant_id).first()

            if not prop:
                return False, {
                    'message': 'Property not found',
                    'status': 404
                }

            if not getattr(prop, 'remote_id', None):
                current_app.logger.info(
                    f"Property {property_id} has no remote_id; CanalPro delete not needed"
                )
                return True, {
                    'message': 'Imóvel não possui publicação no Canal Pro',
                    'status': 200,
                    'deletion_type': 'canalpro_only',
                    'canalpro_status': 'not_needed',
                    'local_status': 'preserved'
                }

            # Tentar obter credenciais
            try:
                from utils.integration_tokens import get_valid_integration_headers
                from integrations.gandalf_service import bulk_delete_listing
                creds = get_valid_integration_headers(g.tenant_id, 'gandalf')
            except Exception as cred_error:  # pylint: disable=broad-except
                current_app.logger.warning(
                    f"Property {property_id}: CanalPro credentials unavailable: {cred_error}"
                )
                return False, {
                    'message': f'Credenciais do Canal Pro indisponíveis: {str(cred_error)}',
                    'status': 400,
                    'deletion_type': 'canalpro_only',
                    'canalpro_status': 'credentials_failed',
                    'local_status': 'preserved'
                }

            # Executar deleção remota
            try:
                remote_id_str = str(prop.remote_id)
                result = bulk_delete_listing([remote_id_str], creds)
                current_app.logger.info(
                    f"CanalPro delete_only result for property {property_id} (remote_id={remote_id_str}): {result}"
                )

                # Avaliar resposta — aceitar vários formatos e tratar 'not found' como sucesso idempotente
                success = False
                response_message = None

                if isinstance(result, dict):
                    if result.get('errors'):
                        messages = ' '.join([e.get('message', str(e)) for e in result.get('errors', [])]).lower()
                        # Considerar como sucesso se o anúncio já não existe
                        if any(x in messages for x in ['not found', 'does not exist', 'already deleted', 'no such listing']):
                            success = True
                            response_message = 'Listing not found at CanalPro (treated as deleted)'
                        else:
                            response_message = messages
                    else:
                        # Estruturas possíveis
                        blk = (result.get('data') or {}).get('bulkDeleteListing') or (result.get('data') or {}).get('deleteListings')
                        if isinstance(blk, dict) and 'message' in blk:
                            msg = str(blk['message']).lower()
                            response_message = blk.get('message')
                            if 'deleted' in msg and 'success' in msg:
                                success = True

                if success:
                    # Marcar local como "deleted_remote" e limpar remote_id
                    prop.status = 'deleted_remote'
                    prop.remote_id = None
                    db.session.commit()
                    return True, {
                        'message': 'Imóvel removido do Canal Pro (mantido no Quadradois)',
                        'status': 200,
                        'deletion_type': 'canalpro_only',
                        'canalpro_status': 'success',
                        'local_status': 'preserved',
                        'canalpro_response': response_message
                    }

                # Falha na deleção do CanalPro
                return False, {
                    'message': f'Falha ao excluir no Canal Pro: {response_message or "unknown error"}',
                    'status': 502,
                    'deletion_type': 'canalpro_only',
                    'canalpro_status': 'failed',
                    'local_status': 'preserved'
                }

            except Exception as e:  # pylint: disable=broad-except
                current_app.logger.exception(
                    f"Erro inesperado deletando no CanalPro (only) property {property_id}: {e}"
                )
                return False, {
                    'message': f'Erro ao excluir no Canal Pro: {str(e)}',
                    'status': 500,
                    'deletion_type': 'canalpro_only',
                    'canalpro_status': 'unexpected_error',
                    'local_status': 'preserved'
                }

        except Exception as e:  # pylint: disable=broad-except
            db.session.rollback()
            current_app.logger.exception(f"Erro geral ao processar delete_canalpro_only {property_id}: {e}")
            return False, {
                'message': f'Erro ao excluir no Canal Pro: {str(e)}',
                'status': 500
            }
    
    @staticmethod
    def restore_property(property_id: int) -> Tuple[bool, Dict[str, Any]]:
        """
        Restaura um imóvel soft deleted.
        
        Args:
            property_id: ID do imóvel
            
        Returns:
            Tuple[bool, Dict]: (sucesso, resposta)
        """
        try:
            # Buscar imóvel deletado (sem filtro de tenant para permitir restauração)
            prop = Property.query.filter_by(id=property_id).first()
            
            if not prop:
                return False, {
                    'message': 'Property not found',
                    'status': 404
                }
            
            if prop.status != 'deleted':
                return False, {
                    'message': 'Imóvel não está deletado',
                    'status': 400
                }
            
            # Restaurar
            prop.status = 'ACTIVE'
            prop.deleted_at = None
            
            db.session.commit()
            
            current_app.logger.info(f"✅ Property {property_id} restored")
            
            return True, {
                'message': 'Imóvel restaurado com sucesso',
                'status': 200,
                'property_id': property_id
            }
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Erro ao restaurar property {property_id}: {e}")
            return False, {
                'message': f'Erro ao restaurar imóvel: {str(e)}',
                'status': 500
            }
    
    @staticmethod
    def check_deletion_impact(property_id: int) -> Dict[str, Any]:
        """
        Verifica o impacto da exclusão de um imóvel.
        
        Args:
            property_id: ID do imóvel
            
        Returns:
            Dict com informações sobre o impacto
        """
        try:
            prop = Property.query.filter_by(id=property_id, tenant_id=g.tenant_id).first()
            
            if not prop:
                return {
                    'found': False,
                    'message': 'Property not found'
                }
            
            has_remote_id = prop.remote_id is not None
            has_refresh_schedule = False  # TODO: Verificar se tem schedule ativo
            
            impact = {
                'found': True,
                'property_id': property_id,
                'external_id': prop.external_id,
                'title': prop.title,
                'has_remote_id': has_remote_id,
                'remote_id': prop.remote_id,
                'has_refresh_schedule': has_refresh_schedule,
                'warnings': []
            }
            
            if has_remote_id:
                impact['warnings'].append(
                    '⚠️ Este imóvel está publicado no Canal Pro'
                )
                impact['warnings'].append(
                    '⚠️ Excluir pode remover dos portais (ZAP, VivaReal)'
                )
            
            if has_refresh_schedule:
                impact['warnings'].append(
                    '⚠️ Este imóvel tem automação de refresh ativa'
                )
            
            impact['recommendations'] = [
                '✅ Recomendado: Usar "Soft Delete" (pode ser reativado)',
                '⚠️ Alternativa: Excluir apenas do Quadradois',
                '❌ Não recomendado: Excluir de ambos os sistemas'
            ]
            
            return impact
            
        except Exception as e:
            current_app.logger.exception(f"Erro ao verificar impacto: {e}")
            return {
                'found': False,
                'error': str(e)
            }
