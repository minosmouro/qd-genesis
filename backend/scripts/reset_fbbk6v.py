"""
Script para resetar o imóvel FBBK6V e testar exportação com mapeamento corrigido.
"""

import sys
import os

# Adicionar diretório backend ao path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from sqlalchemy import create_engine, text

# Conectar ao banco
DATABASE_URI = 'postgresql://gandalf_user:gandalf_pass@localhost:5432/gandalf_db'
engine = create_engine(DATABASE_URI)

print("=" * 80)
print("🔄 RESETANDO IMÓVEL FBBK6V (ID=537)")
print("=" * 80)

with engine.connect() as conn:
    # Resetar campos
    result = conn.execute(text("""
        UPDATE property 
        SET 
            unit_types = NULL,
            status = 'pending',
            error = NULL,
            remote_id = NULL
        WHERE id = 537
        RETURNING id, code, property_type, unit_types, status, remote_id
    """))
    
    conn.commit()
    
    row = result.fetchone()
    if row:
        print(f"\n✅ Imóvel resetado:")
        print(f"   ID: {row[0]}")
        print(f"   Código: {row[1]}")
        print(f"   property_type: {row[2]}")
        print(f"   unit_types: {row[3]}")
        print(f"   status: {row[4]}")
        print(f"   remote_id: {row[5]}")
        print(f"\n✅ Pronto para re-exportação!")
    else:
        print("❌ Imóvel não encontrado!")

print("\n" + "=" * 80)
print("Próximos passos:")
print("1. Editar o imóvel FBBK6V via UI")
print("2. Mudar status para 'active' para triggerar exportação")
print("3. Verificar se exporta corretamente como 'CONDOMINIUM'")
print("=" * 80)
