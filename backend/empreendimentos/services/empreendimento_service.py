# Serviço para gerenciar empreendimentos
from flask import Flask, request, jsonify
from sqlalchemy import or_, and_, func
from sqlalchemy.exc import IntegrityError
from extensions import db
from .models import Empreendimento
from typing import List, Dict, Optional, Tuple
import re

class EmpreendimentosService:
    """Serviço para operações com empreendimentos"""
    
    @staticmethod
    def buscar_empreendimentos(query: str = '', limit: int = 10, tenant_id: int = None) -> List[Dict]:
        """
        Busca inteligente de empreendimentos por nome, bairro ou cidade
        """
        if tenant_id is None:
            raise ValueError('tenant_id é obrigatório')

        if not query or len(query.strip()) < 2:
            # Se não há query, retorna os mais usados
            return EmpreendimentosService.get_mais_usados(limit, tenant_id)

        query = query.strip()
        
        # Busca por múltiplos campos com diferentes pesos
        conditions = []
        
        # Nome (peso maior)
        conditions.append(Empreendimento.nome.ilike(f'%{query}%'))
        
        # Bairro
        conditions.append(Empreendimento.bairro.ilike(f'%{query}%'))
        
        # Cidade
        conditions.append(Empreendimento.cidade.ilike(f'%{query}%'))
        
        # CEP (se parecer um CEP)
        if re.match(r'^\d{5}-?\d{3}$', query):
            cep_limpo = re.sub(r'[^0-9]', '', query)
            conditions.append(Empreendimento.cep.like(f'%{cep_limpo}%'))
        
        # Executa busca
        empreendimentos = db.session.query(Empreendimento).filter(
            and_(
                Empreendimento.tenant_id == tenant_id,
                or_(*conditions),
                Empreendimento.ativo == True
            )
        ).order_by(
            # Prioriza nome exato, depois por número de imóveis (popularidade)
            func.case(
                [(Empreendimento.nome.ilike(f'{query}%'), 1)], 
                else_=2
            ),
            Empreendimento.total_imoveis.desc(),
            Empreendimento.nome
        ).limit(limit).all()
        
        return [emp.to_dict() for emp in empreendimentos]

    @staticmethod
    def get_mais_usados(limit: int = 5, tenant_id: int = None) -> List[Dict]:
        """Retorna os empreendimentos mais utilizados"""
        if tenant_id is None:
            raise ValueError('tenant_id é obrigatório')
        empreendimentos = db.session.query(Empreendimento).filter(
            and_(
                Empreendimento.tenant_id == tenant_id,
                Empreendimento.ativo == True,
                Empreendimento.total_imoveis > 0
            )
        ).order_by(
            Empreendimento.total_imoveis.desc(),
            Empreendimento.created_at.desc()
        ).limit(limit).all()
        
        return [emp.to_dict() for emp in empreendimentos]

    @staticmethod
    def verificar_duplicata(nome: str, cep: str, bairro: str, tenant_id: int) -> Optional[Dict]:
        """
        Verifica se já existe um empreendimento com nome/localização similares
        """
        if tenant_id is None:
            raise ValueError('tenant_id é obrigatório')

        nome_limpo = nome.strip().lower()
        cep_limpo = re.sub(r'[^0-9]', '', cep) if cep else ''
        
        # Busca por nome exato + CEP (normalizando CEP armazenado)
        if cep_limpo:
            empreendimento = db.session.query(Empreendimento).filter(
                and_(
                    Empreendimento.tenant_id == tenant_id,
                    func.lower(Empreendimento.nome) == nome_limpo,
                    func.regexp_replace(Empreendimento.cep, '[^0-9]', '', 'g') == cep_limpo,
                    Empreendimento.ativo == True
                )
            ).first()
            
            if empreendimento:
                return empreendimento.to_dict()
        
        # Busca por nome + bairro
        empreendimento = db.session.query(Empreendimento).filter(
            and_(
                Empreendimento.tenant_id == tenant_id,
                func.lower(Empreendimento.nome) == nome_limpo,
                func.lower(Empreendimento.bairro) == bairro.strip().lower(),
                Empreendimento.ativo == True
            )
        ).first()
        
        if empreendimento:
            return empreendimento.to_dict()
        
        return None

    @staticmethod
    def criar_empreendimento(data: Dict, tenant_id: int) -> Tuple[Dict, str]:
        """
        Cria um novo empreendimento
        """
        if tenant_id is None:
            return None, 'tenant_id é obrigatório'
        try:
            # Validações básicas
            if not data.get('nome'):
                return None, 'Nome é obrigatório'
            
            endereco = data.get('endereco', {})
            if not endereco.get('cep') or not endereco.get('bairro'):
                return None, 'CEP e bairro são obrigatórios'
            
            # Normalizar cep
            cep_limpo = re.sub(r'[^0-9]', '', endereco.get('cep', ''))
            data.setdefault('endereco', {})['cep'] = cep_limpo
            
            # Verifica duplicata
            duplicata = EmpreendimentosService.verificar_duplicata(
                data['nome'], 
                endereco.get('cep', ''), 
                endereco.get('bairro', ''),
                tenant_id
            )
            
            if duplicata:
                return duplicata, 'Empreendimento já existe'
            
            # Cria novo empreendimento
            empreendimento = Empreendimento.from_dict(data, tenant_id)
            
            db.session.add(empreendimento)
            try:
                db.session.commit()
            except IntegrityError as e:
                db.session.rollback()
                return None, 'Erro de integridade: possível duplicata'
            
            return empreendimento.to_dict(), 'created'
            
        except IntegrityError as e:
            db.session.rollback()
            return None, f'Erro de integridade: {str(e)}'
        except Exception as e:
            db.session.rollback()
            return None, f'Erro interno: {str(e)}'
    
    @staticmethod
    def atualizar_empreendimento(empreendimento_id: int, data: Dict) -> Tuple[Optional[Dict], str]:
        """
        Atualiza um empreendimento existente
        """
        try:
            empreendimento = db.session.query(Empreendimento).filter(
                Empreendimento.id == empreendimento_id
            ).first()
            
            if not empreendimento:
                return None, 'Empreendimento não encontrado'
            
            # Atualiza campos
            if 'nome' in data:
                empreendimento.nome = data['nome']
            
            endereco = data.get('endereco', {})
            for campo, valor in endereco.items():
                if hasattr(empreendimento, campo):
                    setattr(empreendimento, campo, valor)
                elif campo == 'pontoReferencia':
                    empreendimento.ponto_referencia = valor
            
            informacoes = data.get('informacoes', {})
            for campo, valor in informacoes.items():
                if campo == 'unidadesPorAndar':
                    empreendimento.unidades_por_andar = valor
                elif campo == 'entregaEm':
                    empreendimento.entrega_em = valor
                elif campo == 'caracteristicasPersonalizadas':
                    empreendimento.caracteristicas_personalizadas = valor
                elif hasattr(empreendimento, campo):
                    setattr(empreendimento, campo, valor)
            
            db.session.commit()
            
            return empreendimento.to_dict(), 'updated'
            
        except Exception as e:
            db.session.rollback()
            return None, f'Erro ao atualizar: {str(e)}'
    
    @staticmethod
    def incrementar_contador_imoveis(empreendimento_id: int):
        """
        Incrementa contador quando um imóvel é cadastrado neste empreendimento
        """
        try:
            db.session.query(Empreendimento).filter(
                Empreendimento.id == empreendimento_id
            ).update({
                'total_imoveis': Empreendimento.total_imoveis + 1
            })
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Erro ao incrementar contador: {e}")

