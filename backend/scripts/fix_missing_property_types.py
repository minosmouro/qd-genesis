"""
Script para corrigir imóveis sem property_type, usage_types ou category
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app
from extensions import db
from models import Property
from sqlalchemy import or_

app = create_app()

with app.app_context():
    # Buscar imóveis problemáticos
    broken_properties = Property.query.filter(
        or_(
            Property.property_type == None,
            Property.property_type == '',
            Property.usage_types == None,
            Property.category == None,
            Property.category == ''
        )
    ).all()
    
    print(f"🔍 Encontrados {len(broken_properties)} imóveis com dados faltando")
    
    for prop in broken_properties:
        print(f"\n📋 Imóvel #{prop.id}:")
        print(f"   - Título: {prop.title[:50] if prop.title else 'N/A'}...")
        print(f"   - property_type: {prop.property_type}")
        print(f"   - usage_types: {prop.usage_types}")
        print(f"   - category: {prop.category}")
        print(f"   - unit_types: {prop.unit_types}")
        print(f"   - unit_subtypes: {prop.unit_subtypes}")
        
        # Tentar inferir tipo baseado em dados existentes
        fixed = False
        
        # 1. Tentar usar unit_types
        if prop.unit_types and isinstance(prop.unit_types, list) and len(prop.unit_types) > 0:
            prop.property_type = prop.unit_types[0]
            print(f"   ✅ Definido property_type = {prop.property_type} (de unit_types)")
            fixed = True
        
        # 2. Tentar inferir do título/descrição
        if not prop.property_type:
            title_lower = (prop.title or '').lower()
            desc_lower = (prop.description or '').lower()
            
            if 'apartamento' in title_lower or 'apartamento' in desc_lower:
                prop.property_type = 'APARTMENT'
                print(f"   ✅ Inferido property_type = APARTMENT (do título)")
                fixed = True
            elif 'casa' in title_lower or 'casa' in desc_lower:
                prop.property_type = 'CASA'
                print(f"   ✅ Inferido property_type = CASA (do título)")
                fixed = True
        
        # 3. Definir usage_types padrão
        if not prop.usage_types or prop.usage_types == []:
            prop.usage_types = ['RESIDENTIAL']
            print(f"   ✅ Definido usage_types = ['RESIDENTIAL'] (padrão)")
            fixed = True
        
        # 4. Definir categoria padrão
        if not prop.category or prop.category == '':
            prop.category = 'Padrão'
            print(f"   ✅ Definido category = 'Padrão' (padrão)")
            fixed = True
        
        if fixed:
            try:
                db.session.commit()
                print(f"   💾 Salvo com sucesso!")
            except Exception as e:
                db.session.rollback()
                print(f"   ❌ Erro ao salvar: {e}")
        else:
            print(f"   ⚠️ Não foi possível corrigir automaticamente")
    
    print(f"\n✅ Processamento concluído!")
