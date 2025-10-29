"""
Script para consultar os unitTypes válidos da API Gandalf.
Usa a query unitTypes para listar todos os tipos disponíveis.
"""

import sys
import os

# Adicionar diretório backend ao path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

import requests
import json

def get_jwt_token(username, password, device_id):
    """Obtém token JWT da API local"""
    url = "http://localhost:5000/api/auth/login"
    
    payload = {
        "username": username,
        "password": password,
        "device_id": device_id
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data.get('access_token')
        return None
    except Exception as e:
        print(f"Erro ao obter token: {e}")
        return None

def query_unit_types(token=None):
    """Consulta unitTypes válidos da API Gandalf"""
    
    if not token:
        print("🔐 Obtendo token JWT...")
        token = get_jwt_token('consultor.eliezer', '@Epbaa090384!@#$', 'c3f8e9d5-7a4c-4e7a-8a3f-5d6c8e9a7c5f')
        
        if not token:
            print("❌ Erro ao obter token")
            return None
        
        print(f"✅ Token obtido: {token[:50]}...")
    else:
        print(f"✅ Usando token fornecido: {token[:50]}...")
    
    # Query GraphQL para listar unitTypes
    query = """
    query {
      unitTypes {
        items {
          name
          singular
          plural
          unitSubTypes
        }
      }
    }
    """
    
    # Endpoint GraphQL do Gandalf
    url = "https://gandalf-api.grupozap.com/graphql"
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }
    
    payload = {
        'query': query
    }
    
    print(f"\n📡 Enviando query para {url}...")
    print(f"Query: {query.strip()}")
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        print(f"\n📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Salvar resposta completa
            with open('unit_types_response.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"✅ Resposta salva em: unit_types_response.json")
            
            # Exibir unitTypes encontrados
            if 'data' in data and 'unitTypes' in data['data']:
                unit_types = data['data']['unitTypes']['items']
                
                print(f"\n🎯 UNIT TYPES DISPONÍVEIS ({len(unit_types)}):")
                print("=" * 80)
                
                for ut in unit_types:
                    print(f"\n📌 Name (protobuf): {ut['name']}")
                    print(f"   Singular: {ut['singular']}")
                    print(f"   Plural: {ut['plural']}")
                    if ut.get('unitSubTypes'):
                        print(f"   SubTypes: {', '.join(ut['unitSubTypes'])}")
                
                # Criar lista de nomes para mapeamento
                names = [ut['name'] for ut in unit_types]
                print(f"\n📋 LISTA DE NOMES (para usar no código):")
                print("=" * 80)
                print(json.dumps(names, indent=2))
                
                return unit_types
            else:
                print(f"❌ Formato de resposta inesperado:")
                print(json.dumps(data, indent=2))
                return None
        else:
            print(f"❌ Erro HTTP {response.status_code}")
            print(f"Resposta: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return None

if __name__ == '__main__':
    print("=" * 80)
    print("🔍 CONSULTANDO UNIT TYPES DA API GANDALF")
    print("=" * 80)
    
    # Token fornecido pelo usuário
    gandalf_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjA1Nzk5NzcsInVzZXJfbmFtZSI6ImVsaWV6ZXJwYXNzb3NtZHRAZ21haWwuY29tIiwiYXV0aG9yaXRpZXMiOlsiUk9MRV9TSVRFIiwiU0lURSJdLCJqdGkiOiI1M2VhMzhlOS1mY2ViLTRiMDUtYjVhMi0zNWM5OTRmMDEwNWMiLCJjbGllbnRfaWQiOiJjYW5hbHBybyIsInNjb3BlIjpbInJlYWQiXX0.DQfdU9g5xgeNCHxbNNZbI22tCU1bNunYd53NI1uYo_M"
    
    result = query_unit_types(token=gandalf_token)
    
    if result:
        print(f"\n✅ Consulta concluída! {len(result)} unitTypes encontrados.")
    else:
        print("\n❌ Falha na consulta.")
