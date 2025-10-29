from app import create_app
from extensions import db
from models import IntegrationCredentials
from utils.crypto import encrypt_token
from datetime import datetime, timedelta
from integrations.gandalf_service import GandalfService
import os


def main():
    app = create_app()
    with app.app_context():
        tenant_id = os.environ.get('TENANT_ID') or input('tenant_id: ')

        # Credenciais do CanalPro
        email = os.environ.get('GANDALF_EMAIL') or input('Email do CanalPro: ')
        password = os.environ.get('GANDALF_PASSWORD') or input('Senha do CanalPro: ')
        device_id = os.environ.get('GANDALF_DEVICE_ID', 'cmesm0ax000002a6mtvzsz0ad')

        if not email or not password:
            print('Email e senha são obrigatórios')
            return

        # Usar o serviço Gandalf existente
        service = GandalfService()

        try:
            print('Iniciando login usando GandalfService...')
            result = service.start_login_session(email, password, device_id)

            if 'needs_otp' in result:
                print('✅ Login inicial OK - OTP necessário')
                print(f'Session ID: {result["session_id"]}')

                # Solicitar envio do OTP por email
                print('📧 Solicitando envio do código OTP por email...')
                try:
                    otp_request_result = service.request_otp_email(
                        session_id=result['session_id'],
                        email=email,
                        device_id=device_id
                    )
                    print('✅ Código OTP solicitado com sucesso!')
                    print('📬 Verifique seu email para o código de 6 dígitos.')
                except Exception as otp_err:
                    print(f'⚠️  Aviso: Não foi possível solicitar OTP automaticamente: {otp_err}')
                    print('📬 Você pode tentar solicitar manualmente ou aguardar o email.')

                otp_code = input('Digite o código OTP enviado para seu email: ').strip()

                if not otp_code:
                    print('OTP é obrigatório')
                    return

                print('Validando OTP...')
                final_result = service.validate_login_with_session(
                    result['session_id'], email, device_id, otp_code
                )

                if 'credentials' in final_result:
                    credentials = final_result['credentials']
                    access_token = credentials.get('accessToken')
                    refresh_token = credentials.get('refreshToken')
                    expires_in = credentials.get('expiresIn', 3600)

                    print('✅ Login completo bem-sucedido!')
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
                else:
                    print('❌ Credenciais não encontradas após OTP')
                    print(f'Resultado: {final_result}')

            elif 'credentials' in result:
                print('✅ Login direto sem OTP!')
                credentials = result['credentials']
                access_token = credentials.get('accessToken')
                refresh_token = credentials.get('refreshToken')
                expires_in = credentials.get('expiresIn', 3600)

                # Salvar no banco
                row = IntegrationCredentials.query.filter_by(tenant_id=tenant_id, provider='gandalf').first()
                if not row:
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

            else:
                print('❌ Resposta inesperada do login')
                print(f'Resultado: {result}')

        except Exception as e:
            print(f'Erro durante login: {e}')
            db.session.rollback()


if __name__ == '__main__':
    main()
