"""
Sistema de gestão de tenants para super administradores
Permite criar e gerenciar múltiplas imobiliárias/empresas
"""
from flask import Blueprint, request, jsonify, g
from extensions import db
from models import User, Tenant, Property, CanalProContract, IntegrationCredentials
from auth import tenant_required
from werkzeug.security import generate_password_hash
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from datetime import datetime, timezone
from sqlalchemy import func
import re
from properties.utils.status_catalog import aggregate_status_counts

# Blueprint para gestão de tenants
tenants_bp = Blueprint('tenants', __name__, url_prefix='/api/tenants')

# Super admin check decorator
def super_admin_required(fn):
    """Decorator que verifica se o usuário é super admin"""
    from functools import wraps
    
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        # Verificar se é super admin (tenant_id = 1 e is_admin = True)
        if not user or user.tenant_id != 1 or not user.is_admin:
            return jsonify({'error': 'Acesso negado. Apenas super administradores'}), 403
            
        g.current_user = user
        return fn(*args, **kwargs)
    return wrapper

@tenants_bp.route('/list', methods=['GET'])
@super_admin_required
def list_tenants():
    """Listar todos os tenants (apenas super admin)"""
    try:
        tenants = Tenant.query.all()
        
        tenants_data = []
        for tenant in tenants:
            # Contar usuários e propriedades
            users_count = User.query.filter_by(tenant_id=tenant.id).count()
            properties_count = Property.query.filter_by(tenant_id=tenant.id).count()
            
            tenant_data = tenant.to_dict()
            tenant_data.update({
                'users_count': users_count,
                'properties_count': properties_count,
                'is_master': tenant.id == 1  # Master tenant
            })
            tenants_data.append(tenant_data)
            
        return jsonify({
            'tenants': tenants_data,
            'total': len(tenants_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@tenants_bp.route('/create', methods=['POST'])
@super_admin_required  
def create_tenant():
    """Criar novo tenant/imobiliária (apenas super admin)"""
    try:
        data = request.get_json()
        
        # Campos básicos
        tenant_name = data.get('name', '').strip()
        tenant_type = data.get('tenant_type', 'PJ').upper()
        admin_username = data.get('admin_username', '').strip()
        admin_email = data.get('admin_email', '').strip()
        admin_password = data.get('admin_password', '')
        
        # Campos específicos por tipo
        cpf = data.get('cpf', '').strip() if tenant_type == 'PF' else None
        full_name = data.get('full_name', '').strip() if tenant_type == 'PF' else None
        birth_date = data.get('birth_date') if tenant_type == 'PF' else None
        
        cnpj = data.get('cnpj', '').strip() if tenant_type == 'PJ' else None
        company_name = data.get('company_name', '').strip() if tenant_type == 'PJ' else None
        trade_name = data.get('trade_name', '').strip() if tenant_type == 'PJ' else None
        
        # Campos comuns
        email = data.get('email', '').strip()
        phone = data.get('phone', '').strip()
        creci = data.get('creci', '').strip()
        zip_code = data.get('zip_code', '').strip()
        street = data.get('street', '').strip()
        number = data.get('number', '').strip()
        complement = data.get('complement', '').strip()
        neighborhood = data.get('neighborhood', '').strip()
        city = data.get('city', '').strip()
        state = data.get('state', '').strip()
        country = data.get('country', 'Brasil').strip()
        
        # Gerar endereço completo
        address_parts = []
        if street:
            address_parts.append(street)
        if number:
            address_parts.append(f"nº {number}")
        if complement:
            address_parts.append(complement)
        if neighborhood:
            address_parts.append(f"- {neighborhood}")
        address = ', '.join(address_parts) if address_parts else ''
        
        # Validações básicas
        if not tenant_name or not admin_username or not admin_email or not admin_password:
            return jsonify({'error': 'Campos obrigatórios: name, admin_username, admin_email, admin_password'}), 400
            
        if tenant_type not in ['PF', 'PJ']:
            return jsonify({'error': 'Tipo de tenant deve ser PF (Pessoa Física) ou PJ (Pessoa Jurídica)'}), 400
            
        # Validações específicas por tipo
        if tenant_type == 'PF':
            if not cpf or not full_name:
                return jsonify({'error': 'Para Pessoa Física: CPF e nome completo são obrigatórios'}), 400
            if len(cpf.replace('.', '').replace('-', '')) != 11:
                return jsonify({'error': 'CPF deve ter 11 dígitos'}), 400
                
        elif tenant_type == 'PJ':
            if not cnpj or not company_name:
                return jsonify({'error': 'Para Pessoa Jurídica: CNPJ e razão social são obrigatórios'}), 400
            if len(cnpj.replace('.', '').replace('/', '').replace('-', '')) != 14:
                return jsonify({'error': 'CNPJ deve ter 14 dígitos'}), 400
            
        if len(tenant_name) < 3:
            return jsonify({'error': 'Nome do tenant deve ter pelo menos 3 caracteres'}), 400
            
        if len(admin_username) < 3:
            return jsonify({'error': 'Username do admin deve ter pelo menos 3 caracteres'}), 400
            
        if not re.match(r"[^@]+@[^@]+\.[^@]+", admin_email):
            return jsonify({'error': 'Formato de email inválido para admin'}), 400
            
        if len(admin_password) < 6:
            return jsonify({'error': 'Password deve ter pelo menos 6 caracteres'}), 400
            
        # Verificar se tenant já existe
        existing_tenant = Tenant.query.filter_by(name=tenant_name).first()
        if existing_tenant:
            return jsonify({'error': 'Nome do tenant já existe'}), 409
            
        # Processar data de nascimento se fornecida
        birth_date_obj = None
        if birth_date and tenant_type == 'PF':
            try:
                birth_date_obj = datetime.strptime(birth_date, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Data de nascimento deve estar no formato YYYY-MM-DD'}), 400
            
        # Criar tenant
        new_tenant = Tenant(
            name=tenant_name,
            tenant_type=tenant_type,
            cpf=cpf,
            full_name=full_name,
            birth_date=birth_date_obj,
            cnpj=cnpj,
            company_name=company_name,
            trade_name=trade_name,
            email=email,
            phone=phone,
            creci=creci,
            zip_code=zip_code,
            street=street,
            number=number,
            complement=complement,
            neighborhood=neighborhood,
            city=city,
            state=state,
            country=country,
            address=address
        )
        
        db.session.add(new_tenant)
        db.session.flush()  # Para obter o ID do tenant
        
        # Criar usuário admin do tenant
        hashed_password = generate_password_hash(admin_password)
        admin_user = User(
            username=admin_username,
            email=admin_email,
            password=hashed_password,
            tenant_id=new_tenant.id,
            is_admin=True
        )
        
        db.session.add(admin_user)
        db.session.commit()
        
        return jsonify({
            'message': 'Tenant e administrador criados com sucesso',
            'tenant': new_tenant.to_dict(),
            'admin': {
                'id': admin_user.id,
                'username': admin_user.username,
                'email': admin_user.email
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@tenants_bp.route('/<int:tenant_id>/users', methods=['GET'])
@super_admin_required
def list_tenant_users(tenant_id):
    """Listar usuários de um tenant específico (apenas super admin)"""
    try:
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant não encontrado'}), 404
            
        users = User.query.filter_by(tenant_id=tenant_id).all()
        
        users_data = []
        for user in users:
            users_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin
            })
            
        return jsonify({
            'tenant': {
                'id': tenant.id,
                'name': tenant.name
            },
            'users': users_data,
            'total': len(users_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@tenants_bp.route('/<int:tenant_id>/stats', methods=['GET'])
@super_admin_required
def get_tenant_stats(tenant_id):
    """Estatísticas detalhadas de um tenant (apenas super admin)"""
    try:
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant não encontrado'}), 404
            
        # Estatísticas de usuários
        total_users = User.query.filter_by(tenant_id=tenant_id).count()
        admin_users = User.query.filter_by(tenant_id=tenant_id, is_admin=True).count()
        
        # Estatísticas de propriedades
        total_properties = Property.query.filter_by(tenant_id=tenant_id).count()
        
        # Estatísticas por status (se campo existir)
        properties_by_status = {}
        status_summary = None
        try:
            from sqlalchemy import func
            status_stats = db.session.query(
                Property.status, 
                func.count(Property.id)
            ).filter_by(tenant_id=tenant_id).group_by(Property.status).all()
            
            raw_status_counts = {status: count for status, count in status_stats}
            status_summary = aggregate_status_counts(raw_status_counts)
            properties_by_status = status_summary['counts_by_key']
        except:
            properties_by_status = {'total': total_properties}
        
        return jsonify({
            'tenant': {
                'id': tenant.id,
                'name': tenant.name
            },
            'stats': {
                'users': {
                    'total': total_users,
                    'admins': admin_users,
                    'regular': total_users - admin_users
                },
                'properties': {
                    'total': total_properties,
                    'by_status': properties_by_status,
                    'status_summary': status_summary
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@tenants_bp.route('/<int:tenant_id>', methods=['PUT'])
@super_admin_required
def update_tenant(tenant_id):
    """Atualizar dados do tenant (apenas super admin)"""
    try:
        if tenant_id == 1:
            return jsonify({'error': 'Não é possível editar o tenant master'}), 400

        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant não encontrado'}), 404

        data = request.get_json() or {}

        if 'name' in data:
            new_name = (data.get('name') or '').strip()
            if not new_name:
                return jsonify({'error': 'Nome é obrigatório'}), 400
            if len(new_name) < 3:
                return jsonify({'error': 'Nome deve ter pelo menos 3 caracteres'}), 400
            existing = Tenant.query.filter(Tenant.name == new_name, Tenant.id != tenant_id).first()
            if existing:
                return jsonify({'error': 'Nome já existe'}), 409
            tenant.name = new_name

        if 'tenant_type' in data:
            tenant_type = (data.get('tenant_type') or '').upper()
            if tenant_type not in ['PF', 'PJ']:
                return jsonify({'error': 'Tipo de tenant deve ser PF ou PJ'}), 400
            tenant.tenant_type = tenant_type

        if tenant.tenant_type == 'PF':
            if 'cpf' in data:
                cpf = (data.get('cpf') or '').strip()
                if cpf and len(cpf.replace('.', '').replace('-', '')) != 11:
                    return jsonify({'error': 'CPF deve conter 11 dígitos'}), 400
                tenant.cpf = cpf or None
            if 'full_name' in data:
                tenant.full_name = (data.get('full_name') or '').strip() or None
            if 'birth_date' in data:
                birth_date = data.get('birth_date')
                if birth_date:
                    try:
                        tenant.birth_date = datetime.strptime(birth_date, '%Y-%m-%d').date()
                    except ValueError:
                        return jsonify({'error': 'Data de nascimento deve estar no formato YYYY-MM-DD'}), 400
                else:
                    tenant.birth_date = None
        else:
            if 'cnpj' in data:
                cnpj = (data.get('cnpj') or '').strip()
                if cnpj and len(cnpj.replace('.', '').replace('/', '').replace('-', '')) != 14:
                    return jsonify({'error': 'CNPJ deve conter 14 dígitos'}), 400
                tenant.cnpj = cnpj or None
            if 'company_name' in data:
                tenant.company_name = (data.get('company_name') or '').strip() or None
            if 'trade_name' in data:
                tenant.trade_name = (data.get('trade_name') or '').strip() or None

        # Campos comuns opcionais
        for field in [
            'email', 'phone', 'creci', 'zip_code', 'street', 'number',
            'complement', 'neighborhood', 'city', 'state', 'country', 'address'
        ]:
            if field in data:
                value = data.get(field)
                tenant.__setattr__(field, value.strip() if isinstance(value, str) else value or None)

        # Atualizar endereço completo se não enviado diretamente
        if 'address' not in data:
            address_parts = []
            if tenant.street:
                address_parts.append(tenant.street)
            if tenant.number:
                address_parts.append(f"nº {tenant.number}")
            if tenant.complement:
                address_parts.append(tenant.complement)
            if tenant.neighborhood:
                address_parts.append(f"- {tenant.neighborhood}")
            tenant.address = ', '.join(address_parts) if address_parts else tenant.address

        db.session.commit()

        users_count = User.query.filter_by(tenant_id=tenant.id).count()
        properties_count = Property.query.filter_by(tenant_id=tenant.id).count()

        tenant_data = tenant.to_dict()
        tenant_data.update({
            'users_count': users_count,
            'properties_count': properties_count,
            'is_master': tenant.id == 1
        })

        return jsonify({
            'message': 'Tenant atualizado com sucesso',
            'tenant': tenant_data
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@tenants_bp.route('/<int:tenant_id>', methods=['DELETE'])
@super_admin_required
def delete_tenant(tenant_id):
    """Deletar tenant (apenas super admin) - CUIDADO!"""
    try:
        if tenant_id == 1:
            return jsonify({'error': 'Não é possível deletar o tenant master'}), 400
            
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant não encontrado'}), 404
            
        # Verificar se tem dados associados
        users_count = User.query.filter_by(tenant_id=tenant_id).count()
        properties_count = Property.query.filter_by(tenant_id=tenant_id).count()
        
        if users_count > 0 or properties_count > 0:
            return jsonify({
                'error': f'Não é possível deletar tenant com dados associados. Users: {users_count}, Properties: {properties_count}'
            }), 400
            
        db.session.delete(tenant)
        db.session.commit()
        
        return jsonify({'message': 'Tenant deletado com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@tenants_bp.route('/<int:tenant_id>/status', methods=['PATCH'])
@super_admin_required
def update_tenant_status(tenant_id):
    """Ativar, desativar ou pausar tenant (apenas super admin)"""
    try:
        if tenant_id == 1:
            return jsonify({'error': 'Não é possível alterar o status do tenant master'}), 400

        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant não encontrado'}), 404

        data = request.get_json() or {}

        desired_status = None
        if 'is_active' in data:
            desired_status = bool(data.get('is_active'))
        elif 'action' in data:
            action = str(data.get('action') or '').lower()
            if action in ['deactivate', 'pause', 'suspend']:
                desired_status = False
            elif action in ['activate', 'resume', 'reactivate']:
                desired_status = True

        if desired_status is None:
            return jsonify({'error': 'Informe is_active ou action (activate/deactivate)'}), 400

        if tenant.is_active == desired_status:
            return jsonify({
                'message': 'Status do tenant permanece o mesmo',
                'tenant': tenant.to_dict()
            }), 200

        tenant.is_active = desired_status
        db.session.commit()

        tenant_data = tenant.to_dict()
        tenant_data.update({
            'status': 'ativo' if tenant.is_active else 'inativo'
        })

        return jsonify({
            'message': 'Status do tenant atualizado com sucesso',
            'tenant': tenant_data
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@tenants_bp.route('/<int:tenant_id>/users', methods=['GET'])
@super_admin_required
def get_tenant_users(tenant_id):
    """Listar usuários de um tenant específico (apenas super admin)"""
    try:
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant não encontrado'}), 404
        
        users = User.query.filter_by(tenant_id=tenant_id).order_by(User.created_at.desc()).all()
        
        users_data = []
        for user in users:
            user_data = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin,
                'is_active': user.is_active,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'last_login': user.last_login.isoformat() if user.last_login else None
            }
            users_data.append(user_data)
        
        return jsonify({
            'tenant': {
                'id': tenant.id,
                'name': tenant.name
            },
            'users': users_data,
            'total': len(users_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@tenants_bp.route('/<int:tenant_id>', methods=['GET'])
@super_admin_required
def get_tenant_detail(tenant_id):
    """Buscar detalhes completos de um tenant específico (apenas super admin)"""
    try:
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant não encontrado'}), 404
        
        # Dados básicos do tenant
        tenant_data = tenant.to_dict()
        
        # Contar usuários e propriedades
        users_count = User.query.filter_by(tenant_id=tenant.id).count()
        properties_count = Property.query.filter_by(tenant_id=tenant.id).count()
        
        tenant_data.update({
            'users_count': users_count,
            'properties_count': properties_count,
            'status': 'ativo' if tenant.is_active else 'inativo',
            'created_at': tenant.created_at.isoformat() if tenant.created_at else None
        })
        
        # Buscar contrato CanalPro se existir
        contract = CanalProContract.query.filter_by(tenant_id=tenant_id).first()
        if contract:
            tenant_data['contract'] = {
                'max_properties': getattr(contract, 'max_properties', contract.max_listings),
                'max_highlights': getattr(contract, 'max_highlights', (contract.highlight_limits or {}).get('PREMIUM')),
                'max_super_highlights': getattr(contract, 'max_super_highlights', (contract.highlight_limits or {}).get('SUPER_PREMIUM')),
                'highlight_limits': contract.highlight_limits or {},
                'max_listings': contract.max_listings,
                'expires_at': getattr(contract, 'expires_at', None).isoformat() if getattr(contract, 'expires_at', None) else None
            }
        
        return jsonify(tenant_data), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500


@tenants_bp.route('/<int:tenant_id>/token-status', methods=['GET'])
@super_admin_required
def get_tenant_token_status(tenant_id):
    """Retorna o status dos tokens de integração de um tenant específico."""
    try:
        credentials = IntegrationCredentials.query.filter_by(tenant_id=tenant_id).all()

        tokens = []
        total_active = 0
        total_expired = 0
        total_expiring_soon = 0
        now = datetime.now(timezone.utc)

        for cred in credentials:
            expires_at = cred.expires_at
            if expires_at and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            status = 'unknown'
            if expires_at:
                if expires_at < now:
                    status = 'expired'
                    total_expired += 1
                elif (expires_at - now).total_seconds() < 3600:
                    status = 'expiring_soon'
                    total_expiring_soon += 1
                else:
                    status = 'active'
                    total_active += 1

            metadata = cred.metadata_json or {}

            tokens.append({
                'id': cred.id,
                'tenant_id': cred.tenant_id,
                'provider': cred.provider,
                'status': status,
                'expires_at': expires_at.isoformat() if expires_at else None,
                'created_at': cred.created_at.isoformat() if cred.created_at else None,
                'last_validated_at': cred.last_validated_at.isoformat() if cred.last_validated_at else None,
                'last_validated_ok': cred.last_validated_ok,
                'device_id': metadata.get('device_id'),
                'email': metadata.get('email'),
                'automation_enabled': metadata.get('automation_enabled', False)
            })

        return jsonify({
            'tokens': tokens,
            'summary': {
                'total': len(tokens),
                'active': total_active,
                'expired': total_expired,
                'expiring_soon': total_expiring_soon,
                'last_check': now.isoformat()
            }
        }), 200

    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@tenants_bp.route('/quotas', methods=['GET'])
@super_admin_required
def get_all_tenants_quotas():
    """Retorna quotas e uso de TODOS os tenants (Business Center)"""
    try:
        tenants = Tenant.query.all()
        quotas_data = []
        
        for tenant in tenants:
            # Contagens básicas
            users_count = User.query.filter_by(tenant_id=tenant.id).count()
            properties_count = Property.query.filter_by(tenant_id=tenant.id).count()
            
            # Buscar configuração de contrato
            contract = CanalProContract.query.filter_by(
                tenant_id=tenant.id, 
                provider='gandalf'
            ).first()
            
            max_listings = contract.max_listings if contract else None
            highlight_limits = contract.highlight_limits if contract else {}
            
            # Contagem por publication_type
            pub_counts = {}
            pub_query = db.session.query(
                Property.publication_type,
                func.count(Property.id)
            ).filter(
                Property.tenant_id == tenant.id
            ).group_by(Property.publication_type).all()
            
            for pub_type, count in pub_query:
                key = (pub_type or 'STANDARD').upper()
                pub_counts[key] = count
            
            # Calcular uso de destaques
            highlights_usage = {}
            for pub_type in ['STANDARD', 'PREMIUM', 'SUPER_PREMIUM', 'PREMIERE_1', 'PREMIERE_2', 'TRIPLE']:
                used = pub_counts.get(pub_type, 0)
                limit = None
                
                if isinstance(highlight_limits, dict):
                    limit = highlight_limits.get(pub_type)
                
                remaining = (limit - used) if (limit is not None) else None
                percentage = (used / limit * 100) if (limit and limit > 0) else None
                over_limit = (remaining is not None and remaining < 0)
                
                highlights_usage[pub_type] = {
                    'used': used,
                    'limit': limit,
                    'remaining': remaining,
                    'percentage': round(percentage, 1) if percentage is not None else None,
                    'over_limit': over_limit
                }
            
            # Calcular uso total de anúncios
            total_usage = None
            if isinstance(max_listings, int):
                remaining = max_listings - properties_count
                percentage = (properties_count / max_listings * 100) if max_listings > 0 else 0
                total_usage = {
                    'used': properties_count,
                    'limit': max_listings,
                    'remaining': remaining,
                    'percentage': round(percentage, 1),
                    'over_limit': remaining < 0
                }
            
            # Determinar nível de alerta
            alert_level = 'ok'
            alert_message = None
            
            if total_usage and total_usage['percentage']:
                if total_usage['percentage'] >= 100:
                    alert_level = 'critical'
                    alert_message = 'Limite de anúncios atingido'
                elif total_usage['percentage'] >= 95:
                    alert_level = 'warning'
                    alert_message = 'Limite de anúncios quase esgotado (>95%)'
                elif total_usage['percentage'] >= 80:
                    alert_level = 'info'
                    alert_message = 'Limite de anúncios em 80%'
            
            # Verificar alertas de destaques
            for pub_type, usage in highlights_usage.items():
                if usage['percentage'] and usage['percentage'] >= 95:
                    if alert_level == 'ok':
                        alert_level = 'warning'
                        alert_message = f'Limite de {pub_type} quase esgotado'
            
            quotas_data.append({
                'tenant_id': tenant.id,
                'tenant_name': tenant.name,
                'tenant_type': tenant.tenant_type,
                'is_active': tenant.is_active,
                'contract': {
                    'has_contract': contract is not None,
                    'contract_number': contract.contract_number if contract else None,
                    'max_listings': max_listings
                },
                'usage': {
                    'users': users_count,
                    'properties': properties_count,
                    'total': total_usage,
                    'highlights': highlights_usage
                },
                'alert': {
                    'level': alert_level,
                    'message': alert_message
                }
            })
        
        return jsonify({
            'success': True,
            'tenants': quotas_data,
            'total': len(quotas_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@tenants_bp.route('/dashboard', methods=['GET'])
@super_admin_required
def get_dashboard():
    """Dashboard geral para super admin"""
    try:
        # Estatísticas gerais
        total_tenants = Tenant.query.count()
        total_users = User.query.count()
        total_properties = Property.query.count()
        
        # Top 5 tenants por usuários
        top_tenants = db.session.query(
            Tenant.name,
            func.count(User.id).label('users_count')
        ).join(User, Tenant.id == User.tenant_id)\
         .group_by(Tenant.id, Tenant.name)\
         .order_by(func.count(User.id).desc())\
         .limit(5).all()
        
        top_tenants_data = [{'name': name, 'users_count': count} for name, count in top_tenants]
        
        return jsonify({
            'overview': {
                'total_tenants': total_tenants,
                'total_users': total_users,
                'total_properties': total_properties
            },
            'top_tenants': top_tenants_data,
            'system_health': {
                'database': 'ok',
                'redis': 'ok',  # TODO: verificar redis real
                'status': 'healthy'
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500