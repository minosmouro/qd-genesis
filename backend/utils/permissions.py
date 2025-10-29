"""
Decorators para controle de permissões
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from models import User
from extensions import db


def admin_required():
    """
    Decorator para proteger rotas que requerem permissões de administrador.
    
    Uso:
        @app.route('/admin/users')
        @jwt_required()
        @admin_required()
        def list_users():
            pass
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            # Verifica JWT primeiro
            verify_jwt_in_request()
            
            # Pega informações do token
            claims = get_jwt()
            user_id = claims.get('sub')
            
            if not user_id:
                return jsonify({
                    'success': False,
                    'error': 'Token inválido'
                }), 401
            
            # Busca usuário no banco
            user = db.session.query(User).filter(User.id == user_id).first()
            
            if not user:
                return jsonify({
                    'success': False,
                    'error': 'Usuário não encontrado'
                }), 404
            
            # Verifica se é admin
            if not user.is_admin:
                return jsonify({
                    'success': False,
                    'error': 'Acesso negado. Apenas administradores podem acessar este recurso.',
                    'required_permission': 'admin'
                }), 403
            
            # Usuário é admin, continua com a request
            return fn(*args, **kwargs)
        
        return decorator
    return wrapper


def get_current_user():
    """
    Helper para pegar o usuário atual autenticado.
    
    Returns:
        User: Instância do usuário ou None
    """
    try:
        verify_jwt_in_request()
        claims = get_jwt()
        user_id = claims.get('sub')
        
        if not user_id:
            return None
        
        return db.session.query(User).filter(User.id == user_id).first()
    except:
        return None
