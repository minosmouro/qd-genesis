from flask import Blueprint, request, jsonify, redirect, url_for, current_app
from flask_jwt_extended import jwt_required, get_current_user, get_jwt_identity
from models import db, IntegrationCredentials, User, Property
from sqlalchemy.orm.attributes import flag_modified
from utils.crypto import encrypt_token
from utils.integration_tokens import get_valid_integration_headers
from integrations.gandalf_service import GandalfService, GandalfError, list_listings, get_listing_by_external_id, activate_listing_status, activate_listing
from datetime import datetime, timedelta
import os
import random
import string

integrations_bp = Blueprint('integrations', __name__, url_prefix='/integrations')

def gerar_device_id_unico():
    """
    Gera device_id único no formato CanalPro descoberto via análise HAR.
    
    Formato: cmgy9yo1100002a6gtv3 + [5 chars aleatórios]
    - 20 caracteres fixos (prefixo)
    - 5 caracteres aleatórios (sufixo: a-z e 0-9)
    - Total: 25 caracteres
    
    Verifica anti-duplicação consultando todos os device_ids existentes.
    """
    PREFIXO_FIXO = "cmgy9yo1100002a6gtv3"  # 20 caracteres
    MAX_TENTATIVAS = 100
    
    for tentativa in range(MAX_TENTATIVAS):
        # Gerar sufixo aleatório (5 caracteres: letras minúsculas + números)
        sufixo = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
        device_id = PREFIXO_FIXO + sufixo
        
        # Verificar se JÁ existe em QUALQUER tenant
        # Nota: Para JSON (não JSONB), usar cast + comparação direta
        from sqlalchemy import cast, String
        existe = IntegrationCredentials.query.filter(
            IntegrationCredentials.provider == 'gandalf',
            cast(IntegrationCredentials.metadata_json['device_id'], String) == device_id
        ).first()
        
        if not existe:
            current_app.logger.info(f'✅ Device_id único gerado (tentativa {tentativa + 1}): {device_id}')
            return device_id
    
    # Improvável chegar aqui (5^36 = 60 milhões de combinações)
    raise Exception(f'Não foi possível gerar device_id único após {MAX_TENTATIVAS} tentativas')


@integrations_bp.route('/gandalf/authorize', methods=['GET'])
@jwt_required()
def gandalf_authorize():
    """
    Redireciona o usuário para a página de autorização do Gandalf (CanalPro).
    """
    # obtem identidade do JWT e carrega usuário do banco
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({"message": "User not found"}), 404

    # O state pode ser usado para passar o user_id e verificar no callback
    state = f"user_id:{user.id}" 
    
    gandalf_service = GandalfService()
    auth_url = gandalf_service.get_authorization_url(state)
    
    return redirect(auth_url)

@integrations_bp.route('/gandalf/callback', methods=['GET'])
def gandalf_callback():
    """
    Endpoint de callback que o Gandalf (CanalPro) chama após a autorização.
    """
    code = request.args.get('code')
    state = request.args.get('state') # Recupera o state

    if not code:
        return jsonify({"message": "Authorization code not found"}), 400

    # Extrair user_id do state
    try:
        user_id = int(state.split(':')[1])
        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404
    except (IndexError, ValueError):
        return jsonify({"message": "Invalid state parameter"}), 400

    gandalf_service = GandalfService()
    
    try:
        tokens = gandalf_service.exchange_code_for_token(code)
        access_token = tokens['access_token']
        refresh_token = tokens.get('refresh_token')
        expires_in = tokens.get('expires_in')
    except Exception as e:
        current_app.logger.error(f"Failed to exchange code for token: {e}")
        return jsonify({"message": f"Failed to get token from provider: {e}"}), 500

    # Salvar as credenciais
    encrypted_access_token = encrypt_token(access_token)
    encrypted_refresh_token = encrypt_token(refresh_token) if refresh_token else None

    credential = IntegrationCredentials.query.filter_by(
        provider='gandalf', 
        tenant_id=user.tenant_id,
        user_id=user.id
    ).first()

    if credential:
        credential.token_encrypted = encrypted_access_token
        credential.refresh_token_encrypted = encrypted_refresh_token
    else:
        credential = IntegrationCredentials(
            provider='gandalf',
            tenant_id=user.tenant_id,
            user_id=user.id,
            token_encrypted=encrypted_access_token,
            refresh_token_encrypted=encrypted_refresh_token,
        )
        db.session.add(credential)
    
    db.session.commit()

    # Redirecionar para uma página de sucesso no frontend
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    return redirect(f"{frontend_url}/settings?integration_success=true")

