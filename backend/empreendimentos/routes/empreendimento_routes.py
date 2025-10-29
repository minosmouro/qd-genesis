"""
Routes for Empreendimentos API
Refactored from empreendimentos_api.py
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy import or_, and_, func, text
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from extensions import db
from ..models import Empreendimento  # import lazy via __getattr__ evita ImportError prematuro
from ..models import EmpreendimentoEditSuggestion  # Para sugestões de edição
import re
import logging
from models import Property  # Import para sincronização com imóveis
from utils.permissions import admin_required  # ✅ NOVO: Proteção de rotas admin

logger = logging.getLogger(__name__)

def get_current_user_info():
    """Helper function to get current user info from JWT token"""
    claims = get_jwt()
    user_id = claims.get('sub')
    tenant_id = claims.get('tenant_id')
    
    if not user_id or not tenant_id:
        raise ValueError("Invalid token: missing user_id or tenant_id")
    
    # Retorna um objeto simples com as informações necessárias
    class UserInfo:
        def __init__(self, user_id, tenant_id):
            self.id = user_id
            self.tenant_id = tenant_id
    
    return UserInfo(user_id, tenant_id)

def create_empreendimentos_routes(empreendimentos_bp: Blueprint):
    """Add empreendimentos routes to the blueprint."""
    
    # Handler para métodos não permitidos
    @empreendimentos_bp.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            'success': False,
            'error': 'Method not allowed for this endpoint',
            'message': 'Método HTTP não permitido para esta URL'
        }), 405
    
    # Rotas específicas para retornar 405 para métodos não permitidos
    @empreendimentos_bp.route('/', methods=['PUT', 'PATCH', 'DELETE'])
    @empreendimentos_bp.route('', methods=['PUT', 'PATCH', 'DELETE'])
    def method_not_allowed_root():
        return jsonify({
            'success': False,
            'error': 'Method not allowed',
            'message': f'Método HTTP não permitido. Use GET para listar ou POST para criar.',
            'allowed_methods': ['GET', 'POST']
        }), 405
    
    @empreendimentos_bp.route('/search', methods=['POST', 'PUT', 'PATCH', 'DELETE'])
    def method_not_allowed_search():
        return jsonify({
            'success': False,
            'error': 'Method not allowed',
            'message': 'Use GET para buscar empreendimentos.',
            'allowed_methods': ['GET']
        }), 405
    
    @empreendimentos_bp.route('/mais-usados', methods=['POST', 'PUT', 'PATCH', 'DELETE'])
    def method_not_allowed_mais_usados():
        return jsonify({
            'success': False,
            'error': 'Method not allowed',
            'message': 'Use GET para obter empreendimentos mais usados.',
            'allowed_methods': ['GET']
        }), 405
    
    @empreendimentos_bp.route('/duplicata', methods=['GET', 'PUT', 'PATCH', 'DELETE'])
    def method_not_allowed_duplicata():
        return jsonify({
            'success': False,
            'error': 'Method not allowed',
            'message': 'Use POST para verificar duplicatas.',
            'allowed_methods': ['POST']
        }), 405
    
    @empreendimentos_bp.route('/<int:empreendimento_id>', methods=['GET', 'POST', 'PATCH', 'DELETE'])
    def method_not_allowed_by_id(empreendimento_id):
        return jsonify({
            'success': False,
            'error': 'Method not allowed',
            'message': 'Use PUT para atualizar empreendimentos.',
            'allowed_methods': ['PUT'],
            'resource_id': empreendimento_id
        }), 405

    # GET /api/empreendimentos/{id} - retorna detalhes públicos/completos do empreendimento
    @empreendimentos_bp.route('/<int:empreendimento_id>', methods=['GET'])
    @jwt_required()
    def get_empreendimento(empreendimento_id):
        """
        Retorna o empreendimento por ID. Inclui campo `informacoes.caracteristicas`.
        """
        try:
            emp = db.session.query(Empreendimento).filter(
                and_(
                    Empreendimento.id == empreendimento_id,
                    Empreendimento.ativo == True
                )
            ).first()

            if not emp:
                return jsonify({'success': False, 'error': 'Empreendimento não encontrado'}), 404

            return jsonify({'success': True, 'data': emp.to_dict()}), 200
        except Exception as e:
            logger.exception('Erro ao recuperar empreendimento por id: %s', e)
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @empreendimentos_bp.route('/search', methods=['GET'])
    @jwt_required()
    def buscar_empreendimentos():
        """
        GET /api/empreendimentos/search?q=termo&limit=10
        Busca inteligente de empreendimentos por nome, bairro ou cidade
        ✅ PÚBLICO: Retorna empreendimentos de TODOS os corretores (sem filtro tenant)
        """
        current_user = get_current_user_info()
        
        query = request.args.get('q', '').strip()
        limit = min(int(request.args.get('limit', 10)), 50)  # Máximo 50
        
        try:
            if not query or len(query) < 2:
                # Se não há query, retorna todos os empreendimentos ativos (GLOBAIS - TODOS OS TENANTS)
                empreendimentos = db.session.query(Empreendimento).filter(
                    Empreendimento.ativo == True
                ).order_by(
                    Empreendimento.total_imoveis.desc(),
                    Empreendimento.created_at.desc()
                ).limit(limit).all()
            else:
                # Busca por múltiplos campos
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
                
                # Executa busca GLOBAL (todos os tenants - dados públicos)
                empreendimentos = db.session.query(Empreendimento).filter(
                    and_(
                        or_(*conditions),
                        Empreendimento.ativo == True
                    )
                ).order_by(
                    # Ordena por relevância: primeiro por total de imóveis, depois por nome
                    Empreendimento.total_imoveis.desc(),
                    Empreendimento.nome
                ).limit(limit).all()
            
            return jsonify({
                'success': True,
                'empreendimentos': [emp.to_dict() for emp in empreendimentos],
                'total': len(empreendimentos)
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @empreendimentos_bp.route('/mais-usados', methods=['GET'])
    @jwt_required()
    def empreendimentos_mais_usados():
        """
        GET /api/empreendimentos/mais-usados?limit=5
        Retorna os empreendimentos mais utilizados
        ✅ PÚBLICO: Considera imóveis de TODOS os corretores
        """
        limit = min(int(request.args.get('limit', 5)), 20)
        
        try:
            # Busca GLOBAL - empreendimentos de todos os tenants (dados públicos)
            empreendimentos = db.session.query(Empreendimento).filter(
                Empreendimento.ativo == True
            ).order_by(
                Empreendimento.total_imoveis.desc(),
                Empreendimento.created_at.desc()
            ).limit(limit).all()
            
            return jsonify({
                'success': True,
                'empreendimentos': [emp.to_dict() for emp in empreendimentos]
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @empreendimentos_bp.route('/duplicata', methods=['POST'])
    @jwt_required()
    def verificar_duplicata():
        """
        POST /api/empreendimentos/duplicata
        Verifica se já existe um empreendimento com nome/localização similares
        ✅ GLOBAL: Busca em toda base (todos os tenants) para evitar duplicatas
        """
        data = request.get_json()
        
        if not data or not data.get('nome'):
            return jsonify({
                'success': False,
                'error': 'Nome é obrigatório'
            }), 400
        
        try:
            nome_limpo = data['nome'].strip().lower()
            endereco = data.get('endereco', {})
            cep_limpo = re.sub(r'[^0-9]', '', endereco.get('cep', ''))
            bairro = endereco.get('bairro', '').strip().lower()
            
            duplicata = None
            
            # Busca GLOBAL por nome exato + CEP (em todos os tenants)
            if cep_limpo:
                duplicata = db.session.query(Empreendimento).filter(
                    and_(
                        func.lower(Empreendimento.nome) == nome_limpo,
                        # Normalizar CEP armazenado removendo qualquer caractere não numérico antes de comparar
                        func.regexp_replace(Empreendimento.cep, '[^0-9]', '', 'g') == cep_limpo,
                        Empreendimento.ativo == True
                    )
                ).first()

            # Se não achou por CEP, busca GLOBAL por nome + bairro
            if not duplicata and bairro:
                duplicata = db.session.query(Empreendimento).filter(
                    and_(
                        func.lower(Empreendimento.nome) == nome_limpo,
                        func.lower(Empreendimento.bairro) == bairro,
                        Empreendimento.ativo == True
                    )
                ).first()
            
            return jsonify({
                'success': True,
                'exists': duplicata is not None,
                'data': duplicata.to_dict() if duplicata else None
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @empreendimentos_bp.route('/', methods=['GET'])
    @empreendimentos_bp.route('', methods=['GET'])  # Sem barra final
    @jwt_required()
    def listar_empreendimentos():
        """
        GET /api/empreendimentos
        Lista todos os empreendimentos ativos
        ✅ PÚBLICO: Retorna empreendimentos de TODOS os corretores
        """
        try:
            page = int(request.args.get('page', 1))
            per_page = min(int(request.args.get('per_page', 20)), 100)  # Máximo 100
            
            # Query base GLOBAL (todos os tenants - dados públicos)
            query = db.session.query(Empreendimento).filter(
                Empreendimento.ativo == True
            ).order_by(
                Empreendimento.total_imoveis.desc(),
                Empreendimento.nome
            )
            
            # Paginação
            total = query.count()
            empreendimentos = query.offset((page - 1) * per_page).limit(per_page).all()
            
            return jsonify({
                'success': True,
                'data': [emp.to_dict() for emp in empreendimentos],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': (total + per_page - 1) // per_page
                }
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @empreendimentos_bp.route('/', methods=['POST'])
    @empreendimentos_bp.route('', methods=['POST'])  # Sem barra final
    @jwt_required()
    def criar_empreendimento():
        """
        POST /api/empreendimentos
        Cria um novo empreendimento
        """
        current_user = get_current_user_info()
        tenant_id = current_user.tenant_id
        idempotency_key = request.headers.get('Idempotency-Key')

        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados são obrigatórios'
            }), 400

        # If idempotency key provided, check table
        if idempotency_key:
            # simple check via raw SQL to avoid circular imports
            existing = db.session.execute(
                text("SELECT id, status, response FROM idempotency_keys WHERE id = :id AND tenant_id = :tenant"),
                {'id': idempotency_key, 'tenant': tenant_id}
            ).fetchone()
            if existing:
                # If finished, return stored response
                if existing['status'] == 'completed' and existing['response'] is not None:
                    return jsonify(existing['response']), 200
                # If in progress, let client retry later
                return jsonify({'success': False, 'error': 'Request already in progress'}), 409

        try:
            # Validações básicas
            if not data.get('nome'):
                return jsonify({
                    'success': False,
                    'error': 'Nome é obrigatório'
                }), 400
            
            endereco = data.get('endereco', {})
            if not endereco.get('cep') or not endereco.get('bairro'):
                return jsonify({
                    'success': False,
                    'error': 'CEP e bairro são obrigatórios'
                }), 400
            
            # Normalizar CEP (somente dígitos)
            cep_limpo = re.sub(r'[^0-9]', '', endereco.get('cep', ''))
            data.setdefault('endereco', {})['cep'] = cep_limpo

            # Verifica duplicata GLOBAL (com normalização) - busca em toda base
            nome_limpo = data['nome'].strip().lower()

            duplicata = db.session.query(Empreendimento).filter(
                and_(
                    func.lower(Empreendimento.nome) == nome_limpo,
                    func.coalesce(Empreendimento.cep, '') != '',
                    func.regexp_replace(Empreendimento.cep, '[^0-9]', '', 'g') == cep_limpo,
                    Empreendimento.ativo == True
                )
            ).first()
            
            if duplicata:
                return jsonify({
                    'success': True,
                    'data': duplicata.to_dict(),
                    'status': 'exists'
                }), 200

            # If idempotency key present, insert placeholder
            if idempotency_key:
                db.session.execute(
                    "INSERT INTO idempotency_keys (id, tenant_id, endpoint, status, created_at, updated_at) VALUES (:id, :tenant, :endpoint, 'in_progress', now(), now()) ON CONFLICT DO NOTHING",
                    {'id': idempotency_key, 'tenant': tenant_id, 'endpoint': '/api/empreendimentos'}
                )
                db.session.commit()

            # Cria novo empreendimento
            logger.debug('Criando empreendimento; idempotency=%s, tenant=%s, nome=%s', idempotency_key, tenant_id, data.get('nome'))
            empreendimento = Empreendimento.from_dict(data, tenant_id)
            
            db.session.add(empreendimento)
            try:
                db.session.commit()
            except IntegrityError as ie:
                db.session.rollback()
                logger.exception('IntegrityError ao salvar empreendimento')
                # update idempotency record as failed
                if idempotency_key:
                    db.session.execute("UPDATE idempotency_keys SET status='failed', updated_at=now() WHERE id=:id", {'id': idempotency_key})
                    db.session.commit()
                # assumir duplicata por constraint única
                return jsonify({
                    'success': False,
                    'error': 'Empreendimento já existe (conflito)'
                }), 409

            # mark idempotency as completed and store response
            response_payload = {'success': True, 'data': empreendimento.to_dict(), 'status': 'created'}
            if idempotency_key:
                db.session.execute(
                    "UPDATE idempotency_keys SET status='completed', resource_id=:rid, response=:resp, updated_at=now() WHERE id=:id",
                    {'rid': empreendimento.id, 'resp': response_payload, 'id': idempotency_key}
                )
                db.session.commit()
            
            logger.info('Empreendimento salvo com ID: %s (tenant=%s)', empreendimento.id, tenant_id)
            
            return jsonify(response_payload), 201
            
        except Exception as e:
            db.session.rollback()
            logger.exception('Erro ao criar empreendimento')
            logger.error(f'Tipo do erro: {type(e).__name__}')
            logger.error(f'Mensagem do erro: {str(e)}')
            logger.error(f'Dados recebidos: {data}')
            
            if idempotency_key:
                db.session.execute("UPDATE idempotency_keys SET status='failed', updated_at=now() WHERE id=:id", {'id': idempotency_key})
                db.session.commit()
            
            # Retornar erro detalhado para facilitar debug
            error_msg = f'{type(e).__name__}: {str(e)}'
            return jsonify({
                'success': False,
                'error': error_msg,
                'error_type': type(e).__name__
            }), 500
    
    @empreendimentos_bp.route('/<int:empreendimento_id>', methods=['PUT'])
    @jwt_required()
    def atualizar_empreendimento(empreendimento_id):
        """
        PUT /api/empreendimentos/{id}
        ⚠️ TEMPORÁRIO: Atualiza diretamente (será substituído por sistema de sugestões)
        TODO: Implementar aprovação de edições por super usuário
        """
        current_user = get_current_user_info()
        tenant_id = current_user.tenant_id
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Dados são obrigatórios'
            }), 400
        
        try:
            print(f"🔍 DEBUG - Atualizando empreendimento {empreendimento_id}")
            print(f"   Dados recebidos: {data}")
            
            # Busca SEM filtro de tenant (empreendimento é público)
            empreendimento = db.session.query(Empreendimento).filter(
                Empreendimento.id == empreendimento_id
            ).first()
            
            if not empreendimento:
                return jsonify({
                    'success': False,
                    'error': 'Empreendimento não encontrado'
                }), 404
            
            # Atualiza campos básicos
            if 'nome' in data:
                empreendimento.nome = data['nome']
            
            # Atualiza endereço
            endereco = data.get('endereco', {})
            for campo, valor in endereco.items():
                if campo == 'pontoReferencia':
                    empreendimento.ponto_referencia = valor
                elif hasattr(empreendimento, campo):
                    setattr(empreendimento, campo, valor)
            
            # Atualiza informações estruturais
            informacoes = data.get('informacoes', {})
            print(f"🔍 DEBUG - Processando informações: {informacoes}")
            
            for campo, valor in informacoes.items():
                print(f"🔍 DEBUG - Campo: {campo} = {valor}")
                if campo == 'unidadesPorAndar':
                    empreendimento.unidades_por_andar = valor
                    print(f"✅ Mapeado unidadesPorAndar -> unidades_por_andar = {valor}")
                elif campo == 'entregaEm':
                    empreendimento.entrega_em = valor
                    print(f"✅ Mapeado entregaEm -> entrega_em = {valor}")
                elif campo == 'caracteristicasPersonalizadas':
                    empreendimento.caracteristicas_personalizadas = valor
                    print(f"✅ Mapeado caracteristicasPersonalizadas -> caracteristicas_personalizadas = {valor}")
                elif campo == 'andares':
                    empreendimento.andares = valor
                    print(f"✅ Mapeado andares -> andares = {valor}")
                elif campo == 'blocos':
                    empreendimento.blocos = valor
                    print(f"✅ Mapeado blocos -> blocos = {valor}")
                elif campo == 'caracteristicas':
                    empreendimento.caracteristicas = valor
                    print(f"✅ Mapeado caracteristicas -> caracteristicas = {valor}")
                elif hasattr(empreendimento, campo):
                    setattr(empreendimento, campo, valor)
                    print(f"✅ Setattr genérico: {campo} = {valor}")
                else:
                    print(f"⚠️  Campo ignorado (não existe): {campo}")
            
            print(f"🔍 DEBUG - Estado final antes do commit:")
            print(f"   Andares: {empreendimento.andares}")
            print(f"   Unidades/andar: {empreendimento.unidades_por_andar}")
            print(f"   Blocos: {empreendimento.blocos}")
            
            db.session.commit()
            
            # 🔄 SINCRONIZAÇÃO COM IMÓVEIS (REMOVIDA)
            # A partir desta versão, informações estruturais do condomínio ficam apenas na tabela
            # de empreendimentos. Não sincronizamos mais para a tabela property.
            
            return jsonify({
                'success': True,
                'data': empreendimento.to_dict(),
                'status': 'updated'
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': f'Erro ao atualizar: {str(e)}'
            }), 500
    
    @empreendimentos_bp.route('/buscar-proximos', methods=['GET'])
    @jwt_required()
    def buscar_empreendimentos_proximos():
        """
        GET /api/empreendimentos/buscar-proximos?cep=12345678&bairro=Centro&cidade=São Paulo
        Busca empreendimentos próximos baseado em localização
        Prioriza: mesmo CEP > mesmo bairro > mesma cidade
        ✅ PÚBLICO: Retorna empreendimentos de TODOS os corretores
        """
        # Parâmetros de busca
        cep = request.args.get('cep', '').strip()
        bairro = request.args.get('bairro', '').strip()
        cidade = request.args.get('cidade', '').strip()
        
        if not cep and not bairro:
            return jsonify({
                'success': False,
                'error': 'CEP ou bairro são obrigatórios'
            }), 400
        
        try:
            empreendimentos = []
            
            # 1. Busca GLOBAL por CEP exato (mesma rua/região)
            if cep:
                cep_limpo = re.sub(r'[^0-9]', '', cep)
                if len(cep_limpo) >= 5:  # Mínimo 5 dígitos para buscar
                    # Busca em todos os tenants (dados públicos)
                    por_cep = db.session.query(Empreendimento).filter(
                        and_(
                            Empreendimento.cep.like(f'{cep_limpo[:5]}%'),
                            Empreendimento.ativo == True
                        )
                    ).order_by(
                        Empreendimento.total_imoveis.desc()
                    ).limit(5).all()
                    
                    if por_cep:
                        empreendimentos = [e.to_dict() for e in por_cep]
                        logger.info(f"🎯 Encontrados {len(empreendimentos)} empreendimentos por CEP {cep_limpo[:5]}")
            
            # 2. Se não encontrou por CEP, busca GLOBAL por bairro + cidade
            if not empreendimentos and bairro:
                conditions = [
                    Empreendimento.bairro.ilike(f'%{bairro}%'),
                    Empreendimento.ativo == True
                ]
                
                if cidade:
                    conditions.append(Empreendimento.cidade.ilike(f'%{cidade}%'))
                
                por_bairro = db.session.query(Empreendimento).filter(
                    and_(*conditions)
                ).order_by(
                    Empreendimento.total_imoveis.desc()
                ).limit(10).all()
                
                empreendimentos = [e.to_dict() for e in por_bairro]
                logger.info(f"🎯 Encontrados {len(empreendimentos)} empreendimentos por bairro '{bairro}'")
            
            return jsonify({
                'success': True,
                'empreendimentos': empreendimentos,
                'total': len(empreendimentos),
                'criterio': 'cep' if cep and empreendimentos else 'bairro'
            })
            
        except Exception as e:
            logger.exception(f"❌ Erro ao buscar empreendimentos próximos: {e}")
            return jsonify({
                'success': False,
                'error': f'Erro ao buscar: {str(e)}'
            }), 500
    
    @empreendimentos_bp.route('/<int:empreendimento_id>/incrementar-contador', methods=['POST'])
    @jwt_required()
    def incrementar_contador_imoveis(empreendimento_id):
        """
        POST /api/empreendimentos/{id}/incrementar-contador
        Incrementa contador quando um imóvel é cadastrado neste empreendimento
        """
        current_user = get_current_user_info()
        tenant_id = current_user.tenant_id
        
        try:
            result = db.session.query(Empreendimento).filter(
                and_(
                    Empreendimento.id == empreendimento_id,
                    Empreendimento.tenant_id == tenant_id
                )
            ).update({
                'total_imoveis': Empreendimento.total_imoveis + 1
            })
            
            if result == 0:
                return jsonify({
                    'success': False,
                    'error': 'Empreendimento não encontrado'
                }), 404
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Contador incrementado com sucesso'
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': f'Erro ao incrementar contador: {str(e)}'
            }), 500
    
    # ===== SISTEMA DE SUGESTÕES DE EDIÇÃO =====
    
    @empreendimentos_bp.route('/<int:empreendimento_id>/suggestions', methods=['POST'])
    @jwt_required()
    def criar_sugestao_edicao(empreendimento_id):
        """
        POST /api/empreendimentos/{id}/suggestions
        Cria uma sugestão de edição para ser aprovada pelo super usuário
        
        Body:
        {
            "suggested_changes": {
                "nome": "Novo nome",
                "endereco": {"bairro": "Novo bairro"},
                "informacoes": {"andares": 20}
            },
            "reason": "Justificativa da mudança"
        }
        """
        current_user = get_current_user_info()
        tenant_id = current_user.tenant_id
        user_id = current_user.id
        
        data = request.get_json()
        
        if not data or not data.get('suggested_changes'):
            return jsonify({
                'success': False,
                'error': 'Campos sugeridos (suggested_changes) são obrigatórios'
            }), 400
        
        try:
            # Verifica se empreendimento existe
            empreendimento = db.session.query(Empreendimento).filter(
                Empreendimento.id == empreendimento_id
            ).first()
            
            if not empreendimento:
                return jsonify({
                    'success': False,
                    'error': 'Empreendimento não encontrado'
                }), 404
            
            # Cria sugestão
            sugestao = EmpreendimentoEditSuggestion(
                empreendimento_id=empreendimento_id,
                suggested_by_tenant_id=tenant_id,
                suggested_by_user_id=user_id,
                suggested_changes=data['suggested_changes'],
                reason=data.get('reason', ''),
                status='pending'
            )
            
            db.session.add(sugestao)
            db.session.commit()
            
            logger.info(f"✅ Sugestão de edição criada: ID {sugestao.id} para empreendimento {empreendimento_id}")
            
            return jsonify({
                'success': True,
                'data': sugestao.to_dict(),
                'message': 'Sugestão enviada com sucesso! Aguarde aprovação do administrador.'
            }), 201
            
        except Exception as e:
            db.session.rollback()
            logger.exception('Erro ao criar sugestão de edição')
            return jsonify({
                'success': False,
                'error': f'Erro ao criar sugestão: {str(e)}'
            }), 500
    
    @empreendimentos_bp.route('/suggestions', methods=['GET'])
    @jwt_required()
    @admin_required()  # 🔒 Apenas admins podem listar sugestões
    def listar_sugestoes():
        """
        GET /api/empreendimentos/suggestions?status=pending
        Lista sugestões de edição
        🔒 RESTRITO: Apenas administradores
        """
        status_filter = request.args.get('status', 'pending')
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        
        try:
            query = db.session.query(EmpreendimentoEditSuggestion)
            
            if status_filter and status_filter != 'all':
                query = query.filter(EmpreendimentoEditSuggestion.status == status_filter)
            
            query = query.order_by(EmpreendimentoEditSuggestion.created_at.desc())
            
            total = query.count()
            sugestoes = query.offset((page - 1) * per_page).limit(per_page).all()
            
            return jsonify({
                'success': True,
                'data': [s.to_dict() for s in sugestoes],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': (total + per_page - 1) // per_page
                }
            })
            
        except Exception as e:
            logger.exception('Erro ao listar sugestões')
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @empreendimentos_bp.route('/suggestions/<int:suggestion_id>/approve', methods=['POST'])
    @jwt_required()
    @admin_required()  # 🔒 Apenas admins podem aprovar
    def aprovar_sugestao(suggestion_id):
        """
        POST /api/empreendimentos/suggestions/{id}/approve
        Aprova e aplica uma sugestão de edição
        🔒 RESTRITO: Apenas administradores
        
        Body (opcional):
        {
            "review_notes": "Aprovado após análise"
        }
        """
        current_user = get_current_user_info()
        user_id = current_user.id
        
        data = request.get_json() or {}
        
        try:
            sugestao = db.session.query(EmpreendimentoEditSuggestion).filter(
                EmpreendimentoEditSuggestion.id == suggestion_id
            ).first()
            
            if not sugestao:
                return jsonify({
                    'success': False,
                    'error': 'Sugestão não encontrada'
                }), 404
            
            if sugestao.status != 'pending':
                return jsonify({
                    'success': False,
                    'error': f'Sugestão já foi processada (status: {sugestao.status})'
                }), 400
            
            # Aplica as mudanças ao empreendimento
            empreendimento = sugestao.empreendimento
            suggested_changes = sugestao.suggested_changes
            
            # Atualiza campos básicos
            if 'nome' in suggested_changes:
                empreendimento.nome = suggested_changes['nome']
            
            # Atualiza endereço
            if 'endereco' in suggested_changes:
                endereco = suggested_changes['endereco']
                for campo, valor in endereco.items():
                    if campo == 'pontoReferencia':
                        empreendimento.ponto_referencia = valor
                    elif hasattr(empreendimento, campo):
                        setattr(empreendimento, campo, valor)
            
            # Atualiza informações
            if 'informacoes' in suggested_changes:
                informacoes = suggested_changes['informacoes']
                for campo, valor in informacoes.items():
                    if campo == 'unidadesPorAndar':
                        empreendimento.unidades_por_andar = valor
                    elif campo == 'entregaEm':
                        empreendimento.entrega_em = valor
                    elif campo == 'caracteristicasPersonalizadas':
                        empreendimento.caracteristicas_personalizadas = valor
                    elif hasattr(empreendimento, campo):
                        setattr(empreendimento, campo, valor)
            
            # Atualiza status da sugestão
            sugestao.status = 'approved'
            sugestao.reviewed_by_user_id = user_id
            sugestao.reviewed_at = datetime.utcnow()
            sugestao.review_notes = data.get('review_notes', 'Aprovado')
            
            db.session.commit()
            
            logger.info(f"✅ Sugestão {suggestion_id} aprovada e aplicada ao empreendimento {empreendimento.id}")
            
            return jsonify({
                'success': True,
                'message': 'Sugestão aprovada e aplicada com sucesso',
                'empreendimento': empreendimento.to_dict()
            })
            
        except Exception as e:
            db.session.rollback()
            logger.exception('Erro ao aprovar sugestão')
            return jsonify({
                'success': False,
                'error': f'Erro ao aprovar: {str(e)}'
            }), 500
    
    @empreendimentos_bp.route('/suggestions/<int:suggestion_id>/reject', methods=['POST'])
    @jwt_required()
    @admin_required()  # 🔒 Apenas admins podem rejeitar
    def rejeitar_sugestao(suggestion_id):
        """
        POST /api/empreendimentos/suggestions/{id}/reject
        Rejeita uma sugestão de edição
        🔒 RESTRITO: Apenas administradores
        
        Body:
        {
            "review_notes": "Motivo da rejeição"
        }
        """
        current_user = get_current_user_info()
        user_id = current_user.id
        
        data = request.get_json() or {}
        
        try:
            sugestao = db.session.query(EmpreendimentoEditSuggestion).filter(
                EmpreendimentoEditSuggestion.id == suggestion_id
            ).first()
            
            if not sugestao:
                return jsonify({
                    'success': False,
                    'error': 'Sugestão não encontrada'
                }), 404
            
            if sugestao.status != 'pending':
                return jsonify({
                    'success': False,
                    'error': f'Sugestão já foi processada (status: {sugestao.status})'
                }), 400
            
            # Atualiza status
            sugestao.status = 'rejected'
            sugestao.reviewed_by_user_id = user_id
            sugestao.reviewed_at = datetime.utcnow()
            sugestao.review_notes = data.get('review_notes', 'Rejeitado')
            
            db.session.commit()
            
            logger.info(f"❌ Sugestão {suggestion_id} rejeitada")
            
            return jsonify({
                'success': True,
                'message': 'Sugestão rejeitada'
            })
            
        except Exception as e:
            db.session.rollback()
            logger.exception('Erro ao rejeitar sugestão')
            return jsonify({
                'success': False,
                'error': f'Erro ao rejeitar: {str(e)}'
            }), 500

