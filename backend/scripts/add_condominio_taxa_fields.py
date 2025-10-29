#!/usr/bin/env python3
"""
Script para adicionar campos de taxa de condomínio e IPTU ao modelo Empreendimento.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from extensions import db
from app import create_app
from sqlalchemy import text

def add_condominio_taxa_fields():
    """Adiciona campos de taxa de condomínio e IPTU à tabela empreendimentos"""
    
    app = create_app()
    with app.app_context():
        try:
            # Verificar se as colunas já existem
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('empreendimentos')]
            
            alterations = []
            
            if 'taxa_condominio' not in columns:
                alterations.append("ADD COLUMN taxa_condominio DECIMAL(10,2)")
            
            if 'iptu_anual' not in columns:
                alterations.append("ADD COLUMN iptu_anual DECIMAL(10,2)")
            
            if 'iptu_mensal' not in columns:
                alterations.append("ADD COLUMN iptu_mensal DECIMAL(10,2)")
            
            if alterations:
                # Executar alterações
                for alteration in alterations:
                    sql = f"ALTER TABLE empreendimentos {alteration}"
                    print(f"Executando: {sql}")
                    db.session.execute(text(sql))
                
                db.session.commit()
                print("✅ Campos de taxa de condomínio e IPTU adicionados com sucesso!")
            else:
                print("ℹ️  Todos os campos já existem na tabela.")
                
        except Exception as e:
            db.session.rollback()
            print(f"❌ Erro ao adicionar campos: {e}")
            return False
            
    return True

if __name__ == '__main__':
    print("🔧 Adicionando campos de taxa de condomínio e IPTU...")
    success = add_condominio_taxa_fields()
    if success:
        print("✅ Migração concluída!")
    else:
        print("❌ Migração falhou!")
        sys.exit(1)
