"""
Script de DEBUG para rastrear EXATAMENTE onde a categoria está sendo alterada.
"""

import sys
import os

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from properties.services.property_service import PropertyService

print("=" * 80)
print("🔍 DEBUG: RASTREAMENTO DE CATEGORIA")
print("=" * 80)

# Simular exatamente o que o frontend envia
test_data = {
    'property_type': 'CASA_CONDOMINIO',
    'category': 'TERREA'
}

print("\n📥 DADOS DE ENTRADA (do frontend):")
print(f"   property_type: {test_data['property_type']}")
print(f"   category: {test_data['category']}")

print("\n🔄 CHAMANDO PropertyService.map_property_category()...")

# Chamar a função de mapeamento
normalized_type, normalized_category = PropertyService.map_property_category(
    test_data['property_type'],
    test_data['category']
)

print(f"\n📤 RESULTADO do map_property_category:")
print(f"   normalized_type: {normalized_type}")
print(f"   normalized_category: {normalized_category}")

# Verificar se está correto
if normalized_category == 'Térrea':
    print(f"\n✅ MAPEAMENTO CORRETO!")
else:
    print(f"\n❌ MAPEAMENTO INCORRETO!")
    print(f"   Esperado: 'Térrea'")
    print(f"   Obtido: '{normalized_category}'")

print("\n" + "=" * 80)
print("⚠️ SE O MAPEAMENTO ESTÁ CORRETO MAS AINDA SALVA 'Padrão',")
print("   o problema está em OUTRO LUGAR do código!")
print("   Vamos verificar _update_type_fields()...")
print("=" * 80)

# Verificar se há outro lugar que está sobrescrevendo
print("\n🔍 Procurando outros lugares que podem alterar category...")
print("\nProcure por:")
print("  1. Linhas com: prop.category = ")
print("  2. Linhas com: 'Padrão' como default")
print("  3. Chamadas para map_property_category que ignoram o resultado")
