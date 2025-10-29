"""
Script para recuperar imóveis excluídos do Quadradois
buscando-os no Canal Pro usando external_id

COMO USAR:
1. Edite a lista EXTERNAL_IDS_PARA_RECUPERAR abaixo
2. Execute: python backend/scripts/recuperar_imoveis_canalpro.py
3. O script vai buscar cada imóvel no Canal Pro e reimportar
"""

import sys
import os

# Ajustar path para importar módulos do backend
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, backend_dir)

from app import create_app
from extensions import db
from models import Property
from integrations.gandalf_service import get_listing_by_external_id
from utils.integration_tokens import get_valid_integration_headers
from properties.services.property_service import PropertyService
from datetime import datetime
import json

app = create_app()

# ============================================================
# CONFIGURAÇÃO: ADICIONE OS EXTERNAL_IDS AQUI
# ============================================================
EXTERNAL_IDS_PARA_RECUPERAR = [
    # Exemplo: "PROP-001", "PROP-002", etc
    # Cole aqui os external_ids dos 10 imóveis que você quer recuperar
]

# ============================================================

def recuperar_imovel_do_canalpro(external_id: str, tenant_id: int) -> dict:
    """
    Busca um imóvel no Canal Pro pelo external_id e retorna os dados
    
    Args:
        external_id: ID externo do imóvel
        tenant_id: ID do tenant
        
    Returns:
        dict com os dados do imóvel ou None se não encontrado
    """
    try:
        # Obter credenciais do Canal Pro
        creds = get_valid_integration_headers(tenant_id, 'gandalf')
        
        # Buscar imóvel no Canal Pro
        listing = get_listing_by_external_id(external_id, creds)
        
        if listing:
            print(f"  ✅ Encontrado no Canal Pro: {listing.get('title', 'Sem título')[:50]}")
            return listing
        else:
            print(f"  ❌ NÃO encontrado no Canal Pro")
            return None
            
    except Exception as e:
        print(f"  ❌ Erro ao buscar: {e}")
        return None

def converter_canalpro_para_quadradois(listing: dict) -> dict:
    """
    Converte dados do Canal Pro para formato do Quadradois
    
    Args:
        listing: Dados do imóvel do Canal Pro
        
    Returns:
        dict com dados no formato do Quadradois
    """
    # Mapear campos do Canal Pro para Quadradois
    data = {
        'external_id': listing.get('externalId'),
        'title': listing.get('title'),
        'description': listing.get('description'),
        'status': 'ACTIVE',
        
        # Endereço
        'address_street': listing.get('address', {}).get('street'),
        'address_number': listing.get('address', {}).get('number'),
        'address_complement': listing.get('address', {}).get('complement'),
        'address_neighborhood': listing.get('address', {}).get('neighborhood'),
        'address_city': listing.get('address', {}).get('city'),
        'address_state': listing.get('address', {}).get('state'),
        'address_zip': listing.get('address', {}).get('zipCode'),
        
        # Tipo e categoria
        'property_type': listing.get('unitType'),
        'category': listing.get('category'),
        
        # Características físicas
        'bedrooms': listing.get('bedrooms'),
        'suites': listing.get('suites'),
        'bathrooms': listing.get('bathrooms'),
        'parking_spaces': listing.get('parkingSpaces'),
        'total_area': listing.get('totalArea'),
        'usable_area': listing.get('usableArea'),
        
        # Valores
        'sale_price': listing.get('price'),
        'rental_price': listing.get('rentalPrice'),
        'condo_fee': listing.get('condominiumFee'),
        'property_tax': listing.get('yearlyTax'),
        
        # Mídia
        'image_urls': listing.get('images', []),
        'video_url': listing.get('videoUrl'),
        'video_tour_link': listing.get('tourUrl'),
        
        # Características
        'amenities': listing.get('amenities', []),
        'features': listing.get('features', []),
        
        # Empreendimento
        'building_name': listing.get('building', {}).get('name'),
    }
    
    # Remover valores None
    data = {k: v for k, v in data.items() if v is not None}
    
    return data