@integrations_bp.route('/gandalf/credentials', methods=['POST'])
@jwt_required()
def gandalf_save_credentials():
    """Recebe email, password, device_id e opcional otp no body JSON.

    Tenta autenticar no Gandalf via GraphQL. Se o fluxo requer OTP, retorna
    {'needs_otp': True} com status 202. Em caso de sucesso, criptografa e salva
    as credenciais no registro IntegrationCredentials do usuário autenticado.
    """
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    payload = request.get_json() or {}
    email = payload.get('email')
    password = payload.get('password')
    device_id = payload.get('device_id')
    otp = payload.get('otp')

    if not email or not password or not device_id:
        return jsonify({'message': 'email, password and device_id are required'}), 400

    service = GandalfService()
    try:
        result = service.login_and_get_credentials(email=email, password=password, device_id=device_id, otp=otp)
    except GandalfError as e:
        current_app.logger.error(f'Gandalf login error for user {user.id}: {e}')
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        current_app.logger.exception('Unexpected error while contacting Gandalf')
        return jsonify({'message': 'Unexpected error while contacting Gandalf'}), 500

    if result.get('needs_otp'):
        return jsonify({'needs_otp': True, 'message': result.get('message')}), 202

    creds = result.get('credentials') or {}
    access_token = creds.get('accessToken')
    refresh_token = creds.get('refreshToken')
    expires_in = creds.get('expiresIn')

    if not access_token:
        return jsonify({'message': 'No access token returned by Gandalf'}), 500

    encrypted_access = encrypt_token(access_token)
    encrypted_refresh = encrypt_token(refresh_token) if refresh_token else None

    # calcula expires_at se expires_in informado
    expires_at = None
    try:
        if expires_in:
            expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in))
    except Exception:
        expires_at = None

    credential = IntegrationCredentials.query.filter_by(
        provider='gandalf',
        tenant_id=user.tenant_id,
        user_id=user.id
    ).first()

    metadata = credential.metadata_json if credential else {}
    # Atualiza metadata com origem e device_id
    try:
        metadata = metadata or {}
        metadata.update({'device_id': device_id, 'linked_by_user_id': user.id})
    except Exception:
        metadata = {'device_id': device_id, 'linked_by_user_id': user.id}

    if credential:
        credential.token_encrypted = encrypted_access
        credential.refresh_token_encrypted = encrypted_refresh
        credential.expires_at = expires_at
        credential.metadata_json = metadata
    else:
        credential = IntegrationCredentials(
            provider='gandalf',
            tenant_id=user.tenant_id,
            user_id=user.id,
            token_encrypted=encrypted_access,
            refresh_token_encrypted=encrypted_refresh,
            expires_at=expires_at,
            metadata_json=metadata
        )
        db.session.add(credential)

    db.session.commit()

    return jsonify({'message': 'Credentials saved successfully'}), 200

