"""
Análise Exaustiva de Funcionalidades da API Gandalf

Este script analisa o schema completo e identifica todas as funcionalidades
que podemos integrar no Quadradois para aproveitar 100% da API.
"""

import json
import re
from datetime import datetime

# Carregar schema
with open('gandalf_schema_20251013_113915.json', 'r', encoding='utf-8') as f:
    schema_data = json.load(f)

schema = schema_data['data']['__schema']

# Categorias de funcionalidades
categorias = {
    'leads': {
        'keywords': ['lead', 'contact', 'inquiry', 'interesse'],
        'queries': [],
        'mutations': [],
        'descricao': '📊 Gestão de Leads e Contatos'
    },
    'analytics': {
        'keywords': ['view', 'analytics', 'statistics', 'metrics', 'dashboard', 'summary', 'report'],
        'queries': [],
        'mutations': [],
        'descricao': '📈 Analytics e Estatísticas'
    },
    'media': {
        'keywords': ['image', 'photo', 'video', 'media', 'upload'],
        'queries': [],
        'mutations': [],
        'descricao': '🖼️ Gestão de Mídia (Fotos/Vídeos)'
    },
    'listing_management': {
        'keywords': ['listing', 'property', 'imovel'],
        'queries': [],
        'mutations': [],
        'descricao': '🏠 Gestão de Imóveis'
    },
    'portals': {
        'keywords': ['portal', 'zap', 'viva', 'olx', 'feed', 'integration'],
        'queries': [],
        'mutations': [],
        'descricao': '🌐 Integração com Portais'
    },
    'highlight': {
        'keywords': ['highlight', 'destaque', 'premium', 'stamp', 'priority'],
        'queries': [],
        'mutations': [],
        'descricao': '⭐ Destaques e Priorização'
    },
    'schedule': {
        'keywords': ['schedule', 'agenda', 'appointment', 'visita'],
        'queries': [],
        'mutations': [],
        'descricao': '📅 Agendamentos e Visitas'
    },
    'user_account': {
        'keywords': ['user', 'account', 'advertiser', 'profile'],
        'queries': [],
        'mutations': [],
        'descricao': '👤 Gestão de Usuários e Contas'
    },
    'warranty': {
        'keywords': ['warranty', 'garantia', 'insurance'],
        'queries': [],
        'mutations': [],
        'descricao': '🛡️ Garantias e Seguros'
    },
    'financial': {
        'keywords': ['payment', 'billing', 'invoice', 'plan', 'subscription'],
        'queries': [],
        'mutations': [],
        'descricao': '💰 Financeiro e Pagamentos'
    },
    'other': {
        'keywords': [],
        'queries': [],
        'mutations': [],
        'descricao': '🔧 Outras Funcionalidades'
    }
}

def categorizar_operacao(nome, descricao=''):
    """Categorizar operação baseado em keywords"""
    nome_lower = nome.lower()
    desc_lower = (descricao or '').lower()
    texto = f"{nome_lower} {desc_lower}"
    
    for categoria, info in categorias.items():
        if categoria == 'other':
            continue
        
        for keyword in info['keywords']:
            if keyword in texto:
                return categoria
    
    return 'other'

# Processar tipos
query_type_name = schema.get('queryType', {}).get('name')
mutation_type_name = schema.get('mutationType', {}).get('name')

for type_def in schema.get('types', []):
    type_name = type_def.get('name', '')
    
    # Queries
    if type_name == query_type_name:
        for field in type_def.get('fields', []):
            nome = field.get('name')
            desc = field.get('description', '')
            categoria = categorizar_operacao(nome, desc)
            
            categorias[categoria]['queries'].append({
                'nome': nome,
                'descricao': desc,
                'args': [arg.get('name') for arg in field.get('args', [])]
            })
    
    # Mutations
    elif type_name == mutation_type_name:
        for field in type_def.get('fields', []):
            nome = field.get('name')
            desc = field.get('description', '')
            categoria = categorizar_operacao(nome, desc)
            
            categorias[categoria]['mutations'].append({
                'nome': nome,
                'descricao': desc,
                'args': [arg.get('name') for arg in field.get('args', [])]
            })

# Gerar relatório
output = []
output.append("="*80)
output.append("🚀 ANÁLISE EXAUSTIVA: FUNCIONALIDADES DA API GANDALF")
output.append("="*80)
output.append(f"\nGerado em: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

output.append("\n" + "="*80)
output.append("📊 RESUMO POR CATEGORIA")
output.append("="*80)

for cat_id, cat_info in categorias.items():
    total = len(cat_info['queries']) + len(cat_info['mutations'])
    if total > 0:
        output.append(f"\n{cat_info['descricao']}")
        output.append(f"   Queries: {len(cat_info['queries'])}")
        output.append(f"   Mutations: {len(cat_info['mutations'])}")
        output.append(f"   Total: {total}")

# Detalhamento por categoria
for cat_id, cat_info in categorias.items():
    total = len(cat_info['queries']) + len(cat_info['mutations'])
    if total == 0:
        continue
    
    output.append("\n" + "="*80)
    output.append(f"{cat_info['descricao']}")
    output.append("="*80)
    
    if cat_info['queries']:
        output.append(f"\n📖 QUERIES ({len(cat_info['queries'])})")
        output.append("-" * 80)
        for q in cat_info['queries'][:20]:  # Primeiras 20
            output.append(f"\n✅ {q['nome']}")
            if q['descricao']:
                output.append(f"   📝 {q['descricao']}")
            if q['args']:
                output.append(f"   📋 Parâmetros: {', '.join(q['args'][:5])}")
        
        if len(cat_info['queries']) > 20:
            output.append(f"\n... e mais {len(cat_info['queries']) - 20} queries")
    
    if cat_info['mutations']:
        output.append(f"\n✏️ MUTATIONS ({len(cat_info['mutations'])})")
        output.append("-" * 80)
        for m in cat_info['mutations'][:20]:  # Primeiras 20
            output.append(f"\n✅ {m['nome']}")
            if m['descricao']:
                output.append(f"   📝 {m['descricao']}")
            if m['args']:
                output.append(f"   📋 Parâmetros: {', '.join(m['args'][:5])}")
        
        if len(cat_info['mutations']) > 20:
            output.append(f"\n... e mais {len(cat_info['mutations']) - 20} mutations")

# Salvar
with open('GANDALF_ANALISE_FUNCIONALIDADES.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))

print('\n'.join(output))
print(f"\n📄 Relatório salvo em: GANDALF_ANALISE_FUNCIONALIDADES.txt")
