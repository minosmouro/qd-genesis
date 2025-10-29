"""
Sistema de gestão de usuários e tenants para corretores
Permite criar múltiplos corretores e gerenciar permissões
"""
from flask import Blueprint, request, jsonify, g
from extensions import db
from models import User, Tenant
from auth import tenant_required
from werkzeug.security import generate_password_hash
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from datetime import datetime, timezone
import re

# Blueprint para gestão de usuários
users_bp = Blueprint('users', __name__, url_prefix='/api/users')

@users_bp.route('/profile', methods=['GET'])
@tenant_required
def get_profile():
    """Obter perfil do usuário logado"""
    try:
        user_id = get_jwt_identity()
        user = User.query.filter_by(id=user_id, tenant_id=g.tenant_id).first()
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
            
        tenant = Tenant.query.get(user.tenant_id)
        
        return jsonify({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin,
                'tenant_id': user.tenant_id,
                'tenant_name': tenant.name if tenant else None
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@users_bp.route('/list', methods=['GET'])
@tenant_required  
def list_users():
    """Listar todos os usuários do tenant (apenas admins)"""
    try:
        user_id = get_jwt_identity()
        current_user = User.query.filter_by(id=user_id, tenant_id=g.tenant_id).first()
        
        if not current_user or not current_user.is_admin:
            return jsonify({'error': 'Acesso negado. Apenas administradores'}), 403
            
        # Buscar todos os usuários do tenant
        users = User.query.filter_by(tenant_id=g.tenant_id).all()
        
        users_data = []
        for user in users:
            users_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin,
                'created_at': user.id  # Usar ID como proxy para ordem de criação
            })
            
        return jsonify({
            'users': users_data,
            'total': len(users_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@users_bp.route('/create', methods=['POST'])
@tenant_required
def create_user():
    """Criar novo usuário/corretor (apenas admins)"""
    try:
        user_id = get_jwt_identity()
        current_user = User.query.filter_by(id=user_id, tenant_id=g.tenant_id).first()
        
        if not current_user or not current_user.is_admin:
            return jsonify({'error': 'Acesso negado. Apenas administradores'}), 403
            
        data = request.get_json()
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        is_admin = data.get('is_admin', False)
        
        # Validações
        if not username or not email or not password:
            return jsonify({'error': 'Username, email e password são obrigatórios'}), 400
            
        if len(username) < 3:
            return jsonify({'error': 'Username deve ter pelo menos 3 caracteres'}), 400
            
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return jsonify({'error': 'Formato de email inválido'}), 400
            
        if len(password) < 6:
            return jsonify({'error': 'Password deve ter pelo menos 6 caracteres'}), 400
            
        # Verificar se já existe
        existing_user = User.query.filter_by(username=username, tenant_id=g.tenant_id).first()
        if existing_user:
            return jsonify({'error': 'Username já existe neste tenant'}), 409
            
        existing_email = User.query.filter_by(email=email, tenant_id=g.tenant_id).first()  
        if existing_email:
            return jsonify({'error': 'Email já existe neste tenant'}), 409
            
        # Criar usuário
        hashed_password = generate_password_hash(password)
        new_user = User(
            username=username,
            email=email, 
            password=hashed_password,
            tenant_id=g.tenant_id,
            is_admin=is_admin
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': 'Usuário criado com sucesso',
            'user': {
                'id': new_user.id,
                'username': new_user.username,
                'email': new_user.email,
                'is_admin': new_user.is_admin
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@users_bp.route('/<int:user_id>', methods=['PUT'])
@tenant_required
def update_user(user_id):
    """Atualizar usuário (apenas admins ou próprio usuário)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.filter_by(id=current_user_id, tenant_id=g.tenant_id).first()
        
        # Verificar permissões: admin ou próprio usuário
        if not current_user or (not current_user.is_admin and int(current_user_id) != user_id):
            return jsonify({'error': 'Acesso negado'}), 403
            
        # Buscar usuário a ser editado
        user_to_edit = User.query.filter_by(id=user_id, tenant_id=g.tenant_id).first()
        if not user_to_edit:
            return jsonify({'error': 'Usuário não encontrado'}), 404
            
        data = request.get_json()
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        is_admin = data.get('is_admin')
        
        # Atualizar campos se fornecidos
        if username and username != user_to_edit.username:
            # Verificar se username já existe
            existing = User.query.filter_by(username=username, tenant_id=g.tenant_id).first()
            if existing and existing.id != user_id:
                return jsonify({'error': 'Username já existe'}), 409
            user_to_edit.username = username
            
        if email and email != user_to_edit.email:
            if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
                return jsonify({'error': 'Formato de email inválido'}), 400
            # Verificar se email já existe  
            existing = User.query.filter_by(email=email, tenant_id=g.tenant_id).first()
            if existing and existing.id != user_id:
                return jsonify({'error': 'Email já existe'}), 409
            user_to_edit.email = email
            
        if password:
            if len(password) < 6:
                return jsonify({'error': 'Password deve ter pelo menos 6 caracteres'}), 400
            user_to_edit.password = generate_password_hash(password)
            
        # Apenas admins podem alterar is_admin
        if is_admin is not None and current_user.is_admin:
            user_to_edit.is_admin = is_admin
            
        db.session.commit()
        
        return jsonify({
            'message': 'Usuário atualizado com sucesso',
            'user': {
                'id': user_to_edit.id,
                'username': user_to_edit.username,
                'email': user_to_edit.email,
                'is_admin': user_to_edit.is_admin
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@users_bp.route('/<int:user_id>', methods=['DELETE'])
@tenant_required
def delete_user(user_id):
    """Deletar usuário (apenas admins)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.filter_by(id=current_user_id, tenant_id=g.tenant_id).first()
        
        if not current_user or not current_user.is_admin:
            return jsonify({'error': 'Acesso negado. Apenas administradores'}), 403
            
        # Não permitir auto-deleção
        if int(current_user_id) == user_id:
            return jsonify({'error': 'Não é possível deletar seu próprio usuário'}), 400
            
        user_to_delete = User.query.filter_by(id=user_id, tenant_id=g.tenant_id).first()
        if not user_to_delete:
            return jsonify({'error': 'Usuário não encontrado'}), 404
            
        # TODO: Verificar se usuário tem imóveis associados antes de deletar
        
        db.session.delete(user_to_delete)
        db.session.commit()
        
        return jsonify({'message': 'Usuário deletado com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@users_bp.route('/stats', methods=['GET'])
@tenant_required
def get_stats():
    """Estatísticas do tenant (apenas admins)"""
    try:
        user_id = get_jwt_identity()
        current_user = User.query.filter_by(id=user_id, tenant_id=g.tenant_id).first()
        
        if not current_user or not current_user.is_admin:
            return jsonify({'error': 'Acesso negado. Apenas administradores'}), 403
            
        # Contar usuários
        total_users = User.query.filter_by(tenant_id=g.tenant_id).count()
        admin_users = User.query.filter_by(tenant_id=g.tenant_id, is_admin=True).count()
        regular_users = total_users - admin_users
        
        # TODO: Adicionar estatísticas de imóveis por usuário
        
        tenant = Tenant.query.get(g.tenant_id)
        
        return jsonify({
            'tenant': {
                'id': g.tenant_id,
                'name': tenant.name if tenant else 'Desconhecido'
            },
            'stats': {
                'total_users': total_users,
                'admin_users': admin_users,
                'regular_users': regular_users,
                'max_users': 50  # Limite por tenant
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500


@users_bp.route('/<int:user_id>/password', methods=['PUT'])
@jwt_required()
def change_user_password(user_id):
    """
    Alterar senha de um usuário (Super Admin ou Admin do próprio tenant)
    Super Admin (tenant_id=1) pode alterar senha de qualquer usuário
    Admin normal só pode alterar senha de usuários do seu tenant
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        # Buscar o usuário alvo
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        # Verificar permissões
        is_super_admin = current_user.tenant_id == 1 and current_user.is_admin
        is_same_tenant_admin = (
            current_user.tenant_id == target_user.tenant_id and 
            current_user.is_admin
        )
        
        if not (is_super_admin or is_same_tenant_admin):
            return jsonify({
                'error': 'Acesso negado. Apenas administradores podem alterar senhas'
            }), 403
        
        # Validar payload
        data = request.get_json()
        if not data or 'new_password' not in data:
            return jsonify({'error': 'Nova senha é obrigatória'}), 400
        
        new_password = data['new_password'].strip()
        
        # Validar senha
        if len(new_password) < 6:
            return jsonify({'error': 'A senha deve ter no mínimo 6 caracteres'}), 400
        
        if len(new_password) > 128:
            return jsonify({'error': 'A senha é muito longa (máximo 128 caracteres)'}), 400
        
        # Atualizar senha
        target_user.password_hash = generate_password_hash(new_password)
        target_user.updated_at = datetime.now(timezone.utc)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Senha alterada com sucesso',
            'user': {
                'id': target_user.id,
                'username': target_user.username,
                'email': target_user.email
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao alterar senha: {str(e)}'}), 500