@integrations_bp.route('/gandalf/start', methods=['POST'])
@jwt_required()
def gandalf_start_login():
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    payload = request.get_json() or {}
    email = payload.get('email')
    password = payload.get('password')
    
    if not email or not password:
        return jsonify({'message': 'email and password are required'}), 400
    
    # 🎯 NOVA LÓGICA: Gerenciamento de device_id com estados
    credential = IntegrationCredentials.query.filter_by(
        provider='gandalf',
        tenant_id=user.tenant_id
    ).first()
    
    # CENÁRIO 1: Primeiro acesso do tenant
    if not credential:
        device_id = gerar_device_id_unico()
        credential = IntegrationCredentials(
            tenant_id=user.tenant_id,
            provider='gandalf',
            token_encrypted='PENDING_OTP_VALIDATION',  # Placeholder até validar OTP
            metadata_json={
                'device_id': device_id,
                'device_status': 'new',
                'email': email,
                'created_at': datetime.utcnow().isoformat()
            }
        )
        db.session.add(credential)
        db.session.flush()  # Para ter o ID antes do commit
        current_app.logger.info(f'🆕 Primeiro acesso - device_id gerado: {device_id}')
    
    # CENÁRIO 2/3: Já tem credential
    else:
        device_id = credential.metadata_json.get('device_id') if credential.metadata_json else None
        device_status = credential.metadata_json.get('device_status') if credential.metadata_json else None
        
        if not device_id or device_status == 'invalid':
            # Edge case: credential existe mas sem device_id OU foi invalidado
            device_id = gerar_device_id_unico()
            if not credential.metadata_json:
                credential.metadata_json = {}
            credential.metadata_json['device_id'] = device_id
            credential.metadata_json['device_status'] = 'new'
            credential.metadata_json['email'] = email
            credential.metadata_json['regenerated_at'] = datetime.utcnow().isoformat()
            flag_modified(credential, 'metadata_json')
            current_app.logger.info(f'🔧 Device_id regenerado: {device_id} (motivo: {device_status or "ausente"})')
        else:
            current_app.logger.info(f'♻️ Device_id existente: {device_id} (status: {device_status})')
    
    db.session.commit()

    # 🔍 LOG DETALHADO
    current_app.logger.info(f'🎯 /gandalf/start - Usuário CRM: {user.email}')
    current_app.logger.info(f'🎯 /gandalf/start - Email CanalPro: {email}')
    current_app.logger.info(f'🎯 /gandalf/start - Device ID: {device_id}')

    service = GandalfService()
    try:
        result = service.start_login_session(email=email, password=password, device_id=device_id)
    except GandalfError as e:
        current_app.logger.error(f'Gandalf start login error for user {user.id}: {e}')
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        current_app.logger.exception('Unexpected error while starting Gandalf login')
        return jsonify({'message': 'Unexpected error while contacting Gandalf', 'error': str(e)}), 500

    # 🎯 PROCESSAR RESULTADO DO LOGIN
    if result.get('needs_otp'):
        # isSafeDevice = false → Precisa OTP
        current_app.logger.info('📧 Login requer OTP - marcando device como pending_validation')
        
        # Atualizar status para "aguardando validação OTP"
        if not credential.metadata_json:
            credential.metadata_json = {}
        credential.metadata_json['device_status'] = 'pending_validation'
        credential.metadata_json['email'] = email
        credential.metadata_json['pending_since'] = datetime.utcnow().isoformat()
        flag_modified(credential, 'metadata_json')
        db.session.commit()
        
        return jsonify({
            'needs_otp': True,
            'session_id': result['session_id'],
            'otp_sent': True,  # ✅ OTP enviado automaticamente pelo start_login_session
            'message': 'OTP code sent to your email'
        }), 200
    
    elif result.get('credentials'):
        # isSafeDevice = true → Login direto! Device já é confiável
        current_app.logger.info('✅ Login direto - device já validado, salvando credentials')
        
        creds = result['credentials']
        encrypted_access = encrypt_token(creds.get('accessToken'))
        encrypted_refresh = encrypt_token(creds.get('refreshToken')) if creds.get('refreshToken') else None
        expires_in = creds.get('expiresIn')
        expires_at = None
        try:
            if expires_in:
                expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in))
        except Exception:
            expires_at = None

        # Atualizar credential com tokens E marcar device como validated
        if not credential.metadata_json:
            credential.metadata_json = {}
        
        credential.metadata_json.update({
            'device_id': device_id,
            'device_status': 'validated',  # ⭐ Marcar como validado
            'validated_at': datetime.utcnow().isoformat(),
            'linked_by_user_id': user.id,
            'email': email,
            'password_encrypted': encrypt_token(password),  # Para renovação automática
            'automation_enabled': True,
            'renewal_system': 'integrated',
            'publisher_id': '119007',
            'client_id': 'CANALPRO_WEB',
            'company': 'ZAP_OLX'
        })
        flag_modified(credential, 'metadata_json')
        
        credential.token_encrypted = encrypted_access
        credential.refresh_token_encrypted = encrypted_refresh
        credential.expires_at = expires_at
        db.session.commit()
        
        current_app.logger.info(f'✅ Credentials salvas - device_id: {device_id} (validated)')
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'validated': True
        }), 200
    
    # Caso inesperado
    return jsonify({'message': 'Unexpected result from Gandalf'}), 500


@integrations_bp.route('/gandalf/validate', methods=['POST'])
@jwt_required()
def gandalf_validate_login():
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    payload = request.get_json() or {}
    session_id = payload.get('session_id')
    otp = payload.get('otp')
    
    if not session_id or not otp:
        return jsonify({'message': 'session_id and otp are required'}), 400
    
    # Recuperar credential para pegar device_id e email
    credential = IntegrationCredentials.query.filter_by(
        provider='gandalf',
        tenant_id=user.tenant_id
    ).first()
    
    if not credential or not credential.metadata_json:
        return jsonify({'message': 'No pending login session found'}), 400
    
    device_id = credential.metadata_json.get('device_id')
    email = credential.metadata_json.get('email')
    
    if not device_id or not email:
        return jsonify({'message': 'Invalid session data'}), 400

    service = GandalfService()
    try:
        result = service.validate_login_with_session(
            session_id=session_id,
            email=email,
            device_id=device_id,
            otp=otp
        )
    except GandalfError as e:
        current_app.logger.error(f'Gandalf validate login error for user {user.id}: {e}')
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        current_app.logger.exception('Unexpected error while validating Gandalf login')
        return jsonify({'message': 'Unexpected error while contacting Gandalf'}), 500

    creds = result.get('credentials') or {}
    access_token = creds.get('accessToken')
    refresh_token = creds.get('refreshToken')
    expires_in = creds.get('expiresIn')

    if not access_token:
        return jsonify({'message': 'No access token returned by Gandalf'}), 500

    encrypted_access = encrypt_token(access_token)
    encrypted_refresh = encrypt_token(refresh_token) if refresh_token else None

    expires_at = None
    try:
        if expires_in:
            expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in))
    except Exception:
        expires_at = None

    # ⭐ Atualizar credential COM device_status = 'validated'
    if not credential.metadata_json:
        credential.metadata_json = {}
    
    credential.metadata_json.update({
        'device_id': device_id,
        'device_status': 'validated',  # ⭐ MARCA COMO VALIDADO!
        'validated_at': datetime.utcnow().isoformat(),
        'linked_by_user_id': user.id,
        'email': email,
        'automation_enabled': True,
        'renewal_system': 'integrated',
        'publisher_id': '119007',
        'client_id': 'CANALPRO_WEB',
        'company': 'ZAP_OLX'
    })
    
    # ⚠️ CRÍTICO: Marcar metadata_json como modificado para SQLAlchemy persistir
    flag_modified(credential, 'metadata_json')
    
    credential.token_encrypted = encrypted_access
    credential.refresh_token_encrypted = encrypted_refresh
    credential.expires_at = expires_at
    db.session.commit()

    current_app.logger.info(f'✅ OTP validado - device_id: {device_id} marcado como validated')
    return jsonify({
        'success': True,
        'message': 'Credentials saved successfully',
        'validated': True
    }), 200