def main():
    relatorio = []
    relatorio.append("="*80)
    relatorio.append("RECUPERAÇÃO DE IMÓVEIS DO CANAL PRO")
    relatorio.append(f"Data/Hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    relatorio.append("="*80)
    
    if not EXTERNAL_IDS_PARA_RECUPERAR:
        relatorio.append("\n⚠️  ATENÇÃO: Lista de external_ids está vazia!")
        relatorio.append("   Edite o arquivo e adicione os external_ids na lista")
        relatorio.append("   EXTERNAL_IDS_PARA_RECUPERAR")
        print('\n'.join(relatorio))
        return
    
    relatorio.append(f"\n📋 Imóveis para recuperar: {len(EXTERNAL_IDS_PARA_RECUPERAR)}")
    
    with app.app_context():
        tenant_id = 1  # Ajustar se necessário
        
        recuperados = 0
        ja_existem = 0
        nao_encontrados = 0
        erros = 0
        
        for external_id in EXTERNAL_IDS_PARA_RECUPERAR:
            relatorio.append(f"\n{'='*80}")
            relatorio.append(f"🔍 Processando: {external_id}")
            relatorio.append("-" * 80)
            
            try:
                # Verificar se já existe no Quadradois
                existing = Property.query.filter_by(
                    external_id=external_id,
                    tenant_id=tenant_id
                ).first()
                
                if existing:
                    relatorio.append(f"  ⚠️  Já existe no Quadradois (ID: {existing.id})")
                    relatorio.append(f"     Status: {existing.status}")
                    ja_existem += 1
                    continue
                
                # Buscar no Canal Pro
                relatorio.append(f"  🔍 Buscando no Canal Pro...")
                listing = recuperar_imovel_do_canalpro(external_id, tenant_id)
                
                if not listing:
                    nao_encontrados += 1
                    continue
                
                # Converter dados
                relatorio.append(f"  🔄 Convertendo dados...")
                data = converter_canalpro_para_quadradois(listing)
                
                # Criar imóvel no Quadradois
                relatorio.append(f"  💾 Importando para Quadradois...")
                
                # Usar o serviço de criação (que já inclui empreendimento)
                from flask import g
                g.tenant_id = tenant_id
                
                success, result = PropertyService.create_property(data)
                
                if success:
                    relatorio.append(f"  ✅ RECUPERADO COM SUCESSO!")
                    relatorio.append(f"     ID: {result.get('id')}")
                    relatorio.append(f"     Título: {data.get('title', 'N/A')[:50]}")
                    recuperados += 1
                else:
                    relatorio.append(f"  ❌ Erro ao importar: {result.get('message')}")
                    erros += 1
                    
            except Exception as e:
                relatorio.append(f"  ❌ ERRO: {e}")
                erros += 1
        
        # Resumo final
        relatorio.append(f"\n{'='*80}")
        relatorio.append("📊 RESUMO FINAL")
        relatorio.append("="*80)
        relatorio.append(f"\nTotal processados: {len(EXTERNAL_IDS_PARA_RECUPERAR)}")
        relatorio.append(f"✅ Recuperados: {recuperados}")
        relatorio.append(f"⚠️  Já existiam: {ja_existem}")
        relatorio.append(f"❌ Não encontrados: {nao_encontrados}")
        relatorio.append(f"❌ Erros: {erros}")
        
        if recuperados > 0:
            relatorio.append(f"\n🎉 SUCESSO! {recuperados} imóveis foram recuperados!")
        
        relatorio.append("\n" + "="*80)
    
    # Salvar relatório
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'recuperacao_imoveis_{timestamp}.txt'
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('\n'.join(relatorio))
    
    # Imprimir
    for linha in relatorio:
        print(linha)
    
    print(f"\n📄 Relatório salvo em: {filename}")

if __name__ == '__main__':
    print("\n" + "="*80)
    print("RECUPERAÇÃO DE IMÓVEIS DO CANAL PRO")
    print("="*80)
    print("\n⚠️  IMPORTANTE:")
    print("   Este script vai buscar imóveis no Canal Pro e reimportar")
    print("   para o Quadradois usando os external_ids fornecidos.")
    print("\n✅ Configuração:")
    print(f"   External IDs para recuperar: {len(EXTERNAL_IDS_PARA_RECUPERAR)}")
    
    if not EXTERNAL_IDS_PARA_RECUPERAR:
        print("\n❌ ERRO: Lista de external_ids está vazia!")
        print("   Edite o arquivo e adicione os external_ids na lista")
        print("   EXTERNAL_IDS_PARA_RECUPERAR")
        sys.exit(1)
    
    print("\n📋 External IDs:")
    for ext_id in EXTERNAL_IDS_PARA_RECUPERAR:
        print(f"   - {ext_id}")
    
    input("\n⏸️  Pressione ENTER para continuar ou Ctrl+C para cancelar...")
    
    main()
