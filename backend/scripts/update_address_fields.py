"""Script para adicionar campos de endereço faltantes ao modelo Property.

Este script pode ser executado quando o banco de dados estiver disponível.
Ele adiciona os seguintes campos:
- address_country: País (padrão: Brasil)
- address_reference: Referência do endereço
- address_district: Distrito/Sub-região
- zoning_type: Tipo de zoneamento
- urban_zone: Zona urbana
"""

import os
import sys
from pathlib import Path

# Adicionar o diretório backend ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Também adicionar o diretório atual
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def update_database_schema():
    """Atualiza o schema do banco de dados com os novos campos de endereço."""
    try:
        from app import create_app
        from models import db

        print("🔄 Criando aplicação Flask...")
        app = create_app()

        print("🔄 Conectando ao banco de dados...")
        with app.app_context():
            print("🔄 Atualizando schema do banco...")
            db.create_all()
            print("✅ Schema atualizado com sucesso!")

            # Verificar se os campos foram criados
            from models import Property
            inspector = db.inspect(db.engine)

            columns = inspector.get_columns('properties')
            column_names = [col['name'] for col in columns]

            new_fields = ['address_country', 'address_reference', 'address_district', 'zoning_type', 'urban_zone']
            added_fields = []

            for field in new_fields:
                if field in column_names:
                    added_fields.append(field)
                    print(f"✅ Campo '{field}' adicionado com sucesso")
                else:
                    print(f"❌ Campo '{field}' não foi encontrado")

            if added_fields:
                print(f"\n🎉 {len(added_fields)} campos de endereço foram adicionados com sucesso!")
                print("Campos adicionados:", ", ".join(added_fields))
            else:
                print("\n⚠️  Nenhum campo novo foi detectado. Verifique se a migração já foi executada.")

    except Exception as e:
        print(f"❌ Erro ao atualizar schema: {str(e)}")
        print("Certifique-se de que:")
        print("1. O banco de dados está rodando")
        print("2. As variáveis de ambiente estão configuradas")
        print("3. As dependências estão instaladas")
        return False

    return True

if __name__ == "__main__":
    print("🚀 Iniciando atualização dos campos de endereço...")
    success = update_database_schema()

    if success:
        print("\n🎯 Próximos passos recomendados:")
        print("1. Teste a criação de um novo imóvel com os campos de endereço")
        print("2. Verifique se o mapeamento para Gandalf está funcionando")
        print("3. Teste a validação de CEP com o novo utilitário")
    else:
        print("\n❌ Atualização falhou. Verifique os logs acima.")
