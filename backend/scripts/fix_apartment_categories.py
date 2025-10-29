"""
Script para definir categoria 'Padrão' para apartamentos sem categoria.

Este script:
1. Encontra todos os imóveis com property_type = 'APARTMENT'
2. Que NÃO têm categoria definida (category IS NULL ou category = '')
3. Define a categoria como 'Padrão'

Uso:
    python backend/scripts/fix_apartment_categories.py
"""

import sys
import os

# Adicionar o diretório backend ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from extensions import db
from models import Property
from app import create_app

def fix_apartment_categories():
    """Define categoria 'Padrão' para apartamentos sem categoria"""
    
    app = create_app()
    
    with app.app_context():
        print("🔍 Buscando apartamentos sem categoria...")
        
        # Buscar apartamentos sem categoria
        apartments_without_category = Property.query.filter(
            Property.property_type == 'APARTMENT',
            db.or_(
                Property.category.is_(None),
                Property.category == ''
            )
        ).all()
        
        total = len(apartments_without_category)
        print(f"📊 Encontrados: {total} apartamentos sem categoria")
        
        if total == 0:
            print("✅ Nenhum apartamento precisa de correção!")
            return
        
        # Confirmar com usuário
        print("\n⚠️  Isso irá definir category='Padrão' para todos esses apartamentos.")
        confirm = input("Deseja continuar? (s/n): ")
        
        if confirm.lower() != 's':
            print("❌ Operação cancelada pelo usuário")
            return
        
        # Aplicar correções
        print("\n🔧 Aplicando correções...")
        updated_count = 0
        
        for prop in apartments_without_category:
            prop.category = 'Padrão'
            updated_count += 1
            print(f"  ✅ {prop.id} - {prop.external_id} - {prop.title[:50]}...")
        
        # Commit
        try:
            db.session.commit()
            print(f"\n✅ Sucesso! {updated_count} apartamentos atualizados com categoria 'Padrão'")
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Erro ao salvar: {e}")
            raise

def show_statistics():
    """Mostra estatísticas de categorias por tipo de imóvel"""
    
    app = create_app()
    
    with app.app_context():
        print("\n📊 Estatísticas de Categorias:")
        print("=" * 60)
        
        # Apartamentos por categoria
        print("\n🏢 APARTAMENTOS:")
        apartments = db.session.query(
            Property.category,
            db.func.count(Property.id).label('total')
        ).filter(
            Property.property_type == 'APARTMENT'
        ).group_by(Property.category).all()
        
        for category, total in apartments:
            cat_display = category if category else "(vazio)"
            print(f"  {cat_display:20s} : {total:3d}")
        
        # Todos os tipos por categoria
        print("\n📋 TODOS OS TIPOS:")
        all_types = db.session.query(
            Property.property_type,
            Property.category,
            db.func.count(Property.id).label('total')
        ).group_by(Property.property_type, Property.category).order_by(
            Property.property_type, Property.category
        ).all()
        
        current_type = None
        for ptype, category, total in all_types:
            if ptype != current_type:
                print(f"\n  {ptype}:")
                current_type = ptype
            
            cat_display = category if category else "(vazio)"
            print(f"    {cat_display:20s} : {total:3d}")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Corrigir categorias de apartamentos')
    parser.add_argument('--stats', action='store_true', help='Mostrar apenas estatísticas')
    parser.add_argument('--fix', action='store_true', help='Aplicar correções')
    
    args = parser.parse_args()
    
    if args.stats:
        show_statistics()
    elif args.fix:
        fix_apartment_categories()
        show_statistics()
    else:
        print("Uso:")
        print("  python backend/scripts/fix_apartment_categories.py --stats  # Ver estatísticas")
        print("  python backend/scripts/fix_apartment_categories.py --fix    # Aplicar correções")
