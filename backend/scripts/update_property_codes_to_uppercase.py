#!/usr/bin/env python3
"""
Script opcional para atualizar property_codes existentes para maiúsculas
"""
import sys
import os

# Adicionar o diretório backend ao path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

try:
    from app import create_app, db
    from models import Property
    from properties.services.property_service import PropertyService
    from flask import g
except ImportError as e:
    print(f"Erro de import: {e}")
    print("Certifique-se de estar executando do diretório backend/")
    sys.exit(1)

def update_existing_property_codes():
    """Atualiza property_codes existentes para usar prefixos em maiúsculas"""
    app = create_app()

    with app.app_context():
        # Buscar todos os tenants
        tenants = db.session.query(Property.tenant_id).distinct().all()
        tenant_ids = [t[0] for t in tenants]

        for tenant_id in tenant_ids:
            print(f"Processando tenant_id: {tenant_id}")

            # Simular contexto do tenant
            g.tenant_id = tenant_id

            # Buscar imóveis com property_code que começam com letra minúscula
            properties_to_update = Property.query.filter(
                Property.tenant_id == tenant_id,
                Property.property_code.isnot(None),
                Property.property_code.like('a%') |
                Property.property_code.like('c%') |
                Property.property_code.like('s%') |
                Property.property_code.like('p%') |
                Property.property_code.like('d%') |
                Property.property_code.like('t%') |
                Property.property_code.like('l%') |
                Property.property_code.like('r%') |
                Property.property_code.like('g%') |
                Property.property_code.like('o%') |
                Property.property_code.like('e%') |
                Property.property_code.like('b%') |
                Property.property_code.like('f%') |
                Property.property_code.like('h%') |
                Property.property_code.like('u%')
            ).all()

            print(f"Encontrados {len(properties_to_update)} imóveis para atualizar")

            for prop in properties_to_update:
                # Extrair partes do código atual
                if '-' in prop.property_code:
                    prefix_part, rest = prop.property_code.split('-', 1)
                    # Converter prefixo para maiúsculas
                    new_prefix = prefix_part.upper()
                    new_code = f"{new_prefix}-{rest}"

                    print(f"  Atualizando {prop.id}: {prop.property_code} -> {new_code}")
                    prop.property_code = new_code

            # Commit das mudanças
            if properties_to_update:
                db.session.commit()
                print(f"Commit realizado para tenant {tenant_id}")

        print("Atualização concluída!")

if __name__ == "__main__":
    update_existing_property_codes()
