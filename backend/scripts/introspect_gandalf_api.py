"""
Script para obter o schema completo da API Gandalf/CanalPro via introspecção GraphQL
"""
import os
import requests
import json
import sys

# Obter token válido
BASE_URL = "http://localhost:5000"
USERNAME = "consultor.eliezer"
PASSWORD = os.environ.get("CRM_DEFAULT_PASSWORD", "ChangeMe123!")

def get_local_token():
    """Obter token JWT do sistema local"""
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"username": USERNAME, "password": PASSWORD},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]

def get_gandalf_token():
    """Obter token CanalPro via integration_tokens"""
    import sys
    import os
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    
    from app import create_app
    from utils.integration_tokens import get_valid_integration_headers
    
    app = create_app()
    with app.app_context():
        # Simular contexto com tenant_id
        from flask import g
        g.tenant_id = 1
        
        creds = get_valid_integration_headers(1, 'gandalf')
        return creds.get('token')

def introspect_schema(token):
    """Query de introspecção completa"""
    
    # Query padrão de introspecção do GraphQL
    introspection_query = """
    query IntrospectionQuery {
      __schema {
        queryType { name }
        mutationType { name }
        types {
          ...FullType
        }
      }
    }
    
    fragment FullType on __Type {
      kind
      name
      description
      fields(includeDeprecated: true) {
        name
        description
        args {
          ...InputValue
        }
        type {
          ...TypeRef
        }
      }
      inputFields {
        ...InputValue
      }
      enumValues(includeDeprecated: true) {
        name
        description
      }
    }
    
    fragment InputValue on __InputValue {
      name
      description
      type { ...TypeRef }
      defaultValue
    }
    
    fragment TypeRef on __Type {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
          }
        }
      }
    }
    """
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(
        "https://gandalf-api.grupozap.com",
        headers=headers,
        json={"query": introspection_query},
        timeout=30
    )
    
    return response.json()

def find_unit_types_enum(schema):
    """Procurar enum de UnitTypes no schema"""
    types = schema.get("data", {}).get("__schema", {}).get("types", [])
    
    for type_def in types:
        if type_def.get("name") in ["UnitType", "UnitTypes", "PropertyUnitType"]:
            print(f"\n🎯 Encontrado: {type_def['name']}")
            print(f"Tipo: {type_def['kind']}")
            print(f"Descrição: {type_def.get('description', 'N/A')}")
            
            if type_def.get("enumValues"):
                print("\n✅ Valores aceitos:")
                for enum_val in type_def["enumValues"]:
                    print(f"   - {enum_val['name']}: {enum_val.get('description', '')}")
            
            return type_def
    
    return None

def find_create_listing_mutation(schema):
    """Procurar mutation createListing"""
    types = schema.get("data", {}).get("__schema", {}).get("types", [])
    
    for type_def in types:
        if type_def.get("name") == "Mutation":
            if type_def.get("fields"):
                for field in type_def["fields"]:
                    if field["name"] == "createListing":
                        print(f"\n🎯 Mutation: createListing")
                        print(f"Descrição: {field.get('description', 'N/A')}")
                        print(f"\n📋 Argumentos:")
                        for arg in field.get("args", []):
                            print(f"   - {arg['name']}: {arg['type']}")
                            print(f"     Descrição: {arg.get('description', 'N/A')}")
                        
                        return field
    
    return None

def main():
    print("="*80)
    print("🔍 INTROSPECÇÃO GRAPHQL - API GANDALF/CANALPRO")
    print("="*80)
    
    # 1. Obter token Gandalf
    print("\n1️⃣ Obtendo token CanalPro...")
    try:
        token = get_gandalf_token()
        if not token:
            print("❌ Falha ao obter token")
            return 1
        print(f"✅ Token obtido: {token[:50]}...")
    except Exception as e:
        print(f"❌ Erro: {e}")
        return 1
    
    # 2. Fazer introspecção
    print("\n2️⃣ Fazendo introspecção do schema...")
    try:
        schema = introspect_schema(token)
        
        # Salvar schema completo
        with open("gandalf_schema_full.json", "w", encoding="utf-8") as f:
            json.dump(schema, f, indent=2, ensure_ascii=False)
        print("✅ Schema completo salvo em: gandalf_schema_full.json")
        
    except Exception as e:
        print(f"❌ Erro na introspecção: {e}")
        return 1
    
    # 3. Procurar UnitTypes
    print("\n3️⃣ Procurando enum de UnitTypes...")
    unit_types = find_unit_types_enum(schema)
    if not unit_types:
        print("⚠️ Enum UnitTypes não encontrado diretamente")
    
    # 4. Procurar createListing
    print("\n4️⃣ Analisando mutation createListing...")
    create_listing = find_create_listing_mutation(schema)
    if not create_listing:
        print("⚠️ Mutation createListing não encontrada")
    
    print("\n" + "="*80)
    print("✅ Introspecção concluída!")
    print("📁 Analise o arquivo gandalf_schema_full.json para mais detalhes")
    print("="*80)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
