"""
Auth utilities for admin functions
"""

from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from models import User

def admin_required(f):
    """
    Decorator to require admin privileges for a route
    Versão simplificada para trabalhar com schema atual
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return jsonify({'error': 'Token inválido'}), 401
            
            # Buscar o usuário atual
            current_user = User.query.get(current_user_id)
            if not current_user:
                return jsonify({'error': 'Usuário não encontrado'}), 401
            
            # Por enquanto, verificar se é admin pela coluna is_admin existente
            if not current_user.is_admin:
                return jsonify({'error': 'Acesso negado: privilégios de administrador necessários'}), 403
            
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': f'Erro na verificação de privilégios: {str(e)}'}), 500
    
    return decorated_function

def super_admin_required(f):
    """
    Decorator to require super admin privileges (sistema master)
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            current_user_id = get_jwt_identity()
            if not current_user_id:
                return jsonify({'error': 'Token inválido'}), 401
            
            # Buscar o usuário atual
            current_user = User.query.get(current_user_id)
            if not current_user:
                return jsonify({'error': 'Usuário não encontrado'}), 401
            
            # Verificar se pertence ao tenant master
            if not current_user.tenant.is_master:
                return jsonify({'error': 'Acesso negado: apenas usuários do sistema master'}), 403
            
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Erro na verificação de privilégios'}), 500
    
    return decorated_function