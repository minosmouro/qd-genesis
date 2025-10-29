"""
Script para analisar qualidade dos dados após importação do CanalPro
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app
from extensions import db
from models import Property
from sqlalchemy import func, or_
from datetime import datetime, timedelta

app = create_app()

with app.app_context():
    print("="*80)
    print("📊 ANÁLISE DE QUALIDADE DA IMPORTAÇÃO")
    print("="*80)
    
    # Importações recentes (últimos 5 minutos)
    recent_cutoff = datetime.utcnow() - timedelta(minutes=5)
    recent_imports = Property.query.filter(
        Property.created_at >= recent_cutoff
    ).all()
    
    print(f"\n🕒 Imóveis importados nos últimos 5 minutos: {len(recent_imports)}")
    
    if recent_imports:
        print("\n" + "="*80)
        print("📋 DETALHES DOS IMÓVEIS IMPORTADOS:")
        print("="*80)
        
        for prop in recent_imports:
            print(f"\n{'='*80}")
            print(f"🏠 Imóvel #{prop.id}")
            print(f"{'='*80}")
            print(f"   📝 Título: {prop.title[:60]}..." if len(prop.title or '') > 60 else f"   📝 Título: {prop.title}")
            print(f"   🆔 External ID: {prop.external_id}")
            print(f"   🆔 Property Code: {prop.property_code}")
            print(f"   📅 Criado em: {prop.created_at}")
            print(f"\n   🏗️  DADOS BÁSICOS:")
            print(f"      property_type: {prop.property_type or '❌ VAZIO'}")
            print(f"      usage_types: {prop.usage_types or '❌ VAZIO'}")
            print(f"      category: {prop.category or '❌ VAZIO'}")
            print(f"      unit_types: {prop.unit_types}")
            print(f"      unit_subtypes: {prop.unit_subtypes}")
            print(f"\n   📐 ÁREAS:")
            print(f"      usable_area: {prop.usable_area or '❌'}")
            print(f"      total_area: {prop.total_area or '❌'}")
            print(f"\n   🛏️  CARACTERÍSTICAS:")
            print(f"      bedrooms: {prop.bedrooms or '❌'}")
            print(f"      bathrooms: {prop.bathrooms or '❌'}")
            print(f"      suites: {prop.suites or '❌'}")
            print(f"      parking_spaces: {prop.parking_spaces or '❌'}")
            print(f"\n   💰 VALORES:")
            print(f"      price: {prop.price or '❌'}")
            print(f"      price_rent: {prop.price_rent or '❌'}")
            
            # Verificar se tem problemas
            problems = []
            if not prop.property_type:
                problems.append("❌ property_type vazio")
            if not prop.usage_types or prop.usage_types == []:
                problems.append("❌ usage_types vazio")
            if not prop.category:
                problems.append("❌ category vazio")
            if not prop.total_area:
                problems.append("⚠️  total_area vazio")
            if not prop.bedrooms:
                problems.append("⚠️  bedrooms vazio")
            
            if problems:
                print(f"\n   🚨 PROBLEMAS DETECTADOS:")
                for problem in problems:
                    print(f"      {problem}")
            else:
                print(f"\n   ✅ Todos os campos básicos preenchidos!")
    
    # Estatísticas gerais
    print("\n" + "="*80)
    print("📊 ESTATÍSTICAS GERAIS DO BANCO:")
    print("="*80)
    
    total = Property.query.count()
    missing_type = Property.query.filter(
        or_(Property.property_type == None, Property.property_type == '')
    ).count()
    missing_usage = Property.query.filter(
        or_(Property.usage_types == None, Property.usage_types == [])
    ).count()
    missing_category = Property.query.filter(
        or_(Property.category == None, Property.category == '')
    ).count()
    
    print(f"\n   Total de imóveis: {total}")
    print(f"   Sem property_type: {missing_type} ({missing_type/total*100:.1f}%)" if total > 0 else "   Sem property_type: 0")
    print(f"   Sem usage_types: {missing_usage} ({missing_usage/total*100:.1f}%)" if total > 0 else "   Sem usage_types: 0")
    print(f"   Sem category: {missing_category} ({missing_category/total*100:.1f}%)" if total > 0 else "   Sem category: 0")
    
    print("\n" + "="*80)
    print("✅ ANÁLISE CONCLUÍDA!")
    print("="*80)
