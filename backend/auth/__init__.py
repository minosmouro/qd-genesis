from flask import Blueprint, request, jsonify, g, current_app
import re
from extensions import db
from models import User, Tenant, IntegrationCredentials
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt
from functools import wraps
from utils.crypto import encrypt_token, decrypt_token
from utils.integration_tokens import _post_token_refresh
import requests
from sqlalchemy import or_

GANDALF_TEST_URL = 'https://gandalf-api.grupozap.com/'

def _validate_gandalf_token(token, metadata=None):
    headers = {'Authorization': token}
    if metadata:
        header_map = {
            'publisher_id': 'X-PublisherId',
            'odin_id': 'X-OdinID',
            'contract_id': 'X-ContractID',
            'client_id': 'X-ClientID',
            'company': 'X-Company'
        }
        for k, v in metadata.items():
            if k in header_map and v:
                headers[header_map[k]] = str(v)
    try:
        resp = requests.post(GANDALF_TEST_URL, headers=headers, json={'query': '{ __typename }'}, timeout=10)
        return resp.status_code == 200
    except Exception:
        return False

# tenant_required precisa estar definido antes de ser usado como decorator
def tenant_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        tenant_id = claims.get('tenant_id') if isinstance(claims, dict) else None
        if tenant_id is None:
            return jsonify({'message': 'Tenant claim missing in token'}), 403
        g.tenant_id = tenant_id
        return fn(*args, **kwargs)
    return wrapper


auth_bp = Blueprint('auth', __name__, url_prefix='/auth')
admin_bp = Blueprint('admin_integrations', __name__, url_prefix='/admin/integrations')

@admin_bp.route('/gandalf', methods=['POST'])
@tenant_required
def create_or_update_gandalf():
    data = request.get_json() or {}
    token = data.get('token')
    refresh_token = data.get('refresh_token')
    expires_in = data.get('expires_in')  # segundos
    expires_at = data.get('expires_at')  # isoformat opcional
    metadata = data.get('metadata')

    if not token and not refresh_token:
        return jsonify({'message': 'token or refresh_token is required'}), 400

    tenant_id = g.tenant_id
    creds = IntegrationCredentials.query.filter_by(tenant_id=tenant_id, provider='gandalf').first()

    if not creds:
        creds = IntegrationCredentials(tenant_id=tenant_id, provider='gandalf', token_encrypted=None, metadata_json=metadata)
        db.session.add(creds)

    # encrypt and store provided values
    if token:
        creds.token_encrypted = encrypt_token(token)
    if refresh_token:
        creds.refresh_token_encrypted = encrypt_token(refresh_token)
    if metadata is not None:
        creds.metadata_json = metadata

    # handle expires
    from datetime import datetime, timedelta
    if expires_in:
        try:
            creds.expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in))
        except Exception:
            pass
    elif expires_at:
        try:
            creds.expires_at = datetime.fromisoformat(expires_at)
        except Exception:
            pass

    # validate token immediately: prefer token, else try refresh
    ok = False
    validated_token = None
    if token:
        ok = _validate_gandalf_token(token, metadata)
        validated_token = token
    elif refresh_token:
        # try to exchange refresh for access token if provider supports it
        try:
            resp = _post_token_refresh(refresh_token, metadata)
            if resp and 'access_token' in resp:
                access = resp.get('access_token')
                creds.token_encrypted = encrypt_token(access)
                new_refresh = resp.get('refresh_token')
                if new_refresh:
                    creds.refresh_token_encrypted = encrypt_token(new_refresh)
                expires_in = resp.get('expires_in')
                if expires_in:
                    creds.expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in))
                ok = _validate_gandalf_token(access, metadata)
                validated_token = access
        except Exception:
            ok = False

    creds.last_validated_ok = bool(ok)
    creds.last_validated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({'message': 'saved', 'validated': ok}), 201


@admin_bp.route('/gandalf', methods=['GET'])
@tenant_required
def get_gandalf():
    tenant_id = g.tenant_id
    creds = IntegrationCredentials.query.filter_by(tenant_id=tenant_id, provider='gandalf').first()
    if not creds:
        return jsonify({'message': 'not found'}), 404
    return jsonify({
        'provider': creds.provider,
        'metadata': creds.metadata_json,
        'last_validated_at': creds.last_validated_at.isoformat() if creds.last_validated_at else None,
        'last_validated_ok': creds.last_validated_ok
    }), 200


