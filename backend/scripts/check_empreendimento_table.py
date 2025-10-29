#!/usr/bin/env python3
"""
Script para verificar a estrutura da tabela empreendimentos
"""

import sys
import os

# Adiciona o diretório backend ao path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(backend_dir)

from extensions import db
from app import create_app

def check_empreendimento_table():
    """Verifica a estrutura da tabela empreendimentos"""
    
    app = create_app()
    with app.app_context():
        try:
            inspector = db.inspect(db.engine)
            columns = inspector.get_columns('empreendimentos')
            
            print("🔍 Estrutura da tabela 'empreendimentos':")
            print(f"   Total de colunas: {len(columns)}")
            print()
            
            # Procurar por campos específicos
            campos_interesse = ['andares', 'unidades_por_andar', 'blocos', 'entrega_em', 'caracteristicas']
            
            for col in columns:
                name = col['name']
                tipo = str(col['type'])
                nullable = col.get('nullable', True)
                default = col.get('default')
                
                if name in campos_interesse:
                    print(f"✅ {name:25} | {tipo:15} | NULL: {nullable} | Default: {default}")
                else:
                    print(f"   {name:25} | {tipo:15} | NULL: {nullable} | Default: {default}")
            
            print()
            print("🎯 Campos estruturais encontrados:")
            for campo in campos_interesse:
                existe = any(col['name'] == campo for col in columns)
                status = "✅ Existe" if existe else "❌ NÃO EXISTE"
                print(f"   {campo:20} -> {status}")
                
        except Exception as e:
            print(f"❌ Erro ao verificar tabela: {e}")

if __name__ == '__main__':
    check_empreendimento_table()