@integrations_bp.route('/gandalf/import', methods=['POST'])
@jwt_required()
def gandalf_import_listings():
    """Importa listagens do CanalPro (Gandalf) para o sistema usando ImportService.
    
    ATUALIZADO: Agora usa ImportService.import_all_from_gandalf() que executa PropertyMapper
    corretamente, garantindo que property_type, category, unit_types e unit_subtypes sejam
    salvos corretamente.

    - Aceita body opcional com { only_active: boolean } para filtrar apenas imóveis ACTIVE
    - Usa ImportService que chama PropertyMapper.map_listing_to_property()
    - Retorna um objeto compatível com o frontend: { inserted, updated, skipped, total_listings, errors, message }
    """
    from properties.services.import_service import ImportService
    
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    payload = request.get_json() or {}
    only_active = payload.get('only_active', True)  # Default True
    
    current_app.logger.info(f"🚀 Iniciando importação via /integrations/gandalf/import para tenant {user.tenant_id}")
    current_app.logger.info(f"📋 Opções: only_active={only_active}")

    try:
        # Usa o ImportService que executa PropertyMapper corretamente
        options = {
            'status_filter': ['ACTIVE'] if only_active else None
        }
        result = ImportService.import_all_from_gandalf(user.tenant_id, options)
        
        current_app.logger.info(f"✅ Importação concluída: {result}")
        return jsonify(result), 200
        
    except ValueError as e:
        current_app.logger.error(f"❌ Erro de validação na importação: {e}")
        return jsonify({'message': str(e), 'inserted': 0, 'updated': 0, 'errors': [str(e)]}), 400
    except Exception as e:
        current_app.logger.exception(f"❌ Erro inesperado na importação")
        return jsonify({
            'message': 'Import failed',
            'error': str(e),
            'inserted': 0,
            'updated': 0,
            'errors': [str(e)]
        }), 500

@integrations_bp.route('/gandalf/import_one', methods=['POST'])
@jwt_required()
def gandalf_import_one():
    """Importa um único imóvel identificado por external_id passado no body JSON.

    Corpo: { external_id: '...' }
    """
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    payload = request.get_json() or {}
    external_id = payload.get('external_id')
    if not external_id:
        return jsonify({'message': 'external_id is required'}), 400

    try:
        headers = get_valid_integration_headers(user.tenant_id, 'gandalf')
    except Exception as e:
        current_app.logger.error(f'Failed to get integration headers for tenant {user.tenant_id}: {e}')
        return jsonify({'message': 'No valid integration credentials found or failed to refresh'}), 400

    try:
        listings = get_listing_by_external_id(headers, external_id)
    except Exception as e:
        current_app.logger.exception('Failed to fetch listings from Gandalf')
        return jsonify({'message': 'Failed to fetch listings from Gandalf', 'error': str(e)}), 500

    found = None
    for item in listings:
        eid = item.get('externalId') or str(item.get('id') or '')
        if str(eid) == str(external_id):
            found = item
            break

    if not found:
        return jsonify({'message': 'Listing not found on Gandalf with given external_id'}), 404

    # upsert
    try:
        prop = Property.query.filter_by(external_id=str(external_id), tenant_id=user.tenant_id).first()
        images = found.get('images') or []
        image_urls = [i.get('imageUrl') for i in images if i.get('imageUrl')]

        if prop:
            prop.title = found.get('title') or prop.title
            prop.description = found.get('description') or prop.description
            prop.image_urls = image_urls
            prop.status = 'imported'
        else:
            prop = Property(
                title=found.get('title') or '',
                description=found.get('description') or '',
                external_id=str(external_id),
                tenant_id=user.tenant_id,
                image_urls=image_urls,
                status='imported'
            )
            db.session.add(prop)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception('Failed to upsert property')
        return jsonify({'message': 'Failed to save imported property', 'error': str(e)}), 500

    return jsonify({'message': 'Property imported', 'external_id': external_id}), 200


