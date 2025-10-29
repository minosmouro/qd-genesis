"""
Helper para gerenciar empreendimentos durante cadastro de imóveis

Este módulo garante que dados de empreendimento sejam salvos
na tabela 'empreendimentos' e não em 'property'.
"""

from typing import Dict, Any, Optional
from extensions import db
from empreendimentos.models.empreendimento import Empreendimento
from flask import current_app
import re


class EmpreendimentoHelper:
    """Helper para criar/buscar empreendimentos durante cadastro de imóveis"""
    
    @staticmethod
    def get_or_create_empreendimento(
        data: Dict[str, Any], 
        tenant_id: int
    ) -> Optional[int]:
        """
        Busca ou cria um empreendimento baseado nos dados do imóvel.
        
        Args:
            data: Dados do imóvel contendo informações de empreendimento
            tenant_id: ID do tenant
            
        Returns:
            ID do empreendimento ou None se não houver dados de empreendimento
        """
        try:
            # Extrair nome do empreendimento
            building_name = data.get('building_name') or data.get('nome_empreendimento')
            
            if not building_name or building_name.strip() == '':
                return None
            
            # Extrair CEP
            cep = data.get('address_zip') or data.get('cep')
            if not cep:
                current_app.logger.warning(
                    f"Empreendimento '{building_name}' sem CEP - não será criado"
                )
                return None
            
            # Limpar CEP
            cep_limpo = re.sub(r'[^0-9]', '', cep)
            
            # Buscar empreendimento existente
            empreendimento = db.session.query(Empreendimento).filter(
                db.func.lower(Empreendimento.nome) == building_name.lower(),
                Empreendimento.cep == cep_limpo,
                Empreendimento.tenant_id == tenant_id
            ).first()
            
            if empreendimento:
                current_app.logger.info(
                    f"Empreendimento existente encontrado: {building_name} (ID: {empreendimento.id})"
                )
                return empreendimento.id
            
            # Criar novo empreendimento
            novo_empreendimento = EmpreendimentoHelper._criar_empreendimento(
                data, 
                building_name, 
                cep_limpo, 
                tenant_id
            )
            
            if novo_empreendimento:
                current_app.logger.info(
                    f"Novo empreendimento criado: {building_name} (ID: {novo_empreendimento.id})"
                )
                return novo_empreendimento.id
            
            return None
            
        except Exception as e:
            current_app.logger.exception(
                f"Erro ao buscar/criar empreendimento '{building_name}': {e}"
            )
            # Não falhar o cadastro do imóvel por erro no empreendimento
            return None
    
    @staticmethod
    def _criar_empreendimento(
        data: Dict[str, Any],
        building_name: str,
        cep_limpo: str,
        tenant_id: int
    ) -> Optional[Empreendimento]:
        """
        Cria um novo empreendimento baseado nos dados do imóvel.
        
        Args:
            data: Dados do imóvel
            building_name: Nome do empreendimento
            cep_limpo: CEP sem formatação
            tenant_id: ID do tenant
            
        Returns:
            Empreendimento criado ou None em caso de erro
        """
        try:
            # Extrair dados de endereço
            endereco = (
                data.get('address_street') or 
                data.get('endereco') or 
                data.get('logradouro') or 
                ''
            )
            
            numero = data.get('address_number') or data.get('numero')
            bairro = data.get('address_neighborhood') or data.get('bairro') or ''
            cidade = data.get('address_city') or data.get('cidade') or ''
            estado = data.get('address_state') or data.get('estado') or data.get('uf') or ''
            
            # Extrair dados estruturais
            andares = data.get('floors') or data.get('andares')
            blocos = data.get('buildings') or data.get('blocos')
            unidades_por_andar = data.get('units_on_floor') or data.get('unidades_por_andar')
            
            # Ano de construção/entrega - aceitar múltiplos formatos
            delivery_at = (
                data.get('construction_year') or  # ✅ NOVO: do frontend
                data.get('delivery_at') or 
                data.get('ano_construcao')
            )
            
            # Características - aceitar múltiplos formatos
            caracteristicas = (
                data.get('empreendimento_caracteristicas') or  # ✅ NOVO: do frontend
                data.get('condo_features') or 
                data.get('caracteristicas_condominio') or 
                []
            )
            caracteristicas_personalizadas = (
                data.get('custom_condo_features') or 
                data.get('caracteristicas_personalizadas')
            )
            
            # LOG DEBUG: Verificar valores extraídos
            current_app.logger.info(f"🏢 Criando empreendimento '{building_name}':")
            current_app.logger.info(f"  - Andares: {andares}")
            current_app.logger.info(f"  - Blocos: {blocos}")
            current_app.logger.info(f"  - Unidades/andar: {unidades_por_andar}")
            current_app.logger.info(f"  - Ano construção: {delivery_at}")
            current_app.logger.info(f"  - Características: {caracteristicas}")
            
            # Criar empreendimento
            novo_emp = Empreendimento(
                nome=building_name,
                cep=cep_limpo,
                endereco=endereco,
                numero=numero,
                bairro=bairro,
                cidade=cidade,
                estado=estado,
                andares=andares,
                blocos=blocos,
                unidades_por_andar=unidades_por_andar,
                entrega_em=delivery_at,
                caracteristicas=caracteristicas if isinstance(caracteristicas, list) else [],
                caracteristicas_personalizadas=caracteristicas_personalizadas,
                tenant_id=tenant_id,
                ativo=True,
                total_imoveis=0
            )
            
            db.session.add(novo_emp)
            db.session.flush()  # Para obter o ID
            
            return novo_emp
            
        except Exception as e:
            current_app.logger.exception(
                f"Erro ao criar empreendimento '{building_name}': {e}"
            )
            return None
    
    @staticmethod
    def limpar_campos_duplicados(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Remove campos de empreendimento dos dados do imóvel.
        
        Esses campos não devem ser salvos em 'property', apenas em 'empreendimentos'.
        
        Args:
            data: Dados do imóvel
            
        Returns:
            Dados limpos (sem campos de empreendimento)
        """
        campos_para_remover = [
            'building_name',
            'nome_empreendimento',
            'condo_features',
            'caracteristicas_condominio',
            'empreendimento_caracteristicas',  # ✅ NOVO
            'custom_condo_features',
            'caracteristicas_personalizadas',
            'delivery_at',
            'ano_construcao',
            'construction_year'  # ✅ NOVO
        ]
        
        # Criar cópia dos dados
        data_limpo = data.copy()
        
        # Remover campos duplicados
        for campo in campos_para_remover:
            data_limpo.pop(campo, None)
        
        return data_limpo
