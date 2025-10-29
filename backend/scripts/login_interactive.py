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

        # Credenciais do CanalPro
        email = os.environ.get('GANDALF_EMAIL') or input('Email do CanalPro: ')
        password = os.environ.get('GANDALF_PASSWORD') or input('Senha do CanalPro: ')
        device_id = os.environ.get('GANDALF_DEVICE_ID', 'device-12345')

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

        session = requests.Session()

        try:
            resp = session.post(gandalf_url, json=login_data, timeout=30)
            print(f'Status do login: {resp.status_code}')

            if resp.status_code != 200:
                print(f'Erro no login: {resp.text}')
                return

            result = resp.json()
            print('Resposta do login recebida')

            # Verificar se precisa de OTP
            if 'errors' in result:
                print('Login requer OTP. Verifique seu email/SMS para o código de 6 dígitos.')
                otp_code = input('Digite o código OTP: ').strip()

                if not otp_code:
                    print('OTP é obrigatório')
                    return

                print('Tentando validação com OTP...')
                otp_query = """
                mutation loginWithOtpValidate($email: String!, $isSafeDevice: Boolean!, $deviceId: String!) {
                  loginWithOtpValidate(email: $email, isSafeDevice: $isSafeDevice, deviceId: $deviceId) {
                    credentials {
                      accessToken
                      refreshToken
                      expiresIn
                      origin
                    }
                    isSafeDevice
                  }
                }
                """

                otp_data = {
                    'operationName': 'loginWithOtpValidate',
                    'variables': {
                        'email': email,
                        'isSafeDevice': True,
                        'deviceId': device_id
                    },
                    'query': otp_query.strip()
                }

                # Adicionar OTP ao header
                headers = {'x-otp-code': otp_code}

                resp2 = session.post(gandalf_url, json=otp_data, headers=headers, timeout=30)
                print(f'Status da validação OTP: {resp2.status_code}')

                if resp2.status_code == 200:
                    result2 = resp2.json()
                    if 'data' in result2 and 'loginWithOtpValidate' in result2['data']:
                        lw_data = result2['data']['loginWithOtpValidate']
                        if 'credentials' in lw_data:
                            credentials = lw_data['credentials']
                            print('✅ OTP validado com sucesso!')
                        else:
                            print('Credenciais não encontradas na resposta OTP')
                            print(f'Resposta: {lw_data}')
                            return
                    else:
                        print('Resposta OTP inválida')
                        print(f'Resposta completa: {result2}')
                        return
                else:
                    print(f'Erro na validação OTP: {resp2.text}')
                    return
            else:
                # Login direto sem OTP
                user_data = result.get('data', {}).get('user', {})
                credentials = user_data.get('credentials', {})
                print('✅ Login direto sem OTP!')

            # Extrair tokens
            access_token = credentials.get('accessToken')
            refresh_token = credentials.get('refreshToken')
            expires_in = credentials.get('expiresIn', 3600)

            if not access_token:
                print('Access token não encontrado na resposta')
                print(f'Credenciais recebidas: {credentials}')
                return

            print('✅ Tokens obtidos!')
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
            print('✅ Tokens salvos no banco com sucesso!')

        except Exception as e:
            print(f'Erro durante login: {e}')
            db.session.rollback()


if __name__ == '__main__':
    main()