# =============================================================================
# CANAL PRO EXPORT ROUTES
# =============================================================================

@integrations_bp.route('/canalpro/export', methods=['POST'])
@jwt_required()
def canalpro_export():
    """
    Inicia a exportação de propriedades para o Canal Pro.
    Recebe uma lista de property_ids no body JSON.
    """
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    payload = request.get_json() or {}
    property_ids = payload.get('propertyIds') or payload.get('property_ids', [])

    if not property_ids:
        return jsonify({'message': 'propertyIds or property_ids is required'}), 400

    try:
        from integrations.canalpro_exporter import CanalProExporter

        exporter = CanalProExporter(user.tenant_id, user.id)
        export_id = exporter.run_export(property_ids, current_app.app_context())

        return jsonify({
            'export_id': export_id,
            'message': 'Export started successfully',
            'status': 'running'
        }), 200

    except Exception as e:
        current_app.logger.exception('Error starting Canal Pro export')
        error_message = str(e)
        if "Authentication failed" in error_message or "No valid integration token" in error_message:
            error_message = "Credenciais expiradas. Configure novas credenciais em /integrations/canalpro/setup"
        return jsonify({'message': f'Failed to start export: {error_message}'}), 500


@integrations_bp.route('/canalpro/export_and_activate', methods=['POST'])
@jwt_required()
def canalpro_export_and_activate():
    """
    Endpoint que exporta propriedades para o Canal Pro e em seguida tenta ativá-las.
    Body: { propertyIds: [1,2,3] }
    Retorna estatísticas de exportação e resultados de ativação por property id.
    """
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    payload = request.get_json() or {}
    property_ids = payload.get('propertyIds') or payload.get('property_ids', [])
    if not property_ids:
        return jsonify({'message': 'propertyIds or property_ids is required'}), 400

    try:
        from integrations.canalpro_exporter import CanalProExporter

        exporter = CanalProExporter(user.tenant_id, user.id)

        # Executar tudo dentro do contexto da aplicação
        with current_app.app_context():
            # autenticar
            if not exporter.authenticate():
                current_app.logger.error('Falha na autenticação do exportador')
                return jsonify({'message': 'Authentication failed'}), 500

            # executar export (isso preencherá property.remote_id quando bem-sucedido)
            # Passar None para que o método crie seu próprio contexto quando necessário
            stats = exporter.run_export(property_ids, None)

            # tentar ativar cada propriedade exportada
            activation_results = []
            # Importar dentro do escopo para evitar problemas de ciclo em alguns ambientes
            from integrations.gandalf_service import activate_listing_status, activate_listing

            for pid in property_ids:
                prop = Property.query.get(pid)
                if not prop:
                    activation_results.append({'property_id': pid, 'error': 'property_not_found'})
                    continue

                remote_id = getattr(prop, 'remote_id', None)
                if not remote_id:
                    activation_results.append({'property_id': pid, 'remote_id': None, 'activated': False, 'reason': 'not_exported'})
                    continue

                try:
                    # Normalizar publication_type do imóvel para valores aceitos pela API
                    pub = getattr(prop, 'publication_type', None)
                    if isinstance(pub, str) and pub:
                        normalized_pub = pub.strip().upper().replace(' ', '_')
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
                        normalized_pub = alias_map.get(normalized_pub, normalized_pub)
                        valid_pub = {'STANDARD', 'PREMIUM', 'SUPER_PREMIUM', 'PREMIERE_1', 'PREMIERE_2', 'TRIPLE'}
                        publication_type_value = normalized_pub if normalized_pub in valid_pub else 'STANDARD'
                    else:
                        publication_type_value = 'STANDARD'

                    # Primeiro atualiza o tipo de publicação (destacado/padrão) no Canal Pro
                    pub_resp = activate_listing(exporter.credentials, remote_id, publication_type_value)

                    act_resp = activate_listing_status(exporter.credentials, remote_id, 'ACTIVE')
                    # Handle null response safely
                    error_detail = None
                    success = False
                    
                    current_app.logger.info(f'=== RESPOSTA COMPLETA PARA PROPERTY {pid} ===')
                    current_app.logger.info(f'PublicationType response: {pub_resp}')
                    current_app.logger.info(f'Status response: {act_resp}')
                    
                    if act_resp is None:
                        success = False
                        error_detail = 'Resposta nula da API CanalPro.'
                        current_app.logger.warning(f'activate_listing_status returned None for property {pid}')
                    else:
                        # Primeiro verificar se a operação foi bem-sucedida independente de erros GraphQL
                        data = act_resp.get('data') if isinstance(act_resp, dict) else None
                        update_status = data.get('updateListingStatus') if isinstance(data, dict) else None
                        
                        # Se temos updateListingStatus e success=True, consideramos sucesso
                        if isinstance(update_status, dict) and update_status.get('success') is True:
                            success = True
                            error_detail = None
                            current_app.logger.info(f'✅ SUCESSO para property {pid} (updateListingStatus.success=True)')
                        elif isinstance(update_status, dict):
                            # updateListingStatus existe mas success não é True
                            success = False
                            error_detail = update_status.get('errorMessage') or update_status.get('message') or update_status.get('errors') or f"success={update_status.get('success')}"
                            current_app.logger.warning(f'❌ FALHA para property {pid}: {error_detail}')
                        else:
                            # Verificar se há erros GraphQL mas ainda assim pode ter tido sucesso
                            graphql_errors = act_resp.get('errors') if isinstance(act_resp, dict) else None
                            if graphql_errors:
                                current_app.logger.warning(f'Erros GraphQL para property {pid}: {graphql_errors}')
                                # Mesmo com erros GraphQL, se chegou até aqui a operação pode ter funcionado
                                # (baseado no fato de que o imóvel aparece ativo no Canal Pro)
                                success = True
                                error_detail = f"Operação executada com avisos GraphQL: {graphql_errors}"
                                current_app.logger.info(f'⚠️ SUCESSO COM AVISOS para property {pid}')
                            else:
                                success = False
                                error_detail = f"Campo updateListingStatus ausente ou inválido: {act_resp}"
                                current_app.logger.warning(f'Campo updateListingStatus ausente ou inválido na resposta para property {pid}: {act_resp}')
                    activation_results.append({
                        'property_id': pid,
                        'remote_id': remote_id,
                        'activated': success,
                        'response': act_resp,
                        'error': error_detail
                    })
                except Exception as e:
                    current_app.logger.exception(f'Erro ao ativar propriedade {pid}: {e}')
                    activation_results.append({'property_id': pid, 'remote_id': remote_id, 'activated': False, 'error': str(e)})

        return jsonify({'export_stats': stats, 'activation_results': activation_results}), 200

    except Exception as e:
        current_app.logger.exception('Error in export_and_activate')
        return jsonify({'message': f'Failed to export and activate: {str(e)}'}), 500


