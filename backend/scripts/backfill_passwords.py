"""Script para backfill das senhas vazias/nulas e (opcional) exportar senhas temporárias.

Uso:
  - Execute no ambiente virtual do projeto: python backend/scripts/backfill_passwords.py
  - Opcional: python backend/scripts/backfill_passwords.py --export backfilled_passwords.csv

Atenção: o arquivo CSV (se gerado) contém senhas temporárias em texto plano — proteja/exclua após notificar usuários.
"""
import os
import csv
import secrets
import argparse
from werkzeug.security import generate_password_hash

# Carrega app e modelos
from app import create_app
from extensions import db
from models import User


def generate_temp_password(length=16):
    return secrets.token_urlsafe(length)  # URL-safe random string


def backfill(export_file: str | None = None):
    app = create_app()
    count = 0
    rows = []

    # resolve export path early
    export_path = None
    if export_file:
        export_path = os.path.abspath(export_file)
        export_dir = os.path.dirname(export_path)
        if export_dir and not os.path.exists(export_dir):
            os.makedirs(export_dir, exist_ok=True)

    with app.app_context():
        # Seleciona usuários com password NULL ou vazio
        users = User.query.filter((User.password == None) | (User.password == '')).all()
        for user in users:
            temp = generate_temp_password()
            hashed = generate_password_hash(temp)
            user.password = hashed
            count += 1
            if export_path:
                rows.append({'user_id': user.id, 'username': getattr(user, 'username', ''), 'temp_password': temp})

        if count > 0:
            db.session.commit()

    print(f'Backfilled passwords for {count} user(s).')

    if export_path:
        if rows:
            try:
                with open(export_path, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=['user_id', 'username', 'temp_password'])
                    writer.writeheader()
                    writer.writerows(rows)
                print(f'Exported temp passwords to {export_path} (handle securely).')
            except Exception as e:
                print(f'Failed to write CSV to {export_path}: {e}')
        else:
            print(f'No rows to export, CSV not created at {export_path}.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Backfill missing user passwords.')
    parser.add_argument('--export', '-e', dest='export_file', help='Path to CSV to export user_id,username,temp_password')
    args = parser.parse_args()
    backfill(args.export_file)
