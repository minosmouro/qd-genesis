"""
Script de Introspecção Completa da API GraphQL Gandalf (Canal Pro)

Este script extrai o schema completo da API usando introspecção GraphQL
e gera documentação detalhada de todas as operações disponíveis.
"""

import sys
import os
import json
from datetime import datetime

# Ajustar path para importar módulos do backend
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, backend_dir)

from app import create_app
import requests

app = create_app()

# Query de introspecção completa do GraphQL
INTROSPECTION_QUERY = """
query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      ...FullType
    }
    directives {
      name
      description
      locations
      args {
        ...InputValue
      }
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
    isDeprecated
    deprecationReason
  }
  inputFields {
    ...InputValue
  }
  interfaces {
    ...TypeRef
  }
  enumValues(includeDeprecated: true) {
    name
    description
    isDeprecated
    deprecationReason
  }
  possibleTypes {
    ...TypeRef
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
        ofType {
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
      }
    }
  }
}
"""


def get_gandalf_token():
    """Obter token válido do Gandalf"""
    with app.app_context():
        from utils.integration_tokens import get_valid_integration_headers
        
        try:
            creds = get_valid_integration_headers(1, 'gandalf')
            token = creds.get('authorization', '').replace('Bearer ', '')
            return token
        except Exception as e:
            print(f"❌ Erro ao obter token: {e}")
            return None


def introspect_api(token):
    """Fazer introspecção completa da API"""
    url = "https://gandalf-api.grupozap.com/"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": INTROSPECTION_QUERY
    }
    
    print("🔍 Fazendo introspecção da API Gandalf...")
    print(f"URL: {url}")
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            if 'errors' in data:
                print(f"❌ Erros na resposta:")
                for error in data['errors']:
                    print(f"   - {error.get('message')}")
                return None
            
            print("✅ Introspecção bem-sucedida!")
            return data
        else:
            print(f"❌ Erro HTTP {response.status_code}")
            print(f"Resposta: {response.text[:500]}")
            return None
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return None


def analyze_schema(schema_data):
    """Analisar schema e extrair informações importantes"""
    if not schema_data or 'data' not in schema_data:
        return None
    
    schema = schema_data['data']['__schema']
    
    analysis = {
        'queries': [],
        'mutations': [],
        'types': [],
        'important_operations': {
            'listing_operations': [],
            'user_operations': [],
            'media_operations': [],
            'other_operations': []
        }
    }
    
    # Encontrar tipo Query
    query_type_name = schema.get('queryType', {}).get('name')
    mutation_type_name = schema.get('mutationType', {}).get('name')
    
    # Processar todos os tipos
    for type_def in schema.get('types', []):
        type_name = type_def.get('name', '')
        
        # Ignorar tipos internos do GraphQL
        if type_name.startswith('__'):
            continue
        
        # Queries
        if type_name == query_type_name:
            for field in type_def.get('fields', []):
                query_info = {
                    'name': field.get('name'),
                    'description': field.get('description'),
                    'args': [arg.get('name') for arg in field.get('args', [])],
                    'return_type': get_type_name(field.get('type'))
                }
                analysis['queries'].append(query_info)
                
                # Categorizar operações importantes
                name_lower = field.get('name', '').lower()
                if 'listing' in name_lower or 'property' in name_lower or 'imovel' in name_lower:
                    analysis['important_operations']['listing_operations'].append(query_info)
        
        # Mutations
        elif type_name == mutation_type_name:
            for field in type_def.get('fields', []):
                mutation_info = {
                    'name': field.get('name'),
                    'description': field.get('description'),
                    'args': [arg.get('name') for arg in field.get('args', [])],
                    'return_type': get_type_name(field.get('type'))
                }
                analysis['mutations'].append(mutation_info)
                
                # Categorizar operações importantes
                name_lower = field.get('name', '').lower()
                if 'listing' in name_lower or 'property' in name_lower or 'imovel' in name_lower:
                    analysis['important_operations']['listing_operations'].append(mutation_info)
                elif 'user' in name_lower or 'account' in name_lower:
                    analysis['important_operations']['user_operations'].append(mutation_info)
                elif 'media' in name_lower or 'image' in name_lower or 'photo' in name_lower:
                    analysis['important_operations']['media_operations'].append(mutation_info)
        
        # Outros tipos importantes
        elif type_def.get('kind') == 'OBJECT':
            analysis['types'].append({
                'name': type_name,
                'description': type_def.get('description'),
                'fields': [f.get('name') for f in type_def.get('fields', [])]
            })
    
    return analysis


def get_type_name(type_ref):
    """Extrair nome do tipo de forma recursiva"""
    if not type_ref:
        return 'Unknown'
    
    if type_ref.get('name'):
        return type_ref['name']
    
    if type_ref.get('ofType'):
        return get_type_name(type_ref['ofType'])
    
    return 'Unknown'