@integrations_bp.route('/canalpro/export/status', methods=['GET'])
@jwt_required()
def canalpro_export_status():
    """
    Retorna o status atual da exportação em andamento.
    """
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    try:
        from integrations.canalpro_exporter import CanalProExporter

        exporter = CanalProExporter(user.tenant_id, user.id)
        status = exporter.get_export_status()

        return jsonify(status), 200

    except Exception as e:
        current_app.logger.exception('Error getting export status')
        return jsonify({'message': f'Failed to get status: {str(e)}'}), 500

@integrations_bp.route('/canalpro/export/history', methods=['GET'])
@jwt_required()
def canalpro_export_history():
    """
    Retorna o histórico de exportações realizadas.
    Suporta paginação via query params: page, limit.
    """
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))

        from integrations.canalpro_exporter import CanalProExporter

        exporter = CanalProExporter(user.tenant_id, user.id)
        history = exporter.get_export_history(page=page, limit=limit)

        return jsonify(history), 200

    except Exception as e:
        current_app.logger.exception('Error getting export history')
        return jsonify({'message': f'Failed to get history: {str(e)}'}), 500

@integrations_bp.route('/canalpro/setup', methods=['POST'])
@jwt_required()
def canalpro_setup():
    """
    Configura as credenciais do Canal Pro para o usuário.
    Recebe email, password, device_id e opcional otp no body JSON.
    """
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    payload = request.get_json() or {}
    email = payload.get('email')
    password = payload.get('password')
    device_id = payload.get('device_id')
    otp = payload.get('otp')

    if not email or not password or not device_id:
        return jsonify({'message': 'email, password and device_id are required'}), 400

    try:
        from integrations.canalpro_exporter import CanalProExporter

        exporter = CanalProExporter(user.tenant_id, user.id)
        result = exporter.setup_credentials(email, password, device_id, otp)

        if result.get('needs_otp'):
            return jsonify({
                'needs_otp': True,
                'message': result.get('message', 'OTP required')
            }), 202

        return jsonify({
            'message': 'Credentials configured successfully',
            'user_info': result.get('user_info')
        }), 200

    except Exception as e:
        current_app.logger.exception('Error setting up Canal Pro credentials')
        return jsonify({'message': f'Failed to setup credentials: {str(e)}'}), 500

@integrations_bp.route('/canalpro/credentials/status', methods=['GET'])
@jwt_required()
def canalpro_credentials_status():
    """
    Verifica o status das credenciais do Canal Pro.
    """
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    try:
        from integrations.canalpro_exporter import CanalProExporter

        exporter = CanalProExporter(user.tenant_id, user.id)
        status = exporter.check_credentials_status()

        return jsonify(status), 200

    except Exception as e:
        current_app.logger.exception('Error checking credentials status')
        return jsonify({'message': f'Failed to check credentials: {str(e)}'}), 500

