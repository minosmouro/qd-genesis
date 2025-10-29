from app import create_app
from extensions import db
from models import IntegrationCredentials
from utils.crypto import encrypt_token
from datetime import datetime, timedelta
import requests
import os


def main():
    app = create_app()
    with app.app_context():
        tenant_id = os.environ.get('TENANT_ID') or input('tenant_id: ')

        # Credenciais do CanalPro (você precisa fornecer)
        email = os.environ.get('GANDALF_EMAIL') or input('Email do CanalPro: ')
        password = os.environ.get('GANDALF_PASSWORD') or input('Senha do CanalPro: ')
        device_id = os.environ.get('GANDALF_DEVICE_ID', 'device-12345')  # pode ser fixo

        if not email or not password:
            print('Email e senha são obrigatórios')
            return

        # URL do Gandalf
        gandalf_url = 'https://gandalf-api.grupozap.com/'

        # Step 1: Login inicial
        print('Fazendo login inicial...')
        login_query = """
        query login($email: String!, $password: String!, $deviceId: String!) {
          user(username: $email, password: $password, deviceId: $deviceId) {
            uuid
            credentials {
              accessToken
              refreshToken
              expiresIn
              origin
            }
          }
        }
        """

        login_data = {
            'operationName': 'login',
            'variables': {
                'email': email,
                'password': password,
                'deviceId': device_id
            },
            'query': login_query.strip()
        }

        try:
            resp = requests.post(gandalf_url, json=login_data, timeout=30)
            print(f'Status do login: {resp.status_code}')

            if resp.status_code != 200:
                print(f'Erro no login: {resp.text}')
                return

            result = resp.json()
            print('Resposta do login recebida')

            # Verificar se precisa de OTP
            if 'errors' in result:
                print('Login requer OTP ou falhou:')
                for error in result['errors']:
                    print(f'  {error.get("message", "Erro desconhecido")}')
                return

            # Extrair tokens
            user_data = result.get('data', {}).get('user', {})
            credentials = user_data.get('credentials', {})

            access_token = credentials.get('accessToken')
            refresh_token = credentials.get('refreshToken')
            expires_in = credentials.get('expiresIn', 3600)

            if not access_token:
                print('Access token não encontrado na resposta')
                return

            print('✅ Login bem-sucedido!')
            print(f'Access token: {access_token[-10:]}...')
            print(f'Refresh token: {refresh_token[-10:] if refresh_token else "NÃO DISPONÍVEL"}...')

            # Salvar no banco
            row = IntegrationCredentials.query.filter_by(tenant_id=tenant_id, provider='gandalf').first()
            if not row:
                print('Criando nova credencial de integração...')
                row = IntegrationCredentials(
                    tenant_id=tenant_id,
                    provider='gandalf'
                )
                db.session.add(row)

            row.token_encrypted = encrypt_token(access_token)
            if refresh_token:
                row.refresh_token_encrypted = encrypt_token(refresh_token)
            row.expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in))
            row.last_validated_at = datetime.utcnow()
            row.last_validated_ok = True

            db.session.commit()
            print('✅ Tokens salvos no banco!')

        except Exception as e:
            print(f'Erro durante login: {e}')
            db.session.rollback()


if __name__ == '__main__':
    main()