def generate_markdown_documentation(schema_data, analysis):
    """Gerar documentação em Markdown"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    doc = []
    doc.append("# 📚 DOCUMENTAÇÃO COMPLETA DA API GANDALF (CANAL PRO)")
    doc.append(f"\n**Gerado em:** {timestamp}")
    doc.append(f"\n**URL:** https://gandalf-api.grupozap.com/")
    doc.append("\n" + "="*80)
    
    # Resumo
    doc.append("\n## 📊 RESUMO")
    doc.append(f"\n- **Total de Queries:** {len(analysis['queries'])}")
    doc.append(f"- **Total de Mutations:** {len(analysis['mutations'])}")
    doc.append(f"- **Total de Types:** {len(analysis['types'])}")
    
    # Operações de Listing (MAIS IMPORTANTE)
    doc.append("\n" + "="*80)
    doc.append("\n## 🏠 OPERAÇÕES DE IMÓVEIS (LISTING)")
    doc.append("\n### Queries (Consultas)")
    
    for op in analysis['important_operations']['listing_operations']:
        if op in analysis['queries']:
            doc.append(f"\n#### `{op['name']}`")
            if op['description']:
                doc.append(f"**Descrição:** {op['description']}")
            doc.append(f"**Retorna:** `{op['return_type']}`")
            if op['args']:
                doc.append(f"**Parâmetros:** {', '.join(op['args'])}")
    
    doc.append("\n### Mutations (Modificações)")
    
    for op in analysis['important_operations']['listing_operations']:
        if op in analysis['mutations']:
            doc.append(f"\n#### `{op['name']}`")
            if op['description']:
                doc.append(f"**Descrição:** {op['description']}")
            doc.append(f"**Retorna:** `{op['return_type']}`")
            if op['args']:
                doc.append(f"**Parâmetros:** {', '.join(op['args'])}")
    
    # Todas as Queries
    doc.append("\n" + "="*80)
    doc.append("\n## 🔍 TODAS AS QUERIES")
    
    for query in sorted(analysis['queries'], key=lambda x: x['name']):
        doc.append(f"\n### `{query['name']}`")
        if query['description']:
            doc.append(f"**Descrição:** {query['description']}")
        doc.append(f"**Retorna:** `{query['return_type']}`")
        if query['args']:
            doc.append(f"**Parâmetros:** {', '.join(query['args'])}")
    
    # Todas as Mutations
    doc.append("\n" + "="*80)
    doc.append("\n## ✏️ TODAS AS MUTATIONS")
    
    for mutation in sorted(analysis['mutations'], key=lambda x: x['name']):
        doc.append(f"\n### `{mutation['name']}`")
        if mutation['description']:
            doc.append(f"**Descrição:** {mutation['description']}")
        doc.append(f"**Retorna:** `{mutation['return_type']}`")
        if mutation['args']:
            doc.append(f"**Parâmetros:** {', '.join(mutation['args'])}")
    
    # Tipos importantes
    doc.append("\n" + "="*80)
    doc.append("\n## 📦 TIPOS DE DADOS IMPORTANTES")
    
    important_types = [t for t in analysis['types'] if 'listing' in t['name'].lower() or 'property' in t['name'].lower()]
    
    for type_def in sorted(important_types, key=lambda x: x['name']):
        doc.append(f"\n### `{type_def['name']}`")
        if type_def['description']:
            doc.append(f"**Descrição:** {type_def['description']}")
        if type_def['fields']:
            doc.append(f"**Campos:** {', '.join(type_def['fields'][:20])}")
            if len(type_def['fields']) > 20:
                doc.append(f"... e mais {len(type_def['fields']) - 20} campos")
    
    return '\n'.join(doc)


def main():
    print("="*80)
    print("🔍 INTROSPECÇÃO DA API GANDALF (CANAL PRO)")
    print("="*80)
    
    # 1. Obter token
    print("\n1️⃣ Obtendo token de autenticação...")
    token = get_gandalf_token()
    
    if not token:
        print("❌ Não foi possível obter token. Abortando.")
        return
    
    print(f"✅ Token obtido: {token[:20]}...")
    
    # 2. Fazer introspecção
    print("\n2️⃣ Fazendo introspecção da API...")
    schema_data = introspect_api(token)
    
    if not schema_data:
        print("❌ Falha na introspecção. Abortando.")
        return
    
    # 3. Salvar schema completo
    print("\n3️⃣ Salvando schema completo...")
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    schema_filename = f'gandalf_schema_{timestamp}.json'
    
    with open(schema_filename, 'w', encoding='utf-8') as f:
        json.dump(schema_data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Schema salvo em: {schema_filename}")
    
    # 4. Analisar schema
    print("\n4️⃣ Analisando schema...")
    analysis = analyze_schema(schema_data)
    
    if not analysis:
        print("❌ Falha na análise. Abortando.")
        return
    
    print(f"✅ Encontradas:")
    print(f"   - {len(analysis['queries'])} queries")
    print(f"   - {len(analysis['mutations'])} mutations")
    print(f"   - {len(analysis['types'])} tipos")
    print(f"   - {len(analysis['important_operations']['listing_operations'])} operações de imóveis")
    
    # 5. Gerar documentação
    print("\n5️⃣ Gerando documentação...")
    doc = generate_markdown_documentation(schema_data, analysis)
    
    doc_filename = f'GANDALF_API_DOCUMENTATION_{timestamp}.md'
    with open(doc_filename, 'w', encoding='utf-8') as f:
        f.write(doc)
    
    print(f"✅ Documentação salva em: {doc_filename}")
    
    # 6. Resumo
    print("\n" + "="*80)
    print("✅ INTROSPECÇÃO CONCLUÍDA COM SUCESSO!")
    print("="*80)
    print(f"\n📄 Arquivos gerados:")
    print(f"   1. {schema_filename} (Schema JSON completo)")
    print(f"   2. {doc_filename} (Documentação Markdown)")
    print(f"\n🎯 Próximos passos:")
    print(f"   1. Revisar documentação gerada")
    print(f"   2. Identificar operações de criar/atualizar/deletar imóveis")
    print(f"   3. Mapear campos remote_id e external_id")
    print(f"   4. Implementar exportação padronizada")
    print("\n" + "="*80)


if __name__ == '__main__':
    main()
