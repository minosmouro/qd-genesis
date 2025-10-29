"""
🚀 Script Rápido: Re-exportar TODOS os imóveis para corrigir os tipos

Este script força a re-exportação de TODOS os imóveis ativos/publicados
para o CanalPro, usando o mapeamento de tipos corrigido.

Uso:
    python scripts/reexportar_todos_imoveis.py
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models import db, Property
from integrations.canalpro_exporter import CanalProExporter

def main():
    print("\n" + "="*80)
    print("🚀 RE-EXPORTAÇÃO GLOBAL: Todos os imóveis para CanalPro")
    print("="*80)
    
    app = create_app()
    
    with app.app_context():
        # Buscar TODOS os imóveis que já foram exportados
        imoveis = Property.query.filter(
            Property.status.in_(['active', 'exported']),
            Property.remote_id.isnot(None)
        ).all()
        
        print(f"\n📊 Total de imóveis a re-exportar: {len(imoveis)}")
        
        if not imoveis:
            print("\n✅ Nenhum imóvel para re-exportar!")
            return
        
        # Mostrar preview
        print(f"\n📋 IMÓVEIS QUE SERÃO RE-EXPORTADOS:\n")
        for prop in imoveis[:10]:  # Mostrar primeiros 10
            print(f"   • {prop.property_code} - {prop.title or 'Sem título'}")
            print(f"     Tipo atual: {prop.property_type}")
            print(f"     Remote ID: {prop.remote_id}")
        
        if len(imoveis) > 10:
            print(f"   ... e mais {len(imoveis) - 10} imóveis")
        
        # Confirmar
        print("\n⚠️  ATENÇÃO: Esta operação vai RE-EXPORTAR todos esses imóveis!")
        print("   Tempo estimado: ~5 segundos por imóvel")
        print(f"   Total: ~{len(imoveis) * 5 // 60} minutos")
        
        resposta = input(f"\nDeseja prosseguir? [s/N]: ")
        
        if resposta.lower() not in ['s', 'sim', 'y', 'yes']:
            print("\n❌ Operação cancelada pelo usuário.")
            return
        
        # Iniciar re-exportação
        print(f"\n🔄 Iniciando re-exportação...\n")
        
        exporter = CanalProExporter(tenant_id=1, user_id=1)
        
        # Autenticar
        print("🔐 Autenticando no CanalPro...")
        if not exporter.authenticate():
            print("❌ Falha na autenticação! Abortando.")
            return
        print("✅ Autenticado com sucesso!\n")
        
        # Re-exportar
        sucessos = 0
        falhas = 0
        
        for i, prop in enumerate(imoveis, 1):
            print(f"[{i}/{len(imoveis)}] {prop.property_code} - {prop.property_type}")
            
            try:
                # is_refresh=True força o UPDATE mesmo que já tenha remote_id
                sucesso = exporter.export_property(prop, is_refresh=True)
                
                if sucesso:
                    sucessos += 1
                    print(f"   ✅ Re-exportado com sucesso!")
                else:
                    falhas += 1
                    print(f"   ❌ Falha na re-exportação!")
                    if prop.error:
                        print(f"   Erro: {prop.error}")
            
            except Exception as e:
                falhas += 1
                print(f"   ❌ Exceção: {e}")
            
            print()
        
        # Relatório final
        print("="*80)
        print("📊 RESULTADO DA RE-EXPORTAÇÃO")
        print("="*80)
        print(f"✅ Sucessos: {sucessos}")
        print(f"❌ Falhas:   {falhas}")
        print(f"📊 Total:    {len(imoveis)}")
        print(f"📈 Taxa de sucesso: {sucessos / len(imoveis) * 100:.1f}%")
        print("="*80)
        
        if sucessos > 0:
            print(f"\n🎉 {sucessos} imóveis foram re-exportados com os tipos corretos!")
            print("   Agora eles devem aparecer corretamente no CanalPro.")
        
        if falhas > 0:
            print(f"\n⚠️  {falhas} imóveis falharam. Verifique os logs para detalhes.")


if __name__ == '__main__':
    main()
