"""
Script para adicionar logging DEBUG temporário e ver EXATAMENTE o que está sendo recebido.
"""

print("=" * 80)
print("🔍 ANÁLISE: O que o backend está recebendo do frontend?")
print("=" * 80)

print("""
PROBLEMA IDENTIFICADO:

No arquivo: backend/properties/services/property_service.py
Linhas 192-197:

    if not category and normalized_type in category_mapping:
        # Para tipos que têm subcategorias, usar 'Padrão' como default
        if normalized_type in ['APARTMENT', 'HOUSE', 'CASA_CONDOMINIO', 'CASA_VILA', ...]:
            normalized_category = 'Padrão'  # ← FORÇA "Padrão" quando NÃO vem category!
        else:
            normalized_category = None

ISSO SIGNIFICA:
- Se category = None → Usa "Padrão"
- Se category = "" (string vazia) → Usa "Padrão"  
- Se category = "TERREA" → Deveria mapear para "Térrea"

POSSÍVEIS CAUSAS:

1️⃣ Frontend não está enviando o campo 'category'
   Solução: Verificar PropertyCreateStepperFixed.tsx

2️⃣ Frontend envia 'category' mas backend não recebe
   Solução: Verificar serialização no propertiesService

3️⃣ Existe OUTRO lugar que reseta category antes de salvar
   Solução: Procurar por "prop.category =" no código

COMO DIAGNOSTICAR:

Opção A) Adicionar print temporário no backend:
   
   Arquivo: backend/properties/services/property_service.py
   Linha ~545 (dentro de _update_type_fields):
   
   def _update_type_fields(prop: Property, data: Dict[str, Any]) -> None:
       property_type = data.get('property_type')
       category = data.get('category')
       
       # ✅ ADICIONAR ESTE PRINT:
       print(f"🔍 DEBUG _update_type_fields:")
       print(f"   property_type recebido: {property_type}")
       print(f"   category recebido: {category}")
       print(f"   category is None? {category is None}")
       print(f"   category == ''? {category == ''}")

Opção B) Verificar no navegador (DevTools):
   
   1. Abrir DevTools (F12)
   2. Aba Network
   3. Editar imóvel e selecionar "Térrea"
   4. Ver a requisição PATCH /api/properties/xxx
   5. Verificar o payload JSON enviado
   6. Confirmar se tem: "category": "TERREA"

Opção C) Usar curl para testar diretamente:

   curl -X PATCH http://localhost:5000/api/properties/537 \\
     -H "Authorization: Bearer $TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{
       "property_type": "CASA_CONDOMINIO",
       "category": "TERREA"
     }'

""")

print("=" * 80)
print("Qual método você prefere usar para diagnosticar?")
print("1) Adicionar print no backend")
print("2) Verificar no DevTools do navegador")  
print("3) Testar com curl")
print("=" * 80)
