#!/usr/bin/env python3
"""
Busca IntegrationCredentials.token_encrypted por correspondência exata ou sufixo.
Uso:
  python backend/scripts/check_token.py <TOKEN_OR_SUFFIX>
Retorna id, tenant_id, provider e um preview do token (não exibe o token inteiro).
"""
import os
import sys
import psycopg2

if len(sys.argv) < 2:
    print("Uso: python backend/scripts/check_token.py <TOKEN_OU_ULTIMOS>\nEx: python backend/scripts/check_token.py 'N6Ojv9ibDwJA'")
    sys.exit(1)

q = sys.argv[1]

# Ajuste a DATABASE_URL conforme seu ambiente; padrão usado para dev local/docker-compose
db_url = os.environ.get('DATABASE_URL') or 'postgresql://postgres:postgres@localhost:5432/gandalf'

try:
    conn = psycopg2.connect(db_url)
except Exception as e:
    print('Erro conectando ao banco:', e)
    sys.exit(1)

cur = conn.cursor()

# Tentativa de correspondência exata
cur.execute("SELECT id, tenant_id, provider, token_encrypted FROM integration_credentials WHERE token_encrypted = %s", (q,))
rows = cur.fetchall()

# Se não encontrou, tenta sufixo (LIKE)
if not rows:
    cur.execute("SELECT id, tenant_id, provider, token_encrypted FROM integration_credentials WHERE token_encrypted LIKE %s", ('%' + q,))
    rows = cur.fetchall()

if rows:
    for r in rows:
        token = r[3] or ''
        preview = None
        if token:
            if len(token) <= 20:
                preview = token[:4] + '...' + token[-4:]
            else:
                preview = token[:8] + '...' + token[-8:]
        print(f"Found: id={r[0]} tenant_id={r[1]} provider={r[2]} token_preview={preview}")
else:
    print('Nenhuma credencial encontrada correspondente ao token/trecho fornecido.')

cur.close()
conn.close()
