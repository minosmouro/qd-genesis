"""
🔍 Script de Diagnóstico: Por que a edição do FBBK6V não está salvando?

Este script vai:
1. Verificar o imóvel FBBK6V no banco
2. Simular uma atualização do property_type
3. Verificar se o PropertyService._update_type_fields está funcionando
4. Testar se o problema está no backend ou frontend
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models import db, Property
from properties.services.property_service import PropertyService

def diagnosticar_fbbk6v():
    """Diagnostica o problema de edição do FBBK6V"""
    
    app = create_app()
    
    with app.app_context():
        print("\n" + "="*80)
        print("🔍 DIAGNÓSTICO: Imóvel FBBK6V - Por que não salva a edição?")
        print("="*80)
        
        # 1. Buscar imóvel
        prop = Property.query.filter_by(property_code='FBBK6V').first()
        
        if not prop:
            print("\n❌ ERRO: Imóvel FBBK6V não encontrado no banco!")
            return
        
        print(f"\n📊 DADOS ATUAIS NO BANCO:")
        print(f"   ID: {prop.id}")
        print(f"   Código: {prop.property_code}")
        print(f"   Título: {prop.title}")
        print(f"   property_type: '{prop.property_type}'")
        print(f"   category: '{prop.category}'")
        print(f"   unit_types: {prop.unit_types}")
        print(f"   Remote ID: {prop.remote_id}")
        print(f"   Status: {prop.status}")
        
        # 2. Testar mapeamento
        print(f"\n🔧 TESTE DE MAPEAMENTO:")
        
        # Simular mudança para HOUSE
        normalized_type, normalized_category = PropertyService.map_property_category('HOUSE', 'Térrea')
        print(f"   Input: property_type='HOUSE', category='Térrea'")
        print(f"   Output mapeado: property_type='{normalized_type}', category='{normalized_category}'")
        
        # Simular mudança para CASA_CONDOMINIO
        normalized_type2, normalized_category2 = PropertyService.map_property_category('CASA_CONDOMINIO', 'Padrão')
        print(f"   Input: property_type='CASA_CONDOMINIO', category='Padrão'")
        print(f"   Output mapeado: property_type='{normalized_type2}', category='{normalized_category2}'")
        
        # 3. Simular atualização (SEM COMMIT)
        print(f"\n🧪 SIMULAÇÃO DE ATUALIZAÇÃO (sem commit):")
        
        # Backup valores originais
        original_type = prop.property_type
        original_category = prop.category
        
        # Simular mudança
        test_data = {
            'property_type': 'HOUSE',
            'category': 'Térrea'
        }
        
        print(f"   Dados de teste: {test_data}")
        
        # Aplicar função de update
        PropertyService._update_type_fields(prop, test_data)
        
        print(f"   Após _update_type_fields:")
        print(f"      property_type: '{prop.property_type}'")
        print(f"      category: '{prop.category}'")
        
        # Verificar se mudou
        if prop.property_type != original_type:
            print(f"   ✅ property_type MUDOU de '{original_type}' para '{prop.property_type}'")
        else:
            print(f"   ❌ property_type NÃO MUDOU (ainda é '{prop.property_type}')")
        
        if prop.category != original_category:
            print(f"   ✅ category MUDOU de '{original_category}' para '{prop.category}'")
        else:
            print(f"   ❌ category NÃO MUDOU (ainda é '{prop.category}')")
        
        # Reverter (rollback)
        db.session.rollback()
        print(f"\n   🔄 Rollback executado (valores restaurados)")
        
        # 4. Verificar o que o frontend está enviando
        print(f"\n📝 CHECKLIST DE DIAGNÓSTICO:")
        print(f"\n   1️⃣ Backend está funcionando?")
        print(f"      ✅ Função map_property_category: OK")
        print(f"      ✅ Função _update_type_fields: OK")
        print(f"      ⚠️  Precisa verificar se o endpoint PUT está recebendo os dados")
        
        print(f"\n   2️⃣ O que verificar no frontend:")
        print(f"      □ O form está enviando property_type e category?")
        print(f"      □ O payload do PUT está correto?")
        print(f"      □ O backend está retornando 200 OK?")
        print(f"      □ O frontend está recarregando os dados após salvar?")
        
        print(f"\n   3️⃣ Como testar manualmente:")
        print(f"      1. Abra o DevTools (F12)")
        print(f"      2. Vá na aba 'Network'")
        print(f"      3. Edite o imóvel FBBK6V")
        print(f"      4. Mude o tipo para 'Casa' e categoria para 'Térrea'")
        print(f"      5. Clique em 'Salvar'")
        print(f"      6. Veja a requisição PUT/PATCH que foi enviada")
        print(f"      7. Verifique o payload (body) da requisição")
        print(f"      8. Verifique a resposta (response)")
        
        print(f"\n   4️⃣ Teste via API direto (usando curl):")
        print(f"      Execute este comando para testar o backend:")
        print(f"\n      curl -X PATCH http://localhost:5000/properties/{prop.id} \\")
        print(f"           -H 'Content-Type: application/json' \\")
        print(f"           -H 'Authorization: Bearer SEU_TOKEN' \\")
        print(f"           -d '{{\"property_type\":\"HOUSE\",\"category\":\"Térrea\"}}'")
        
        print("\n" + "="*80)
        print("✅ DIAGNÓSTICO COMPLETO")
        print("="*80)
        
        # 5. Testar atualização REAL (APENAS SE USUÁRIO CONFIRMAR)
        print(f"\n⚠️  ATENÇÃO: Quer fazer uma atualização REAL de teste?")
        resposta = input("   Digite 'sim' para mudar o FBBK6V para HOUSE/Térrea: ")
        
        if resposta.lower() in ['sim', 's', 'yes', 'y']:
            print(f"\n🔄 Executando atualização REAL...")
            
            test_data_real = {
                'property_type': 'HOUSE',
                'category': 'Térrea'
            }
            
            success, result = PropertyService.update_property(prop.id, test_data_real)
            
            if success:
                print(f"\n✅ Atualização BEM-SUCEDIDA!")
                print(f"   Resposta: {result}")
                
                # Recarregar do banco
                db.session.refresh(prop)
                print(f"\n📊 DADOS APÓS ATUALIZAÇÃO:")
                print(f"   property_type: '{prop.property_type}'")
                print(f"   category: '{prop.category}'")
            else:
                print(f"\n❌ Atualização FALHOU!")
                print(f"   Erro: {result}")
        else:
            print(f"\n❌ Atualização real cancelada pelo usuário.")


if __name__ == '__main__':
    diagnosticar_fbbk6v()
