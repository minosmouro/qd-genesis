from app import create_app
from extensions import db
from models import IntegrationCredentials
from utils.crypto import decrypt_token, encrypt_token
from utils.integration_tokens import _post_token_refresh
from datetime import datetime, timedelta
import os


def main():
    app = create_app()
    with app.app_context():
        tenant_id = os.environ.get('TENANT_ID') or input('tenant_id: ')
        row = IntegrationCredentials.query.filter_by(tenant_id=tenant_id, provider='gandalf').first()

        if not row:
            print(f'IntegrationCredentials não encontrada para tenant {tenant_id}')
            return

        if not getattr(row, 'refresh_token_encrypted', None):
            print('Não há refresh token armazenado')
            return

        try:
            refresh_token = decrypt_token(row.refresh_token_encrypted)
            print(f'Refresh token descriptografado: {refresh_token[-10:]}...')
        except Exception as e:
            print(f'Falha ao descriptografar refresh token: {e}')
            return

        meta = row.metadata_json or {}
        print('Tentando refresh...')

        resp = _post_token_refresh(refresh_token, meta)

        if resp and 'accessToken' in resp:
            access = resp['accessToken']
            new_refresh = resp.get('refreshToken')
            expires_in = resp.get('expiresIn', 3600)

            print(f'✅ Refresh bem-sucedido!')
            print(f'Novo access token: {access[-10:]}...')
            print(f'Expires in: {expires_in} segundos')

            # Salvar novos tokens
            try:
                row.token_encrypted = encrypt_token(access)
                if new_refresh:
                    row.refresh_token_encrypted = encrypt_token(new_refresh)
                row.expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in))
                row.last_validated_at = datetime.utcnow()
                row.last_validated_ok = True
                db.session.commit()
                print('✅ Tokens salvos com sucesso!')
            except Exception as e:
                db.session.rollback()
                print(f'❌ Falha ao salvar tokens: {e}')
        else:
            print('❌ Refresh falhou - resposta inválida')
            print(f'Resposta: {resp}')


if __name__ == '__main__':
    main()
