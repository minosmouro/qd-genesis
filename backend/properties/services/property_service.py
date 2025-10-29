"""
Property Business Logic Service
"""
from typing import Dict, Any, Tuple, List, Optional
from flask import g, current_app
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import func
import random
import json
import traceback
import unicodedata

from extensions import db
from models import Property
from ..utils.helpers import first_int, first_float, needs_download
from ..utils.status_catalog import aggregate_status_counts
from ..serializers.property_serializer import PropertySerializer
from .empreendimento_helper import EmpreendimentoHelper
from empreendimentos.models.empreendimento import Empreendimento
from empreendimentos.models.audit_log import EmpreendimentoAuditLog


class PropertyService:
    """Handles property business logic operations."""
    
    @staticmethod
    def create_property(data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """Create a new property."""
        try:
            # Extract basic data
            title = data.get('title')
            description = data.get('description')
            external_id = data.get('external_id')
            # Normalizar/remove prefixo 'PUBLISHED_' caso venha do frontend/import
            if isinstance(external_id, str):
                external_id = external_id.strip()
                if external_id.upper().startswith('PUBLISHED_'):
                    external_id = external_id.split('PUBLISHED_', 1)[1]
            
            image_urls = data.get('image_urls', [])
            status = data.get('status', 'pending')
            
            # Check for duplicates
            if Property.query.filter_by(external_id=external_id, tenant_id=g.tenant_id).first():
                return False, {
                    'message': 'Property with this external ID already exists for this tenant',
                    'status': 409
                }
            
            # NOVO: Buscar ou criar empreendimento na tabela dedicada
            empreendimento_id = None
            
            # LOG DEBUG: Verificar o que vem no payload
            current_app.logger.info(f"🔍 DEBUG create_property: empreendimento_id no payload = {data.get('empreendimento_id')}")
            current_app.logger.info(f"🔍 DEBUG create_property: building_name no payload = {data.get('building_name')}")
            
            # PRIORIDADE 1: Se veio empreendimento_id direto, usar ele
            if 'empreendimento_id' in data and data['empreendimento_id']:
                empreendimento_id = data['empreendimento_id']
                current_app.logger.info(f"✅ Usando empreendimento_id direto do payload: {empreendimento_id}")
                
                # Atualizar características do empreendimento se vieram no payload
                if 'empreendimento_caracteristicas' in data:
                    try:
                        user_id = get_jwt_identity()
                        PropertyService._update_empreendimento_caracteristicas(
                            empreendimento_id,
                            data['empreendimento_caracteristicas'],
                            user_id=user_id,
                            tenant_id=g.tenant_id
                        )
                        current_app.logger.info(f"✅ Características do empreendimento atualizadas")
                    except Exception as e:
                        current_app.logger.warning(f"Falha ao atualizar características: {e}")
                
            # PRIORIDADE 2: Se veio nome, buscar/criar
            elif data.get('building_name') or data.get('nome_empreendimento'):
                empreendimento_id = EmpreendimentoHelper.get_or_create_empreendimento(
                    data, 
                    g.tenant_id
                )
                current_app.logger.info(f"✅ Empreendimento criado/encontrado: ID {empreendimento_id}")
            
            # Create new property
            new_property = Property(
                title=title,
                description=description,
                external_id=external_id,
                tenant_id=g.tenant_id,
                status=status,
                image_urls=image_urls,
                empreendimento_id=empreendimento_id  # Vincular via FK
            )
            
            # Generate property code
            new_property.property_code = PropertyService._generate_property_code(data.get('property_type'), g.tenant_id)
            
            # NOVO: Limpar campos duplicados de empreendimento dos dados
            # Esses campos não devem ser salvos em 'property'
            data_limpo = EmpreendimentoHelper.limpar_campos_duplicados(data)
            
            # Map additional fields (usando dados limpos)
            PropertyService._map_property_fields(new_property, data_limpo)
            
            db.session.add(new_property)
            db.session.commit()
            
            return True, PropertySerializer.to_create_response(new_property)
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception('Error creating property: %s', str(e))
            return False, {
                'message': 'Error creating property',
                'error': str(e),
                'status': 500
            }
    
    @staticmethod
    def map_property_category(property_type: str, category: str = None) -> Tuple[str, str]:
        """Mapeia tipo e categoria do imóvel baseado na hierarquia fornecida
        
        Returns:
            Tuple[str, str]: (property_type_normalizado, category_normalizada)
        """
        
        def remove_accents(text: str) -> str:
            """Remove acentos de uma string para comparação"""
            if not text:
                return text
            nfd = unicodedata.normalize('NFD', text)
            return ''.join(char for char in nfd if unicodedata.category(char) != 'Mn')
        
        # Mapeamento de tipos: LABELS/ALIASES -> CÓDIGOS (para armazenar códigos no banco)
        type_mapping = {
            # Apartamento
            'APARTAMENTO': 'APARTMENT',
            'Apartamento': 'APARTMENT',
            
            # Casa
            'CASA': 'HOUSE',
            'Casa': 'HOUSE',
            
            # Casa de Condomínio
            'CASA CONDOMINIO': 'CASA_CONDOMINIO',
            'Casa de Condomínio': 'CASA_CONDOMINIO',
            
            # Casa de Vila
            'CASA VILA': 'CASA_VILA',
            'Casa de Vila': 'CASA_VILA',
            
            # Cobertura
            'PENTHOUSE': 'COBERTURA',
            'Cobertura': 'COBERTURA',
            
            # Fazenda/Sítio/Chácara
            'FARM': 'FAZENDA_SITIO_CHACARA',
            'RANCH': 'FAZENDA_SITIO_CHACARA',
            'SITIO': 'FAZENDA_SITIO_CHACARA',
            'CHACARA': 'FAZENDA_SITIO_CHACARA',
            'FAZENDA': 'FAZENDA_SITIO_CHACARA',
            'Fazenda/Sítio/Chácara': 'FAZENDA_SITIO_CHACARA',
            
            # Flat (já é código)
            'Flat': 'FLAT',
            
            # Kitnet/Conjugado
            'KITNET': 'KITNET_CONJUGADO',
            'CONJUGADO': 'KITNET_CONJUGADO',
            'Kitnet/Conjugado': 'KITNET_CONJUGADO',
            
            # Loft (já é código)
            'Loft': 'LOFT',
            
            # Lote/Terreno
            'LAND': 'LOTE_TERRENO',
            'LOTE': 'LOTE_TERRENO',
            'TERRENO': 'LOTE_TERRENO',
            'Lote/Terreno': 'LOTE_TERRENO',
            
            # Prédio/Edifício
            'BUILDING': 'PREDIO_EDIFICIO_INTEIRO',
            'PREDIO': 'PREDIO_EDIFICIO_INTEIRO',
            'EDIFICIO': 'PREDIO_EDIFICIO_INTEIRO',
            'Prédio/Edifício Inteiro': 'PREDIO_EDIFICIO_INTEIRO',
            
            # Studio (já é código)
            'Studio': 'STUDIO'
        }
        
        # Mapeamento de categorias baseado no tipo (usando códigos agora)
        category_mapping = {
            'APARTMENT': ['Padrão', 'Duplex', 'Triplex'],
            'HOUSE': ['Térrea', 'Kitnet/Conjugado', 'Sobrado', 'Padrão'],
            'CASA_CONDOMINIO': ['Térrea', 'Sobrado', 'Padrão'],
            'CASA_VILA': ['Térrea', 'Sobrado', 'Padrão'],
            'COBERTURA': ['Padrão', 'Duplex', 'Triplex'],
            'LOFT': ['Padrão', 'Cobertura', 'Duplex', 'Triplex'],
            'LOTE_TERRENO': ['Padrão', 'Lote Condomínio', 'Lote de Vila']
        }
        
        # Normalizar tipo: converter para código
        # Primeiro tentar buscar no mapeamento
        normalized_type = type_mapping.get(property_type, None)
        
        # Se não encontrou, tentar com upper e replace
        if not normalized_type:
            normalized_type = type_mapping.get((property_type or '').upper().replace(' ', '_'), property_type)
        
        # Se ainda não encontrou e já parece ser um código, manter
        if not normalized_type or normalized_type == property_type:
            # Verificar se já é um código válido (sem espaços, sem acentos, tudo maiúsculo)
            if property_type and property_type.isupper() and '_' in property_type:
                normalized_type = property_type
        
        # Se não foi fornecida categoria, tentar inferir do tipo
        if not category and normalized_type in category_mapping:
            # Para tipos que têm subcategorias, usar 'Padrão' como default
            if normalized_type in ['APARTMENT', 'HOUSE', 'CASA_CONDOMINIO', 'CASA_VILA', 'COBERTURA', 'LOFT', 'LOTE_TERRENO']:
                normalized_category = 'Padrão'
            else:
                normalized_category = None
        else:
            # Validar se a categoria fornecida é válida para o tipo
            if normalized_type in category_mapping and category:
                valid_categories = category_mapping[normalized_type]
                # Normalizar categoria recebida (remover acentos e converter para maiúsculas)
                category_normalized = remove_accents(category.upper().replace(' ', '_').replace('/', '_'))
                
                # Tentar encontrar correspondência exata (sem acentos)
                for valid_cat in valid_categories:
                    valid_cat_normalized = remove_accents(valid_cat.upper().replace(' ', '_').replace('/', '_'))
                    if category_normalized == valid_cat_normalized or category_normalized in valid_cat_normalized or valid_cat_normalized in category_normalized:
                        normalized_category = valid_cat
                        break
                else:
                    # Se não encontrou match, manter original
                    normalized_category = category
            else:
                normalized_category = category
        
        return normalized_type, normalized_category
    
    @staticmethod
    def _map_property_fields(property_obj: Property, data: Dict[str, Any]) -> None:
        """Map data fields to property object using new field mapping system."""
        PropertyService._update_basic_fields(property_obj, data)
        PropertyService._update_address_fields(property_obj, data)
        PropertyService._update_physical_fields(property_obj, data)
        PropertyService._update_building_fields(property_obj, data)
        PropertyService._update_pricing_fields(property_obj, data)
        PropertyService._update_type_fields(property_obj, data)
        PropertyService._update_media_fields(property_obj, data)
        PropertyService._update_location_fields(property_obj, data)
    
    @staticmethod
    def update_property(property_id: int, data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """Update an existing property and sync to CanalPro (Gandalf).
        
        This implementation aligns the on-update path with the exporter behaviour:
        - commit local changes first
        - convert to CanalPro payload and upload images via CanalProExporter
        - try UPDATE by prop.remote_id
        - if not found, try lookup by externalId and UPDATE
        - if still not updated, CREATE listing
        - persist remote_id and export status
        
        Any remote failures are logged and do not make the HTTP update fail.
        """
        try:
            current_app.logger.info(f"🔍 DEBUG update_property: property_id={property_id}, tenant_id={g.tenant_id}")
            prop = Property.query.filter_by(id=property_id, tenant_id=g.tenant_id).first()
            if not prop:
                current_app.logger.error(f"❌ Property not found: id={property_id}, tenant={g.tenant_id}")
                # Verificar se o imóvel existe em outro tenant
                other_prop = Property.query.filter_by(id=property_id).first()
                if other_prop:
                    current_app.logger.error(f"⚠️  Property exists but belongs to tenant_id={other_prop.tenant_id}")
                return False, {'message': 'Property not found', 'status': 404}

            # Update local fields
            PropertyService._update_basic_fields(prop, data)
            PropertyService._update_address_fields(prop, data)
            PropertyService._update_physical_fields(prop, data)
            PropertyService._update_building_fields(prop, data)
            PropertyService._update_pricing_fields(prop, data)
            PropertyService._update_type_fields(prop, data)
            PropertyService._update_media_fields(prop, data)
            PropertyService._update_location_fields(prop, data)

            # Vincular empreendimento/condomínio quando presente no payload
            try:
                current_app.logger.info(f"🔍 DEBUG update_property: empreendimento_id no payload = {data.get('empreendimento_id')}")
                current_app.logger.info(f"🔍 DEBUG update_property: tipo do valor = {type(data.get('empreendimento_id'))}")
                
                # PRIORIDADE 1: Se veio empreendimento_id direto, usar ele
                if 'empreendimento_id' in data:
                    emp_id_value = data['empreendimento_id']
                    # Aceitar None, 0 ou valores positivos
                    if emp_id_value is None or emp_id_value == 0:
                        current_app.logger.info(f"✅ Removendo vínculo com empreendimento (valor = {emp_id_value})")
                        prop.empreendimento_id = None
                    else:
                        current_app.logger.info(f"✅ Setando prop.empreendimento_id = {emp_id_value}")
                        prop.empreendimento_id = emp_id_value
                # PRIORIDADE 2: Se veio nome, buscar/criar
                elif data.get('building_name') or data.get('nome_empreendimento'):
                    emp_id = EmpreendimentoHelper.get_or_create_empreendimento(data, g.tenant_id)
                    current_app.logger.info(f"✅ Criado/encontrado empreendimento ID = {emp_id}")
                    prop.empreendimento_id = emp_id
            except Exception as e:
                current_app.logger.warning(f"❌ update_property: Falha ao vincular empreendimento: {e}")
                current_app.logger.exception("Stack trace completo:")

            # Atualizar características do empreendimento com auditoria
            if 'empreendimento_caracteristicas' in data and prop.empreendimento_id:
                try:
                    user_id = get_jwt_identity()
                    tenant_id = getattr(g, 'tenant_id', None)
                    PropertyService._update_empreendimento_caracteristicas(
                        prop.empreendimento_id,
                        data['empreendimento_caracteristicas'],
                        user_id=user_id,
                        tenant_id=tenant_id
                    )
                except Exception as audit_err:
                    current_app.logger.warning(f"Falha ao auditar características: {audit_err}")

            # Commit local changes ASAP so remote sync can read latest state
            db.session.commit()

            # Start remote sync using exporter-like steps (outside transaction scope)
            try:
                from utils.integration_tokens import get_valid_integration_headers
                from integrations.gandalf_service import update_listing, create_listing, get_listing_by_external_id
                from integrations.canalpro_exporter import CanalProExporter

                # Attempt to obtain credentials for Gandalf/CanalPro
                try:
                    creds = get_valid_integration_headers(g.tenant_id, 'gandalf')
                    current_app.logger.info(f"Property {property_id}: Credentials obtained: {list(creds.keys())}")
                    current_app.logger.debug(f"Property {property_id}: Full credentials: {creds}")
                except Exception as cred_error:
                    error_msg = f"CanalPro credentials not available for tenant {g.tenant_id}: {str(cred_error)}"
                    current_app.logger.info(error_msg)
                    # Return local result; do not fail update if no integration configured
                    return True, PropertySerializer.to_dict(prop, include_full_data=True)

                # Local fallback: garantir que os headers obrigatórios estejam presentes
                # (opção rápida — não substitui correção definitiva no utilitário de tokens)
                import os
                try:
                    creds = creds.copy()
                    env_map = {
                        'publisher_id': 'GANDALF_PUBLISHER_ID',
                        'odin_id': 'GANDALF_ODIN_ID',
                        'contract_id': 'GANDALF_CONTRACT_ID',
                        'client_id': 'GANDALF_CLIENT_ID',
                        'company': 'GANDALF_COMPANY'
                    }
                    applied = []
                    for k, env_name in env_map.items():
                        v = os.getenv(env_name)
                        if v:  # only apply when env var is set/truthy
                            creds.setdefault(k, v)
                            applied.append(k)
                    current_app.logger.info(f"Property {property_id}: Credentials after local fallbacks keys={list(creds.keys())} applied={applied}")
                except Exception:
                    current_app.logger.warning(f"Property {property_id}: Failed to apply local credential fallbacks")

                # Use exporter utilities to build payload and upload images consistently
                exporter = CanalProExporter(tenant_id=g.tenant_id)
                exporter.credentials = creds
                listing_payload = exporter.convert_property_to_canalpro_format(prop)

                # Ensure images are uploaded and payload contains valid URLs
                if not listing_payload.get('images') or len(listing_payload.get('images')) == 0:
                    try:
                        uploaded = exporter.upload_property_images(prop)
                        listing_payload['images'] = [{"imageUrl": u} for u in uploaded]
                    except Exception as e:
                        current_app.logger.warning(f"Image upload during update_property failed: {e}")

                result = None

                # 1) Try update by stored remote_id with retry logic
                remote_id = getattr(prop, 'remote_id', None)
                if remote_id:
                    for attempt in range(3):  # Try up to 3 times
                        try:
                            listing_payload['id'] = str(remote_id)
                            current_app.logger.info(f"Attempting Gandalf update by remote_id {remote_id} for property {prop.id} (attempt {attempt + 1}/3)")
                            current_app.logger.debug("Update payload (truncated): %s", json.dumps(listing_payload, default=str)[:4000])
                            result = update_listing(listing_payload, creds)
                            current_app.logger.debug("Update response (truncated): %s", str(result)[:8000])
                            break  # Success, exit retry loop
                        except Exception as e:
                            error_msg = str(e)
                            # Check if it's a retryable error (500, transaction errors)
                            is_retryable = ('500' in error_msg or 'TransactionSystemException' in error_msg or
                                          'Could not commit' in error_msg or 'internal server error' in error_msg)

                            if attempt < 2 and is_retryable:  # Retry if not last attempt and error is retryable
                                import time
                                wait_time = (attempt + 1) * 2  # 2s, 4s
                                current_app.logger.warning(f"Retryable error on attempt {attempt + 1}, waiting {wait_time}s: {e}")
                                time.sleep(wait_time)
                                continue
                            else:
                                current_app.logger.warning(f"Failed to update listing {remote_id} after {attempt + 1} attempts, will attempt reconcile/create: {e}")
                                current_app.logger.debug(traceback.format_exc())
                                break

                # 2) If no result, try reconcile by externalId and update
                if result is None and listing_payload.get('externalId'):
                    try:
                        current_app.logger.info(f"Reconciling by externalId {listing_payload.get('externalId')} for property {prop.id}")
                        found = get_listing_by_external_id(creds, listing_payload.get('externalId'))
                        current_app.logger.debug("Reconcile found (truncated): %s", str(found)[:4000])
                        if isinstance(found, list) and len(found) > 0:
                            found_id = found[0].get('id')
                            if found_id:
                                current_app.logger.info(f"Found remote listing id {found_id}; attempting UPDATE")
                                listing_payload['id'] = str(found_id)
                                current_app.logger.debug("Update payload (reconciled) (truncated): %s", json.dumps(listing_payload, default=str)[:4000])
                                result = update_listing(listing_payload, creds)
                                current_app.logger.debug("Reconciled update response (truncated): %s", str(result)[:8000])
                                # persist resolved remote_id
                                prop.remote_id = found_id
                    except Exception as e:
                        current_app.logger.warning(f"Error reconciling by externalId during update_property: {e}")
                        current_app.logger.debug(traceback.format_exc())

                # 3) If still no result, create listing with retry
                if result is None:
                    for attempt in range(3):  # Try up to 3 times
                        try:
                            current_app.logger.info(f"No update result; attempting create for property {prop.id} (externalId={listing_payload.get('externalId')}) (attempt {attempt + 1}/3)")
                            current_app.logger.debug("Create payload (truncated): %s", json.dumps(listing_payload, default=str)[:4000])
                            result = create_listing(listing_payload, creds)
                            current_app.logger.debug("Create response (truncated): %s", str(result)[:8000])
                            break  # Success, exit retry loop
                        except Exception as e:
                            error_msg = str(e)
                            # Check if it's a retryable error
                            is_retryable = ('500' in error_msg or 'TransactionSystemException' in error_msg or
                                          'Could not commit' in error_msg or 'internal server error' in error_msg)

                            if attempt < 2 and is_retryable:  # Retry if not last attempt and error is retryable
                                import time
                                wait_time = (attempt + 1) * 2  # 2s, 4s
                                current_app.logger.warning(f"Retryable error on create attempt {attempt + 1}, waiting {wait_time}s: {e}")
                                time.sleep(wait_time)
                                continue
                            else:
                                current_app.logger.exception(f"Error creating listing during update_property after {attempt + 1} attempts: {e}")
                                current_app.logger.debug(traceback.format_exc())
                                result = {'error': str(e)}
                                break

                # 4) Process response and persist remote_id/status
                if result:
                    try:
                        current_app.logger.debug("Raw Gandalf result before processing: %s", str(result)[:12000])

                        # Store original remote_id to avoid corruption
                        original_remote_id = getattr(prop, 'remote_id', None)

                        # Handle GraphQL errors (status 200 but with errors array)
                        if isinstance(result, dict) and result.get('errors'):
                            errors = result.get('errors', [])
                            error_messages = [e.get('message', str(e)) for e in errors]
                            raise Exception(f'Gandalf GraphQL errors: {error_messages}')

                        # Handle successful responses
                        if 'data' in result and 'updateListing' in result['data']:
                            block = result['data']['updateListing']
                            if block is None:
                                raise Exception('updateListing returned null - likely server error')
                            gid = block.get('id')
                            errors = block.get('errors', [])
                        elif 'data' in result and 'createListing' in result['data']:
                            block = result['data']['createListing']
                            if block is None:
                                raise Exception('createListing returned null - likely server error')
                            gid = block.get('id')
                            errors = block.get('errors', [])
                        elif isinstance(result, dict) and result.get('error'):
                            raise Exception(result.get('error'))
                        else:
                            raise Exception(f'Unexpected response from Gandalf: {result}')

                        if errors:
                            current_app.logger.error(f"Gandalf returned errors during update_property for prop {prop.id}: {errors}")
                            # Store error in property for user visibility
                            prop.error = json.dumps(errors) if isinstance(errors, list) else str(errors)
                            prop.status = 'error'
                            # Update timestamp
                            from datetime import datetime
                            prop.updated_at = datetime.utcnow()
                            db.session.commit()
                        else:
                            current_app.logger.info(f"Gandalf operation successful for property {prop.id}. remote_id={gid}")
                            prop.status = 'exported'
                            if gid:
                                prop.remote_id = gid
                                current_app.logger.info(f"Updated remote_id from {original_remote_id} to {gid} for property {prop.id}")
                            prop.error = None
                            # update timestamp and commit
                            from datetime import datetime
                            prop.updated_at = datetime.utcnow()
                            db.session.commit()

                    except Exception as e:
                        current_app.logger.exception(f"Error processing Gandalf response during update_property: {e}")
                        current_app.logger.debug(traceback.format_exc())
                        # Don't rollback - let the outer exception handler deal with it

            except Exception as e:
                # Any unexpected errors during remote sync should be logged but not fail the API
                current_app.logger.exception(f"Unexpected error while syncing to CanalPro in update_property: {e}")
                current_app.logger.debug(traceback.format_exc())

            return True, PropertySerializer.to_dict(prop, include_full_data=True)

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating property {property_id}: {str(e)}")
            current_app.logger.debug(traceback.format_exc())
            return False, {
                'message': f'Error updating property: {str(e)}',
                'status': 500,
                'error': str(e)
            }
    
    @staticmethod
    def _update_empreendimento_caracteristicas(
        empreendimento_id: int,
        new_caracteristicas: List[str],
        user_id: int,
        tenant_id: int
    ) -> None:
        """
        Atualiza características do empreendimento com auditoria completa.
        
        Args:
            empreendimento_id: ID do empreendimento a atualizar
            new_caracteristicas: Nova lista de características
            user_id: ID do usuário que está fazendo a alteração
            tenant_id: ID do tenant do usuário
        """
        try:
            from flask import request
            
            # Buscar empreendimento
            empreendimento = db.session.query(Empreendimento).filter_by(id=empreendimento_id).first()
            if not empreendimento:
                current_app.logger.warning(f"Empreendimento {empreendimento_id} não encontrado para atualizar características")
                return
            
            # Obter características antigas
            old_caracteristicas = empreendimento.caracteristicas or []
            
            # Detectar mudanças
            added = set(new_caracteristicas) - set(old_caracteristicas)
            removed = set(old_caracteristicas) - set(new_caracteristicas)
            
            if added or removed:
                # Criar registro de auditoria
                audit_log = EmpreendimentoAuditLog(
                    empreendimento_id=empreendimento_id,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    action='update_caracteristicas',
                    field_name='caracteristicas',
                    old_value=old_caracteristicas,
                    new_value=new_caracteristicas,
                    changes={
                        'added': list(added),
                        'removed': list(removed)
                    },
                    ip_address=request.remote_addr if request else None,
                    user_agent=request.headers.get('User-Agent') if request else None
                )
                
                # Atualizar características
                empreendimento.caracteristicas = new_caracteristicas
                
                # Salvar auditoria e mudanças
                db.session.add(audit_log)
                db.session.flush()
                
                current_app.logger.info(
                    f"✅ Características do empreendimento {empreendimento_id} atualizadas por user {user_id}. "
                    f"Adicionados: {added}, Removidos: {removed}"
                )
            else:
                current_app.logger.info(f"ℹ️ Características do empreendimento {empreendimento_id} não mudaram")
                
        except Exception as e:
            current_app.logger.error(f"Erro ao atualizar características do empreendimento {empreendimento_id}: {e}")
            current_app.logger.debug(traceback.format_exc())
            # Não fazer rollback - deixar a transação principal decidir
    
    @staticmethod
    def _update_basic_fields(prop: Property, data: Dict[str, Any]) -> None:
        """Update basic property fields."""
        if 'title' in data:
            prop.title = data['title']
        if 'description' in data:
            prop.description = data['description']
        if 'external_id' in data:
            prop.external_id = data['external_id']
        if 'image_urls' in data:
            prop.image_urls = data['image_urls']
        if 'status' in data:
            prop.status = data['status']
        if 'remote_id' in data:
            prop.remote_id = data['remote_id']
    
    @staticmethod
    def _update_address_fields(prop: Property, data: Dict[str, Any]) -> None:
        """Update property address fields."""
        address = data.get('address', {})
        if address:
            prop.address_street = address.get('street', prop.address_street)
            prop.address_number = address.get('street_number', prop.address_number)
            prop.address_neighborhood = address.get('neighborhood', prop.address_neighborhood)
            prop.address_city = address.get('city', prop.address_city)
            prop.address_state = address.get('state', prop.address_state)
            prop.address_zip = address.get('zip_code', prop.address_zip)
            prop.address_complement = address.get('complement', prop.address_complement)
        
        # Direct root fields
        if 'cep' in data:
            prop.address_zip = data['cep']
        if 'endereco' in data:
            prop.address_street = data['endereco']
        if 'numero' in data:
            prop.address_number = data['numero']
        if 'complemento' in data:
            prop.address_complement = data['complemento']
        if 'bairro' in data:
            prop.address_neighborhood = data['bairro']
        if 'cidade' in data:
            prop.address_city = data['cidade']
        if 'estado' in data:
            prop.address_state = data['estado']
    
    @staticmethod
    def _update_physical_fields(prop: Property, data: Dict[str, Any]) -> None:
        """Update physical property attributes."""
        field_mappings = {
            'bedrooms': ['bedrooms', 'quartos'],
            'bathrooms': ['bathrooms', 'banheiros'],
            'suites': ['suites'],
            'parking_spaces': ['garage_spots', 'parking_spaces', 'vagas_garagem'],
            'usable_area': ['usable_areas', 'area_util'],  # Priorizar frontend
            'total_area': ['total_areas', 'area_total']  # Priorizar frontend
        }
        
        for prop_field, data_fields in field_mappings.items():
            for data_field in data_fields:
                if data_field in data:
                    value = data[data_field]
                    # DEBUG: Log para área total
                    if prop_field == 'total_area':
                        current_app.logger.info(f"🔍 DEBUG total_area: campo={data_field}, valor_recebido={value}, tipo={type(value)}")
                    setattr(prop, prop_field, value)
                    break
    
    @staticmethod
    def _update_pricing_fields(prop: Property, data: Dict[str, Any]) -> None:
        """Update pricing fields."""
        pricing_mappings = {
            'price': ['price_sale', 'preco_venda'],
            'price_rent': ['price_rent', 'preco_locacao'],
            'condo_fee': ['condo_fee', 'condominio'],
            'iptu': ['iptu'],
            'condo_fee_exempt': ['condo_fee_exempt'],
            'iptu_exempt': ['iptu_exempt'],
            'iptu_period': ['iptu_period'],
            # ✨ NOVO: Campos de classificação e facilidades de negociação
            'property_standard': ['property_standard'],
            'accepts_financing': ['accepts_financing'],
            'financing_details': ['financing_details'],
            'accepts_exchange': ['accepts_exchange'],
            'exchange_details': ['exchange_details']
        }
        
        for prop_field, data_fields in pricing_mappings.items():
            for data_field in data_fields:
                if data_field in data:
                    setattr(prop, prop_field, data[data_field])
                    break
    
    @staticmethod
    def _update_type_fields(prop: Property, data: Dict[str, Any]) -> None:
        """Update property type fields."""
        # Mapear e normalizar tipo e categoria
        property_type = data.get('property_type')
        category = data.get('category')
        
        # 🔍 DEBUG TEMPORÁRIO
        print(f"\n{'='*80}")
        print(f"🔍 DEBUG _update_type_fields:")
        print(f"   property_type recebido: {repr(property_type)}")
        print(f"   category recebido: {repr(category)}")
        print(f"   category é None? {category is None}")
        print(f"   category é vazio? {category == ''}")
        print(f"{'='*80}\n")
        
        if property_type:
            normalized_type, normalized_category = PropertyService.map_property_category(property_type, category)
            prop.property_type = normalized_type
            
            # 🔧 CORREÇÃO: SEMPRE usar categoria normalizada (com acento bonito)
            # Isso garante que "TERREA" vire "Térrea"
            if normalized_category:
                prop.category = normalized_category
                print(f"✅ Categoria normalizada aplicada: {repr(normalized_category)}")
            else:
                print(f"⚠️ Nenhuma categoria normalizada disponível")
            
            # 🔧 CORREÇÃO: Limpar unit_types quando property_type muda
            # O exporter vai recalcular baseado no property_type atualizado
            # Isso garante que unit_types antigos/incorretos não persistam
            if 'unit_types' not in data:
                prop.unit_types = None
        
        # Outros campos de tipo
        other_type_fields = [
            'business_type', 'listing_type', 'unit_types', 'unit_subtypes'
        ]
        
        for field in other_type_fields:
            if field in data:
                setattr(prop, field, data[field])
        
        # Handle usage_types - convert single usage_type to array
        if 'usage_type' in data:
            usage_type_value = data['usage_type']
            if usage_type_value:
                prop.usage_types = [usage_type_value]
        elif 'usage_types' in data:
            prop.usage_types = data['usage_types']

        # Mapear publication_type com normalização de aliases
        if 'publication_type' in data:
            pub = data.get('publication_type')
            if isinstance(pub, str) and pub:
                normalized = pub.strip().upper().replace(' ', '_')
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
                normalized = alias_map.get(normalized, normalized)
                valid = {'STANDARD', 'PREMIUM', 'SUPER_PREMIUM', 'PREMIERE_1', 'PREMIERE_2', 'TRIPLE'}
                prop.publication_type = normalized if normalized in valid else 'STANDARD'
    
    @staticmethod
    def _update_media_fields(prop: Property, data: Dict[str, Any]) -> None:
        """Update media fields."""
        media_fields = [
            'amenities', 'videos', 'video_tour_link', 
            'features', 'custom_features'
        ]
        
        
        for field in media_fields:
            if field in data:
                # Simplesmente atualizar o campo com o valor recebido
                # Isso permite arrays vazios [] e valores válidos
                setattr(prop, field, data[field])
    
    @staticmethod
    def _update_location_fields(prop: Property, data: Dict[str, Any]) -> None:
        """Update location fields."""
        location_fields = ['latitude', 'longitude', 'display_latitude', 'display_longitude']
        
        for field in location_fields:
            if field in data:
                setattr(prop, field, data[field])
    
    @staticmethod
    def _update_building_fields(prop: Property, data: Dict[str, Any]) -> None:
        """Update building/condominium structural fields."""
        building_mappings = {
            'unit_floor': ['unit_floor', 'andar_unidade'],
            'unit': ['unit', 'unidade'],
            'block': ['block', 'bloco']
        }
        
        for prop_field, data_fields in building_mappings.items():
            for data_field in data_fields:
                if data_field in data and data[data_field] is not None:
                    setattr(prop, prop_field, data[data_field])
                    break
    
    @staticmethod
    def _update_condo_fields(prop: Property, data: Dict[str, Any]) -> None:
        """DEPRECATED: no-op. Campos de empreendimento agora são centralizados na tabela empreendimentos."""
        return None
    
    @staticmethod
    def get_property(property_id: int) -> Tuple[bool, Dict[str, Any]]:
        """Get a single property by ID."""
        prop = Property.query.filter_by(id=property_id, tenant_id=g.tenant_id).first()
        
        if not prop:
            return False, {'message': 'Property not found', 'status': 404}
        
        return True, PropertySerializer.to_dict(prop, include_full_data=True)
    
    @staticmethod
    def get_property_public(property_id: int) -> Tuple[bool, Dict[str, Any]]:
        """Get a single property by ID (public endpoint)."""
        prop = Property.query.filter_by(id=property_id).first()
        
        if not prop:
            return False, {'message': 'Property not found', 'status': 404}
        
        return True, PropertySerializer.to_dict(prop, include_full_data=True)
    
    @staticmethod
    def delete_property(property_id: int) -> Tuple[bool, Dict[str, Any]]:
        """Delete a property and sync deletion to CanalPro (Gandalf) if it was exported.

        NEW APPROACH: Try CanalPro deletion FIRST, then local deletion only if remote succeeds.
        This ensures data consistency between systems.

        Args:
            property_id: ID of the property to delete

        Returns:
            Tuple[bool, Dict[str, Any]]: (success, response_data)
        """
        try:
            prop = Property.query.filter_by(id=property_id, tenant_id=g.tenant_id).first()

            if not prop:
                return False, {
                    'message': 'Property not found',
                    'status': 404,
                    'canalpro_status': 'not_applicable',
                    'local_status': 'not_found'
                }

            # Check if property was exported to CanalPro
            remote_id = getattr(prop, 'remote_id', None)
            canalpro_details = {
                'attempted': False,
                'success': False,
                'error': None,
                'response': None,
                'has_remote_id': remote_id is not None
            }

            current_app.logger.info(f"Property {prop.id} deletion initiated - remote_id: {remote_id}")

            # STEP 1: If property has remote_id, attempt CanalPro deletion FIRST
            if remote_id:
                canalpro_details['attempted'] = True
                current_app.logger.info(f"Property {prop.id} has remote_id {remote_id}, attempting CanalPro deletion FIRST")

                try:
                    from utils.integration_tokens import get_valid_integration_headers
                    from integrations.gandalf_service import bulk_delete_listing

                    # Attempt to obtain credentials for Gandalf/CanalPro
                    try:
                        creds = get_valid_integration_headers(g.tenant_id, 'gandalf')
                        current_app.logger.info(f"Property {property_id}: Credentials obtained: {list(creds.keys())}")
                        current_app.logger.debug(f"Property {property_id}: Full credentials: {creds}")
                    except Exception as cred_error:
                        error_msg = f"CanalPro credentials not available: {str(cred_error)}"
                        current_app.logger.warning(f"Property {prop.id}: {error_msg}")
                        canalpro_details['error'] = error_msg
                        # Return early - cannot proceed without credentials
                        return False, {
                            'message': f'Cannot delete property: {error_msg}',
                            'status': 500,
                            'canalpro_status': 'credentials_failed',
                            'local_status': 'not_attempted',
                            'canalpro_details': canalpro_details
                        }

                    # Local fallback: garantir que os headers obrigatórios estejam presentes
                    # (opção rápida — não substitui correção definitiva no utilitário de tokens)
                    import os
                    try:
                        creds = creds.copy()
                        env_map = {
                            'publisher_id': 'GANDALF_PUBLISHER_ID',
                            'odin_id': 'GANDALF_ODIN_ID',
                            'contract_id': 'GANDALF_CONTRACT_ID',
                            'client_id': 'GANDALF_CLIENT_ID',
                            'company': 'GANDALF_COMPANY'
                        }
                        applied = []
                        for k, env_name in env_map.items():
                            v = os.getenv(env_name)
                            if v:  # only apply when env var is set/truthy
                                creds.setdefault(k, v)
                                applied.append(k)
                        current_app.logger.info(f"Property {property_id}: Credentials after local fallbacks keys={list(creds.keys())} applied={applied}")
                    except Exception:
                        current_app.logger.warning(f"Property {property_id}: Failed to apply local credential fallbacks")

                    # Attempt remote deletion with detailed error handling
                    try:
                        current_app.logger.info(f"Calling bulk_delete_listing for property {prop.id} with remote_id {remote_id}")
                        result = bulk_delete_listing([str(remote_id)], creds)
                        canalpro_details['response'] = result

                        current_app.logger.debug(f"Bulk delete response for property {prop.id}: {str(result)[:2000]}")

                        # Handle GraphQL errors (status 200 but with errors array)
                        if isinstance(result, dict) and result.get('errors'):
                            errors = result.get('errors', [])
                            error_messages = [e.get('message', str(e)) for e in errors]
                            error_msg = f'Gandalf GraphQL errors: {error_messages}'
                            current_app.logger.warning(f"Property {prop.id}: {error_msg}")
                            
                            # Check if errors indicate the listing was already deleted
                            error_text = ' '.join(error_messages).lower()
                            if ('not found' in error_text or 'does not exist' in error_text or 
                                'already deleted' in error_text or 'no such listing' in error_text):
                                current_app.logger.warning(f"Property {prop.id}: Listing not found in CanalPro (possibly already deleted)")
                                canalpro_details['success'] = True
                                canalpro_details['note'] = 'Listing was already deleted from CanalPro'
                                canalpro_details['error'] = error_msg  # Keep for reference
                            else:
                                canalpro_details['error'] = error_msg
                                return False, {
                                    'message': f'CanalPro deletion failed: {error_msg}',
                                    'status': 500,
                                    'canalpro_status': 'graphql_errors',
                                    'local_status': 'not_attempted',
                                    'canalpro_details': canalpro_details
                                }

                        # Check for successful deletion
                        elif isinstance(result, dict) and 'data' in result and 'bulkDeleteListing' in result['data']:
                            block = result['data']['bulkDeleteListing']
                            if block and 'message' in block:
                                message = block['message']
                                current_app.logger.info(f"CanalPro response message for property {prop.id}: {message}")

                                # Check various success/failure indicators
                                message_lower = message.lower()
                                if ('deleted successfully' in message_lower or 
                                    'successfully deleted' in message_lower or
                                    'deleted' in message_lower and 'success' in message_lower):
                                    current_app.logger.info(f"✅ Successfully deleted property {prop.id} from CanalPro")
                                    canalpro_details['success'] = True
                                elif ('not found' in message_lower or 'does not exist' in message_lower or 
                                      'already deleted' in message_lower or 'no such listing' in message_lower):
                                    current_app.logger.warning(f"Property {prop.id}: Listing not found in CanalPro (possivelmente já deletado)")
                                    canalpro_details['success'] = True
                                    canalpro_details['note'] = 'Listing was already deleted from CanalPro'
                                elif 'failed to delete' in message_lower:
                                    # Check if it's a specific "already deleted" case
                                    if str(remote_id) in message:
                                        current_app.logger.warning(f"Property {prop.id}: Failed to delete {remote_id}, possivelmente já deletado")
                                        canalpro_details['success'] = True
                                        canalpro_details['note'] = 'Listing was already deleted from CanalPro'
                                    else:
                                        error_msg = f"CanalPro deletion failed: {message}"
                                        current_app.logger.warning(f"Property {prop.id}: {error_msg}")
                                        canalpro_details['error'] = error_msg
                                        return False, {
                                            'message': error_msg,
                                            'status': 500,
                                            'canalpro_status': 'deletion_failed',
                                            'local_status': 'not_attempted',
                                            'canalpro_details': canalpro_details
                                        }
                                else:
                                    error_msg = f"Unexpected CanalPro response: {message}"
                                    current_app.logger.warning(f"Property {prop.id}: {error_msg}")
                                    canalpro_details['error'] = error_msg
                                    return False, {
                                        'message': f'CanalPro deletion failed: {message}',
                                        'status': 500,
                                        'canalpro_status': 'unexpected_response',
                                        'local_status': 'not_attempted',
                                        'canalpro_details': canalpro_details
                                    }
                            else:
                                current_app.logger.warning(f"Property {prop.id}: No message in deletion block: {block}")
                                error_msg = "Invalid CanalPro deletion response structure"
                                canalpro_details['error'] = error_msg
                                return False, {
                                    'message': 'CanalPro deletion failed: Invalid response structure',
                                    'status': 500,
                                    'canalpro_status': 'invalid_response',
                                    'local_status': 'not_attempted',
                                    'canalpro_details': canalpro_details
                                }
                        else:
                            current_app.logger.warning(f"Property {prop.id}: Unexpected deletion response structure: {result}")
                            error_msg = f"Unexpected CanalPro deletion response: {result}"
                            canalpro_details['error'] = error_msg
                            return False, {
                                'message': 'CanalPro deletion failed: Unexpected response format',
                                'status': 500,
                                'canalpro_status': 'unexpected_format',
                                'local_status': 'not_attempted',
                                'canalpro_details': canalpro_details
                            }

                    except Exception as delete_error:
                        error_msg = str(delete_error)
                        current_app.logger.error(f"Property {prop.id}: CanalPro deletion request failed: {error_msg}")
                        current_app.logger.debug(f"Full traceback: {traceback.format_exc()}")
                        
                        # Check if the error indicates the listing was already deleted
                        if 'not found' in error_msg.lower() or 'does not exist' in error_msg.lower() or 'already deleted' in error_msg.lower():
                            current_app.logger.warning(f"Property {prop.id}: Listing not found in CanalPro (possibly already deleted manually)")
                            canalpro_details['success'] = True
                            canalpro_details['note'] = 'Listing was already deleted from CanalPro'
                            canalpro_details['error'] = error_msg  # Keep for reference
                        else:
                            canalpro_details['error'] = error_msg
                            return False, {
                                'message': f'CanalPro deletion failed: {error_msg}',
                                'status': 500,
                                'canalpro_status': 'request_failed',
                                'local_status': 'not_attempted',
                                'canalpro_details': canalpro_details
                            }

                except Exception as general_error:
                    error_msg = f"Unexpected error during CanalPro deletion: {str(general_error)}"
                    current_app.logger.exception(f"Property {prop.id}: {error_msg}")
                    canalpro_details['error'] = error_msg
                    return False, {
                        'message': f'CanalPro deletion failed: {str(general_error)}',
                        'status': 500,
                        'canalpro_status': 'unexpected_error',
                        'local_status': 'not_attempted',
                        'canalpro_details': canalpro_details
                    }

            # STEP 2: Only proceed with local deletion if CanalPro deletion succeeded (or wasn't needed)
            current_app.logger.info(f"Proceeding with local deletion for property {prop.id}")

            try:
                db.session.delete(prop)
                db.session.commit()
                current_app.logger.info(f"✅ Successfully deleted property {prop.id} from local database")

                # Prepare success response
                response_message = 'Property deleted successfully'
                if remote_id:
                    response_message += ' (also deleted from CanalPro)'
                else:
                    response_message += ' (no CanalPro sync needed)'

                return True, {
                    'message': response_message,
                    'status': 200,
                    'canalpro_status': 'success' if canalpro_details['success'] else ('not_needed' if not remote_id else 'failed'),
                    'local_status': 'success',
                    'canalpro_details': canalpro_details
                }

            except Exception as db_error:
                db.session.rollback()
                error_msg = f"Local database deletion failed: {str(db_error)}"
                current_app.logger.error(f"Property {prop.id}: {error_msg}")

                # If local deletion fails but CanalPro succeeded, we have inconsistency
                if canalpro_details['success']:
                    current_app.logger.critical(f"CRITICAL: Property {prop.id} deleted from CanalPro but local deletion failed!")

                return False, {
                    'message': error_msg,
                    'status': 500,
                    'canalpro_status': 'success' if canalpro_details['success'] else ('not_needed' if not remote_id else 'failed'),
                    'local_status': 'failed',
                    'canalpro_details': canalpro_details,
                    'consistency_issue': canalpro_details['success']
                }

        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Unexpected error deleting property {property_id}: {str(e)}")
            return False, {
                'message': f'Unexpected error: {str(e)}',
                'status': 500,
                'canalpro_status': 'unknown',
                'local_status': 'unknown'
            }
    
    @staticmethod
    def get_properties_stats() -> Tuple[bool, Dict[str, Any]]:
        """Get property statistics."""
        try:
            # Total properties count
            total_properties = Property.query.filter_by(tenant_id=g.tenant_id).count()
            
            # Status counts with summary
            status_query = db.session.query(
                Property.status,
                func.count(Property.id)
            ).filter_by(tenant_id=g.tenant_id).group_by(Property.status).all()

            raw_status_counts = {status: count for status, count in status_query}
            status_summary = aggregate_status_counts(raw_status_counts)
            status_counts = status_summary['counts_by_key']
            
            # Average price
            avg_price_query = db.session.query(
                func.avg(Property.price)
            ).filter(Property.tenant_id == g.tenant_id, Property.price.isnot(None)).scalar()
            
            avg_price = float(avg_price_query) if avg_price_query else 0
            
            # Recent properties
            recent_properties = Property.query.filter_by(
                tenant_id=g.tenant_id
            ).order_by(Property.id.desc()).limit(5).all()
            
            recent_list = []
            for prop in recent_properties:
                recent_list.append({
                    'id': prop.id,
                    'title': prop.title,
                    'external_id': prop.external_id,
                    'status': prop.status,
                    'price': prop.price
                })
            
            # City distribution
            city_counts = {}
            city_query = db.session.query(
                Property.address_city,
                func.count(Property.id)
            ).filter(
                Property.tenant_id == g.tenant_id,
                Property.address_city.isnot(None)
            ).group_by(Property.address_city).all()
            
            for city, count in city_query:
                if city:
                    city_counts[city] = count
            
            stats = {
                'total_properties': total_properties,
                'status_counts': status_counts,
                'status_summary': status_summary,
                'average_price': avg_price,
                'recent_properties': recent_list,
                'city_distribution': city_counts
            }
            
            return True, stats
            
        except Exception as e:
            return False, {
                'message': f'Error fetching stats: {str(e)}',
                'status': 500
            }
    
    @staticmethod
    def _generate_property_code(property_type: str, tenant_id: int) -> str:
        """Gerar código padronizado para o imóvel: Prefixo + números aleatórios + -tenant_id
        Ex: AP2536-2

        Baseado na hierarquia de tipos de imóveis:
        - AP: Apartamento
        - CA: Casa
        - CC: Casa de Condomínio
        - CV: Casa de Vila
        - CO: Cobertura
        - FA: Fazenda/Sítio/Chácara
        - FL: Flat
        - KI: Kitnet/Conjugado
        - LF: Loft
        - TE: Lote/Terreno
        - PR: Prédio/Edifício Inteiro
        - ST: Studio
        """
        prefix_map = {
            # Apartamento e variações
            'APARTMENT': 'AP',
            'APARTAMENTO': 'AP',
            'APARTAMENTO_PADRAO': 'AP',
            'APARTAMENTO_DUPLEX': 'AP',
            'APARTAMENTO_TRIPLEX': 'AP',

            # Casa e variações
            'HOUSE': 'CA',
            'CASA': 'CA',
            'CASA_TERREA': 'CA',
            'CASA_PADRAO': 'CA',
            'CASA_SOBRADO': 'CA',
            'CASA_KITNET': 'CA',
            'CASA_CONJUGADO': 'CA',

            # Casa de Condomínio
            'CASA_CONDOMINIO': 'CC',
            'CASA_CONDOMINIO_TERREA': 'CC',
            'CASA_CONDOMINIO_SOBRADO': 'CC',
            'CASA_CONDOMINIO_PADRAO': 'CC',

            # Casa de Vila
            'CASA_VILA': 'CV',
            'CASA_VILA_TERREA': 'CV',
            'CASA_VILA_SOBRADO': 'CV',
            'CASA_VILA_PADRAO': 'CV',

            # Cobertura
            'PENTHOUSE': 'CO',
            'COBERTURA': 'CO',
            'COBERTURA_PADRAO': 'CO',
            'COBERTURA_DUPLEX': 'CO',
            'COBERTURA_TRIPLEX': 'CO',

            # Fazenda/Sítio/Chácara
            'FARM': 'FA',
            'RANCH': 'FA',
            'SITIO': 'FA',
            'CHACARA': 'FA',
            'FAZENDA': 'FA',
            'FAZENDA_SITIO_CHACARA': 'FA',

            # Flat
            'FLAT': 'FL',

            # Kitnet/Conjugado
            'KITNET': 'KI',
            'CONJUGADO': 'KI',
            'KITNET_CONJUGADO': 'KI',

            # Loft
            'LOFT': 'LF',
            'LOFT_PADRAO': 'LF',
            'LOFT_COBERTURA': 'LF',
            'LOFT_DUPLEX': 'LF',
            'LOFT_TRIPLEX': 'LF',

            # Lote/Terreno
            'LAND': 'TE',
            'LOTE': 'TE',
            'TERRENO': 'TE',
            'LOTE_TERRENO': 'TE',
            'LOTE_PADRAO': 'TE',
            'LOTE_CONDOMINIO': 'TE',
            'LOTE_VILA': 'TE',

            # Prédio/Edifício
            'BUILDING': 'PR',
            'PREDIO': 'PR',
            'EDIFICIO': 'PR',
            'PREDIO_EDIFICIO_INTEIRO': 'PR',

            # Studio
            'STUDIO': 'ST',

            # Outros tipos que podem aparecer
            'DUPLEX': 'DX',
            'TRIPLEX': 'TX',
            'ROOM': 'RM',
            'WAREHOUSE': 'GA',
            'STORE': 'LO',
            'OFFICE': 'ES'
        }

        prefix = prefix_map.get((property_type or '').upper().replace(' ', '_'), 'UN')
        rand = random.randint(1000, 9999)
        return f"{prefix}{rand}-{tenant_id}"
    
    @staticmethod
    def duplicate_property(property_id: int) -> Tuple[bool, Dict[str, Any]]:
        """Duplicate an existing property for the same tenant, assigning a new unique external_id and a new property_code.

        Returns a create-style response with the new property data.
        """
        try:
            orig = Property.query.filter_by(id=property_id, tenant_id=g.tenant_id).first()
            if not orig:
                return False, {'message': 'Property not found', 'status': 404}

            # Create empty instance and copy most fields (skip PKs, timestamps, remote linkage)
            new_prop = Property()
            for col in Property.__table__.columns:
                name = col.name
                if name in ('id', 'created_at', 'updated_at', 'remote_id', 'property_code'):
                    continue
                try:
                    setattr(new_prop, name, getattr(orig, name))
                except Exception:
                    # ignore any attribute we can't set
                    pass

            # Ensure tenant is correct
            new_prop.tenant_id = g.tenant_id

            # Generate a unique external_id for the duplicated property
            base_ext = (orig.external_id or f'copy-{orig.id}').strip()
            candidate = base_ext
            suffix = 1
            while Property.query.filter_by(external_id=candidate, tenant_id=g.tenant_id).first():
                candidate = f"{base_ext}-copy{suffix}"
                suffix += 1
            new_prop.external_id = candidate

            # Generate a new unique property_code
            code = PropertyService._generate_property_code(orig.property_type, g.tenant_id)
            # If collision (unlikely), regenerate until unique
            attempts = 0
            while Property.query.filter_by(property_code=code, tenant_id=g.tenant_id).first() and attempts < 10:
                code = PropertyService._generate_property_code(orig.property_type, g.tenant_id)
                attempts += 1
            new_prop.property_code = code

            # New duplicate should not carry remote_id or publication state
            new_prop.remote_id = None
            new_prop.status = 'pending'
            new_prop.error = None

            db.session.add(new_prop)
            db.session.commit()

            return True, PropertySerializer.to_create_response(new_prop)
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception('Error duplicating property %s: %s', property_id, str(e))
            return False, {'message': 'Error duplicating property', 'error': str(e), 'status': 500}
    
    @staticmethod
    @staticmethod
    def refresh_property(property_id: int, tenant_id: int = None) -> Tuple[bool, Dict[str, Any]]:
        """
        Executa refresh de uma propriedade no CanalPro (delete + create)
        
        O refresh consiste em:
        1. Deletar o imóvel no CanalPro (se tiver remote_id)
        2. Recriar o imóvel no CanalPro com dados atualizados
        3. Atualizar remote_id local
        
        Args:
            property_id: ID da propriedade
            tenant_id: ID do tenant (opcional, será buscado da propriedade se não fornecido)
            
        Returns:
            Tuple[bool, Dict[str, Any]]: (sucesso, resultado)
        """
        try:
            # Buscar propriedade
            if tenant_id:
                prop = Property.query.filter_by(id=property_id, tenant_id=tenant_id).first()
            else:
                prop = Property.query.filter_by(id=property_id).first()
                
            if not prop:
                return False, {
                    'error': f'Property {property_id} not found',
                    'status': 404
                }
            
            current_app.logger.info(f"Starting refresh for property {property_id} ({prop.title})")
            
            refresh_details = {
                'property_id': property_id,
                'property_title': prop.title,
                'had_remote_id': prop.remote_id is not None,
                'original_remote_id': prop.remote_id,
                'delete_attempted': False,
                'delete_success': False,
                'create_attempted': False,
                'create_success': False,
                'new_remote_id': None,
                'errors': []
            }
            
            # ETAPA 1: Deletar do CanalPro se tiver remote_id
            if prop.remote_id:
                current_app.logger.info(f"Property {property_id} has remote_id {prop.remote_id}, attempting deletion from CanalPro")
                refresh_details['delete_attempted'] = True
                
                try:
                    from utils.integration_tokens import get_valid_integration_headers
                    from integrations.gandalf_service import bulk_delete_listing
                    
                    # Obter credenciais
                    try:
                        creds = get_valid_integration_headers(g.tenant_id, 'gandalf')
                        current_app.logger.info(f"Property {property_id}: Credentials obtained: {list(creds.keys())}")
                        current_app.logger.debug(f"Property {property_id}: Full credentials: {creds}")
                    except Exception as cred_error:
                        error_msg = f"Cannot obtain CanalPro credentials: {str(cred_error)}"
                        current_app.logger.error(f"Property {property_id}: {error_msg}")
                        refresh_details['errors'].append(error_msg)
                        return False, {
                            'error': error_msg,
                            'status': 500,
                            'refresh_details': refresh_details
                        }
                    
                    # Local fallback: garantir que os headers obrigatórios estejam presentes
                    # (opção rápida — não substitui correção definitiva no utilitário de tokens)
                    import os
                    try:
                        creds = creds.copy()
                        env_map = {
                            'publisher_id': 'GANDALF_PUBLISHER_ID',
                            'odin_id': 'GANDALF_ODIN_ID',
                            'contract_id': 'GANDALF_CONTRACT_ID',
                            'client_id': 'GANDALF_CLIENT_ID',
                            'company': 'GANDALF_COMPANY'
                        }
                        applied = []
                        for k, env_name in env_map.items():
                            v = os.getenv(env_name)
                            if v:  # only apply when env var is set/truthy
                                creds.setdefault(k, v)
                                applied.append(k)
                        current_app.logger.info(f"Property {property_id}: Credentials after local fallbacks keys={list(creds.keys())} applied={applied}")
                    except Exception:
                        current_app.logger.warning(f"Property {property_id}: Failed to apply local credential fallbacks")

                    # Tentar deletar
                    result = bulk_delete_listing([str(prop.remote_id)], creds)
                    
                    # Debug: Log da resposta completa
                    current_app.logger.info(f"Property {property_id}: Raw deletion response: {result}")
                    
                    # Verificar resultado da deleção com lógica mais robusta
                    if isinstance(result, dict):
                        # Verificar se há erros na resposta
                        if result.get('errors'):
                            errors = result.get('errors', [])
                            error_messages = []
                            for error in errors:
                                if isinstance(error, dict) and 'message' in error:
                                    error_messages.append(error['message'])
                                else:
                                    error_messages.append(str(error))
                            
                            error_msg = f"CanalPro deletion API errors: {'; '.join(error_messages)}"
                            refresh_details['errors'].append(error_msg)
                            current_app.logger.warning(f"Property {property_id}: {error_msg}")
                            
                            # Se o erro indica que o imóvel não existe, considerar como sucesso
                            if any('not found' in msg.lower() or 'não encontrado' in msg.lower() for msg in error_messages):
                                current_app.logger.info(f"Property {property_id}: Listing not found (already deleted), considering as success")
                                refresh_details['delete_success'] = True
                                prop.remote_id = None
                                db.session.commit()
                            else:
                                # Para outros erros, continuar com a criação
                                current_app.logger.info(f"Property {property_id}: Deletion failed with errors, proceeding with creation")
                        
                        # Verificar resposta de sucesso
                        elif 'data' in result and 'bulkDeleteListing' in result['data']:
                            block = result['data']['bulkDeleteListing']
                            current_app.logger.info(f"Property {property_id}: Deletion block: {block}")
                            
                            if block and 'message' in block:
                                message = block['message']
                                current_app.logger.info(f"Property {property_id}: Deletion message: {message}")
                                
                                if 'deleted successfully' in message.lower() or 'deleted' in message.lower():
                                    refresh_details['delete_success'] = True
                                    current_app.logger.info(f"Successfully deleted property {property_id} from CanalPro")
                                    
                                    # Limpar remote_id local após deleção bem-sucedida
                                    prop.remote_id = None
                                    db.session.commit()
                                else:
                                    current_app.logger.warning(f"Property {property_id}: Unexpected deletion message: {message}")
                            else:
                                current_app.logger.warning(f"Property {prop.id}: No message in deletion block")
                        
                        # Verificar outras estruturas possíveis
                        elif 'data' in result and 'deleteListings' in result['data']:
                            # Estrutura alternativa
                            block = result['data']['deleteListings']
                            current_app.logger.info(f"Property {property_id}: Alternative deletion structure found: {block}")
                            
                            if block and 'message' in block and 'deleted' in block['message'].lower():
                                refresh_details['delete_success'] = True
                                current_app.logger.info(f"Successfully deleted property {property_id} from CanalPro (alternative structure)")
                                prop.remote_id = None
                                db.session.commit()
                            else:
                                current_app.logger.warning(f"Property {property_id}: Alternative structure but no success message")
                        
                        # Verificar resposta de sucesso simples
                        elif result.get('success') or result.get('deleted'):
                            refresh_details['delete_success'] = True
                            current_app.logger.info(f"Successfully deleted property {property_id} from CanalPro (simple response)")
                            prop.remote_id = None
                            db.session.commit()
                        
                        else:
                            current_app.logger.warning(f"Property {prop.id}: Unexpected deletion response structure: {result}")
                            # Não falhar completamente, apenas logar e continuar
                            current_app.logger.info(f"Property {property_id}: Proceeding with creation despite unknown deletion response")
                    
                    else:
                        current_app.logger.warning(f"Property {prop.id}: Deletion response is not a dict: {type(result)}")
                        current_app.logger.info(f"Property {property_id}: Proceeding with creation despite invalid response type")
                        
                except Exception as delete_error:
                    error_msg = f"Error during CanalPro deletion: {str(delete_error)}"
                    refresh_details['errors'].append(error_msg)
                    current_app.logger.exception(f"Property {property_id}: {error_msg}")
            else:
                current_app.logger.info(f"Property {property_id} has no remote_id, skipping deletion")
            
            # ETAPA 2: Recriar no CanalPro (sempre tentar, independente do resultado da deleção)
            current_app.logger.info(f"Creating property {property_id} in CanalPro")
            refresh_details['create_attempted'] = True
            
            try:
                from integrations.canalpro_exporter import CanalProExporter
                
                # Preparar exporter
                exporter = CanalProExporter(tenant_id=g.tenant_id)
                
                # Autenticar para obter credenciais
                if not exporter.authenticate():
                    error_msg = "Failed to authenticate with CanalPro"
                    refresh_details['errors'].append(error_msg)
                    current_app.logger.error(f"Property {property_id}: {error_msg}")
                    return False, {
                        'error': error_msg,
                        'status': 500,
                        'refresh_details': refresh_details
                    }
                
                # Usar método export_property que já faz todo o processo
                success = exporter.export_property(prop, is_refresh=True)
                
                # Processar resultado da criação
                if success:
                    refresh_details['create_success'] = True
                    
                    # Commit para garantir que mudanças do export_property sejam persistidas
                    db.session.commit()
                    
                    # Recarregar propriedade para obter novo remote_id
                    db.session.refresh(prop)
                    refresh_details['new_remote_id'] = prop.remote_id
                    
                    current_app.logger.info(f"Successfully created property {property_id} in CanalPro with new remote_id: {prop.remote_id}")
                else:
                    # Recarregar propriedade para obter o erro real
                    db.session.refresh(prop)
                    actual_error = prop.error if prop.error else "Unknown error"
                    error_msg = f"CanalPro export_property failed: {actual_error}"
                    refresh_details['errors'].append(error_msg)
                    current_app.logger.error(f"Property {property_id}: {error_msg}")
                    
            except Exception as create_error:
                error_msg = f"Error during CanalPro creation: {str(create_error)}"
                refresh_details['errors'].append(error_msg)
                current_app.logger.exception(f"Property {property_id}: {error_msg}")
            
            # Determinar sucesso geral - considerar sucesso se a criação funcionou
            # A deleção é opcional (pode falhar se o imóvel não existir mais)
            success = refresh_details['create_success']
            
            if success:
                message = f"Property {property_id} refreshed successfully"
                if refresh_details['had_remote_id']:
                    if refresh_details['delete_success']:
                        message += f" (deleted old remote_id: {refresh_details['original_remote_id']}, created new remote_id: {refresh_details['new_remote_id']})"
                    else:
                        message += f" (old remote_id: {refresh_details['original_remote_id']} - deletion skipped or failed, created new remote_id: {refresh_details['new_remote_id']})"
                else:
                    message += f" (created new remote_id: {refresh_details['new_remote_id']})"
                
                current_app.logger.info(message)
                
                # Retornar sucesso mesmo se houve erros na deleção, desde que a criação funcionou
                return True, {
                    'message': message,
                    'status': 200,
                    'refresh_details': refresh_details
                }
            else:
                error_msg = f"Property {property_id} refresh failed"
                if refresh_details['errors']:
                    error_msg += f": {'; '.join(refresh_details['errors'])}"
                
                current_app.logger.error(error_msg)
                
                return False, {
                    'error': error_msg,
                    'status': 500,
                    'refresh_details': refresh_details
                }
                
        except Exception as e:
            error_msg = f"Unexpected error during property refresh: {str(e)}"
            current_app.logger.exception(f"Property {property_id}: {error_msg}")
            return False, {
                'error': error_msg,
                'status': 500
            }