@integrations_bp.route('/canalpro/credentials/check', methods=['GET'])
@jwt_required()
def canalpro_credentials_check():
    """
    Verifica se as credenciais estão válidas e fornece instruções se necessário
    """
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    try:
        from integrations.canalpro_exporter import CanalProExporter

        exporter = CanalProExporter(user.tenant_id, user.id)

        # Tentar autenticação
        auth_success = exporter.authenticate()

        if auth_success:
            return jsonify({
                'valid': True,
                'message': 'Credenciais válidas',
                'expires_soon': False
            }), 200
        else:
            # Buscar informações da credencial expirada para mostrar ao usuário
            from models import IntegrationCredentials
            cred = IntegrationCredentials.query.filter_by(
                tenant_id=user.tenant_id,
                provider='gandalf'
            ).first()

            expires_at = cred.expires_at.isoformat() if cred and cred.expires_at else None

            return jsonify({
                'valid': False,
                'message': 'Credenciais expiradas. Reautenticação necessária.',
                'action_required': 'Renovar credenciais manualmente',
                'reason': 'Token expirado e reautenticação automática não é possível por segurança',
                'solution': 'Use /integrations/canalpro/setup com email, senha e device_id',
                'endpoint': '/integrations/canalpro/setup',
                'method': 'POST',
                'required_fields': ['email', 'password', 'device_id'],
                'expires_at': expires_at
            }), 200

    except Exception as e:
        current_app.logger.exception('Error checking credentials')
        return jsonify({
            'valid': False,
            'message': f'Erro ao verificar credenciais: {str(e)}',
            'action_required': 'Configure novas credenciais',
            'endpoint': '/integrations/canalpro/setup'
        }), 500

@integrations_bp.route('/canalpro/credentials/renew', methods=['POST'])
@jwt_required()
def canalpro_credentials_renew():
    """
    Endpoint simplificado para renovar credenciais expiradas.
    Exige que o usuário forneça email e senha novamente.
    """
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    payload = request.get_json() or {}
    email = payload.get('email')
    password = payload.get('password')

    if not email or not password:
        return jsonify({
            'message': 'Email e password são obrigatórios',
            'required_fields': ['email', 'password']
        }), 400

    try:
        from integrations.canalpro_exporter import CanalProExporter

        # Buscar device_id das credenciais existentes
        from models import IntegrationCredentials
        existing_cred = IntegrationCredentials.query.filter_by(
            tenant_id=user.tenant_id,
            provider='gandalf'
        ).first()

        if not existing_cred:
            return jsonify({
                'message': 'Nenhuma credencial existente encontrada. Use /setup para configurar.',
                'action': 'setup_required'
            }), 404

        metadata = existing_cred.metadata_json or {}
        device_id = metadata.get('device_id')

        if not device_id:
            return jsonify({
                'message': 'Device ID não encontrado. Reconfigure as credenciais.',
                'action': 'setup_required'
            }), 400

        # Tentar renovar credenciais
        exporter = CanalProExporter(user.tenant_id, user.id)
        result = exporter.setup_credentials(email, password, device_id)

        if result.get('needs_otp'):
            return jsonify({
                'needs_otp': True,
                'message': result.get('message', 'OTP necessário'),
                'device_id': device_id
            }), 202

        return jsonify({
            'message': 'Credenciais renovadas com sucesso',
            'user_info': result.get('user_info')
        }), 200

    except Exception as e:
        current_app.logger.exception('Error renewing credentials')
        return jsonify({
            'message': f'Erro ao renovar credenciais: {str(e)}'
        }), 500

@integrations_bp.route('/canalpro/bulk_delete', methods=['POST'])
@jwt_required()
def canalpro_bulk_delete():
    """Proxy seguro para exclusão em lote no CanalPro (Gandalf).

    Body esperado: { "listingIds": ["2833974819", "..."] }
    Retorna o JSON com o resultado da API Gandalf ou mensagem de erro/razão.
    """
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    payload = request.get_json() or {}
    listing_ids = payload.get('listingIds') or payload.get('listing_ids') or payload.get('ids')

    if not listing_ids or not isinstance(listing_ids, (list, tuple)):
        return jsonify({'message': 'listingIds (array) is required'}), 400

    try:
        # Obter credenciais de integração para o tenant
        creds = get_valid_integration_headers(user.tenant_id, 'gandalf')
    except Exception as e:
        current_app.logger.exception('Error obtaining integration credentials')
        return jsonify({'message': 'Failed to obtain integration credentials', 'error': str(e)}), 500

    if not creds:
        # Retornamos 200 com payload descrevendo ausência de credenciais para o frontend tratar
        return jsonify({'success': False, 'reason': 'no_credentials', 'message': 'No CanalPro credentials configured for this tenant'}), 200

    try:
        from integrations.gandalf_service import bulk_delete_listing

        current_app.logger.info('Calling bulk_delete_listing for tenant %s listing_ids=%s', user.tenant_id, listing_ids)
        result = bulk_delete_listing([str(i) for i in listing_ids], creds)

        # Normalize response for frontend: include success true/false and the raw Gandalf response
        return jsonify({'success': True, 'result': result}), 200

    except Exception as e:
        current_app.logger.exception('Error calling bulk_delete_listing')
        return jsonify({'success': False, 'message': 'Failed to call CanalPro bulk delete', 'error': str(e)}), 500


