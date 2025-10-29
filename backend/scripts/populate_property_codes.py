#!/usr/bin/env python3
"""
Script para popular property_code em registros existentes
"""
import sys
import os

# Adicionar o diretório backend ao path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, '..')
sys.path.insert(0, backend_dir)

from app import create_app
from extensions import db
from models import Property
from properties.services.property_service import PropertyService
from flask import g

def populate_property_codes():
    """Popula property_code para imóveis que ainda não têm esse campo"""
    app = create_app()

    with app.app_context():
        # Buscar todos os tenants
        tenants = db.session.query(Property.tenant_id).distinct().all()
        tenant_ids = [t[0] for t in tenants]

        for tenant_id in tenant_ids:
            print(f"Processando tenant_id: {tenant_id}")

            # Simular contexto do tenant
            g.tenant_id = tenant_id

            # Buscar imóveis sem property_code
            properties_without_code = Property.query.filter_by(
                tenant_id=tenant_id,
                property_code=None
            ).all()

            print(f"Encontrados {len(properties_without_code)} imóveis sem property_code")

            for prop in properties_without_code:
                # Gerar property_code
                prop.property_code = PropertyService._generate_property_code(
                    prop.property_type,
                    tenant_id
                )
                print(f"  Imóvel {prop.id}: {prop.property_code}")

            # Commit das mudanças
            db.session.commit()
            print(f"Commit realizado para tenant {tenant_id}")

        print("Processamento concluído!")

if __name__ == "__main__":
    populate_property_codes()