@admin_bp.route('/gandalf/validate', methods=['GET'])
@tenant_required
def validate_gandalf():
    tenant_id = g.tenant_id
    creds = IntegrationCredentials.query.filter_by(tenant_id=tenant_id, provider='gandalf').first()
    if not creds:
        return jsonify({'message': 'not found'}), 404

    # try decrypt token
    token = None
    try:
        token = decrypt_token(creds.token_encrypted) if creds.token_encrypted else None
    except Exception:
        token = None

    # if no token decrypted but refresh available, try refresh
    if not token and creds.refresh_token_encrypted:
        try:
            refresh_token = decrypt_token(creds.refresh_token_encrypted)
            resp = _post_token_refresh(refresh_token, creds.metadata_json or {})
            if resp and 'access_token' in resp:
                access = resp.get('access_token')
                creds.token_encrypted = encrypt_token(access)
                new_refresh = resp.get('refresh_token')
                if new_refresh:
                    creds.refresh_token_encrypted = encrypt_token(new_refresh)
                expires_in = resp.get('expires_in')
                if expires_in:
                    from datetime import datetime, timedelta
                    creds.expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in))
                db.session.commit()
                token = access
        except Exception:
            token = None

    if not token:
        return jsonify({'message': 'cannot decrypt token'}), 500

    ok = _validate_gandalf_token(token, creds.metadata_json or {})
    from datetime import datetime
    creds.last_validated_ok = bool(ok)
    creds.last_validated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'validated': ok}), 200


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    tenant_name = data.get('tenant_name')

    if not username or not email or not password or not tenant_name:
        return jsonify({'message': 'Missing username, email, password, or tenant name'}), 400

    # Basic email format validation
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({'message': 'Invalid email format'}), 400

    if len(password) < 6:
        return jsonify({'message': 'Password must be at least 6 characters long'}), 400

    tenant = Tenant.query.filter_by(name=tenant_name).first()
    if not tenant:
        tenant = Tenant(name=tenant_name)
        db.session.add(tenant)
        db.session.commit()

    if User.query.filter_by(username=username, tenant_id=tenant.id).first():
        return jsonify({'message': 'Username already exists for this tenant'}), 409

    if User.query.filter_by(email=email, tenant_id=tenant.id).first():
        return jsonify({'message': 'Email already exists for this tenant'}), 409

    hashed_password = generate_password_hash(password)
    new_user = User(username=username, email=email, password=hashed_password, tenant_id=tenant.id)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully', 'user_id': new_user.id, 'tenant_id': tenant.id}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    import os
    try:
        data = request.get_json()

        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'message': 'Missing username or password'}), 400

        user = User.query.filter(or_(User.username == username, User.email == username)).first()

        if not user or not check_password_hash(user.password, password):
            return jsonify({'message': 'Invalid credentials'}), 401

        # identity must be a string to avoid JWT subject type errors; tenant_id in additional claims
        access_token = create_access_token(identity=str(user.id), additional_claims={'tenant_id': user.tenant_id})
        
        # Return user data along with token
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'tenant_id': user.tenant_id,
                'is_admin': user.is_admin
            }
        }), 200

    except Exception as e:
        current_app.logger.exception('Unhandled exception in /auth/login')
        # In development, allow returning the exception text when AUTH_LOGIN_DEBUG is enabled
        if str(os.getenv('AUTH_LOGIN_DEBUG', '')).lower() in ('1', 'true', 'yes'):
            return jsonify({'message': 'Internal server error', 'error': str(e)}), 500
        return jsonify({'message': 'Internal server error'}), 500


@auth_bp.route('/protected', methods=['GET'])
@tenant_required
def protected():
    claims = get_jwt()
    return jsonify(logged_in_as=claims.get('sub') or claims.get('user_id'), tenant_id=g.tenant_id), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    claims = get_jwt()
    user_id = claims.get('sub')
    tenant_id = claims.get('tenant_id')
    
    if not user_id:
        return jsonify({'message': 'Invalid token'}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'tenant_id': user.tenant_id,
        'is_admin': user.is_admin
    }), 200