@integrations_bp.route('/canalpro/auto-renew', methods=['POST'])
@jwt_required()
def canalpro_auto_renew():
    """
    Tenta renovação automática usando device_id persistente.
    Fallback para notificação manual se OTP for necessário.
    """
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    try:
        # Buscar credenciais existentes
        cred = IntegrationCredentials.query.filter_by(
            tenant_id=user.tenant_id,
            provider='gandalf'
        ).first()
        
        if not cred:
            return jsonify({
                'success': False,
                'message': 'Nenhuma credencial encontrada',
                'action_required': 'setup'
            }), 404
        
        # Extrair device_id dos metadados
        metadata = cred.metadata_json or {}
        device_id = metadata.get('device_id')
        
        if not device_id:
            return jsonify({
                'success': False,
                'message': 'Device ID não encontrado',
                'action_required': 'manual_renewal'
            }), 400
        
        # DESAFIO: Credenciais não armazenadas por segurança
        # Por enquanto, retornamos status informativo
        return jsonify({
            'success': False,
            'message': 'Renovação automática não disponível',
            'reason': 'credentials_not_stored',
            'device_id': device_id,
            'next_steps': {
                'option_1': 'Habilitar armazenamento seguro de credenciais',
                'option_2': 'Usar renovação manual via interface',
                'endpoint_manual': '/integrations/canalpro/credentials/renew'
            },
            'automation_feasible': True,
            'requires_implementation': [
                'Secure credential storage',
                'Celery task for automatic renewal', 
                'Fallback notification system'
            ]
        }), 200
        
    except Exception as e:
        current_app.logger.exception('Error in auto renewal attempt')
        return jsonify({
            'success': False,
            'message': f'Erro na tentativa de renovação automática: {str(e)}'
        }), 500


@integrations_bp.route('/tokens/status', methods=['GET'])
@jwt_required()
def tokens_status():
    """
    Retorna o status de todos os tokens de integração do tenant.
    Usado pela página TokenMonitorPage.
    """
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    try:
        from models import IntegrationCredentials
        from datetime import datetime, timezone
        
        # Buscar todas as credenciais do tenant
        credentials = IntegrationCredentials.query.filter_by(
            tenant_id=user.tenant_id
        ).all()
        
        tokens = []
        total_active = 0
        total_expired = 0
        total_expiring_soon = 0
        
        for cred in credentials:
            now = datetime.now(timezone.utc)
            expires_at = cred.expires_at.replace(tzinfo=timezone.utc) if cred.expires_at else None
            
            # Determinar status
            if not expires_at:
                status = 'unknown'
            elif expires_at < now:
                status = 'expired'
                total_expired += 1
            elif (expires_at - now).total_seconds() < 3600:  # Expira em menos de 1 hora
                status = 'expiring_soon'
                total_expiring_soon += 1
            else:
                status = 'active'
                total_active += 1
            
            # Metadata
            metadata = cred.metadata_json or {}
            
            tokens.append({
                'id': cred.id,
                'provider': cred.provider,
                'user_id': cred.user_id,
                'status': status,
                'expires_at': expires_at.isoformat() if expires_at else None,
                'created_at': cred.created_at.isoformat() if cred.created_at else None,
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
                'expiring_soon': total_expiring_soon
            }
        }), 200
        
    except Exception as e:
        current_app.logger.exception('Error fetching tokens status')
        return jsonify({'message': f'Erro ao buscar status dos tokens: {str(e)}'}), 500


# FUNÇÃO REMOVIDA: canalpro_schedule_renewal
# Sistema automático de renovação implementado via Celery
# Ver: tasks/canalpro_auto_renewal_simple.py e tasks/canalpro_schedule_config.py
#
# @integrations_bp.route('/canalpro/schedule-renewal', methods=['POST'])
# @jwt_required() 
# def canalpro_schedule_renewal():
#     """
#     DEPRECIADA: Função substituída pelo sistema automático permanente.
#     O sistema agora renova automaticamente via Celery a cada 2 horas.
#     """
#     return jsonify({
#         'success': False,
#         'message': 'Função depreciada - Sistema automático ativo',
#         'info': 'Renovação automática a cada 2 horas via Celery'
#     }), 410  # Gone