# Classe para endpoints da API
class EmpreendimentosController:
    """Controller com endpoints para a API"""
    
    @staticmethod
    def setup_routes(app: Flask):
        """Configura as rotas da API"""
        
        @app.route('/api/empreendimentos/search', methods=['GET'])
        def buscar_empreendimentos():
            """GET /api/empreendimentos/search?q=termo&limit=10"""
            query = request.args.get('q', '').strip()
            limit = min(int(request.args.get('limit', 10)), 50)  # Máximo 50
            tenant_id = request.args.get('tenant_id', type=int)
            
            try:
                empreendimentos = EmpreendimentosService.buscar_empreendimentos(query, limit, tenant_id)
                return jsonify({
                    'success': True,
                    'data': empreendimentos,
                    'total': len(empreendimentos)
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @app.route('/api/empreendimentos/mais-usados', methods=['GET'])
        def empreendimentos_mais_usados():
            """GET /api/empreendimentos/mais-usados?limit=5"""
            limit = min(int(request.args.get('limit', 5)), 20)
            tenant_id = request.args.get('tenant_id', type=int)
            
            try:
                empreendimentos = EmpreendimentosService.get_mais_usados(limit, tenant_id)
                return jsonify({
                    'success': True,
                    'data': empreendimentos
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @app.route('/api/empreendimentos/duplicata', methods=['POST'])
        def verificar_duplicata():
            """POST /api/empreendimentos/duplicata"""
            data = request.get_json()
            
            if not data or not data.get('nome'):
                return jsonify({
                    'success': False,
                    'error': 'Nome é obrigatório'
                }), 400
            
            tenant_id = data.get('tenant_id')
            
            try:
                endereco = data.get('endereco', {})
                duplicata = EmpreendimentosService.verificar_duplicata(
                    data['nome'],
                    endereco.get('cep', ''),
                    endereco.get('bairro', ''),
                    tenant_id
                )
                
                return jsonify({
                    'success': True,
                    'exists': duplicata is not None,
                    'data': duplicata
                })
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @app.route('/api/empreendimentos', methods=['POST'])
        def criar_empreendimento():
            """POST /api/empreendimentos"""
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'success': False,
                    'error': 'Dados são obrigatórios'
                }), 400
            
            tenant_id = data.get('tenant_id')
            
            try:
                empreendimento, status = EmpreendimentosService.criar_empreendimento(data, tenant_id)
                
                if empreendimento:
                    return jsonify({
                        'success': True,
                        'data': empreendimento,
                        'status': status
                    }), 201 if status == 'created' else 200
                else:
                    return jsonify({
                        'success': False,
                        'error': status
                    }), 400
                    
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
        
        @app.route('/api/empreendimentos/<int:empreendimento_id>', methods=['PUT'])
        def atualizar_empreendimento(empreendimento_id):
            """PUT /api/empreendimentos/{id}"""
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'success': False,
                    'error': 'Dados são obrigatórios'
                }), 400
            
            try:
                empreendimento, status = EmpreendimentosService.atualizar_empreendimento(
                    empreendimento_id, data
                )
                
                if empreendimento:
                    return jsonify({
                        'success': True,
                        'data': empreendimento,
                        'status': status
                    })
                else:
                    return jsonify({
                        'success': False,
                        'error': status
                    }), 404 if 'não encontrado' in status else 400
                    
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 500
