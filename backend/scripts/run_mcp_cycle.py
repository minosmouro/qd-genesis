"""Login, create unique property, call MCP upsert and MCP search (Flask test client).

This script generates a timestamped external_id to avoid conflicts.
"""
from app import create_app
import json
import time

app = create_app()
with app.test_client() as client:
    # Login
    resp = client.post('/auth/login', json={'username': 'admin', 'password': 'secret123'})
    print('LOGIN status:', resp.status_code)
    if resp.status_code != 200:
        print('LOGIN body:', resp.get_data(as_text=True))
        raise SystemExit('Login failed')

    token = resp.get_json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}

    # Create property with unique external_id
    ext = f"ext-{int(time.time())}"
    prop = {'title': 'Casa MCP Test', 'external_id': ext, 'description': 'Teste MCP full cycle'}
    resp2 = client.post('/properties/', json=prop, headers=headers)
    print('CREATE PROPERTY status:', resp2.status_code)
    try:
        print('CREATE PROPERTY body:', resp2.get_json())
    except Exception:
        print('CREATE PROPERTY raw:', resp2.get_data(as_text=True))

    if resp2.status_code not in (200, 201):
        raise SystemExit('Property create failed, aborting')

    prop_id = resp2.get_json().get('property_id')

    # MCP upsert
    upsert_payload = {'id': str(prop_id), 'text': prop['description'], 'metadata': {'external_id': prop['external_id']}}
    resp_up = client.post('/mcp/upsert', json=upsert_payload, headers=headers)
    print('MCP UPSERT status:', resp_up.status_code)
    try:
        print('MCP UPSERT body:', json.dumps(resp_up.get_json(), indent=2, ensure_ascii=False))
    except Exception:
        print('MCP UPSERT raw:', resp_up.get_data(as_text=True))

    # MCP search
    search_payload = {'query': 'Teste MCP', 'top': 5}
    resp_s = client.post('/mcp/search', json=search_payload, headers=headers)
    print('MCP SEARCH status:', resp_s.status_code)
    try:
        print('MCP SEARCH body:', json.dumps(resp_s.get_json(), indent=2, ensure_ascii=False))
    except Exception:
        print('MCP SEARCH raw:', resp_s.get_data(as_text=True))
