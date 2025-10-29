"""
🔧 Script de Correção: Tipos de Imóveis Exportados Incorretamente

Este script identifica e re-exporta imóveis que foram enviados ao CanalPro
com o tipo incorreto devido ao mapeamento incompleto.

Problema: Imóveis do tipo CASA_CONDOMINIO, COBERTURA, etc. foram exportados
         como APARTMENT por causa do fallback padrão.

Solução: Re-exportar com o mapeamento corrigido.

Uso:
    # 1. Apenas listar imóveis afetados (sem re-exportar)
    python scripts/corrigir_tipos_imoveis_exportados.py --dry-run
    
    # 2. Re-exportar todos os imóveis afetados
    python scripts/corrigir_tipos_imoveis_exportados.py
    
    # 3. Re-exportar apenas um imóvel específico
    python scripts/corrigir_tipos_imoveis_exportados.py --property-code FBBK6V
"""

import sys
import os
from datetime import datetime

# Adicionar diretório raiz ao path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models import db, Property
from integrations.canalpro_exporter import CanalProExporter
import argparse

# Tipos que não estavam mapeados antes (e foram exportados como APARTMENT)
TIPOS_AFETADOS = [
    'CASA_CONDOMINIO',
    'CASA_VILA',
    'COBERTURA',
    'LOFT',
    'LOTE_TERRENO',
    'SALA_COMERCIAL',
    'LOJA',
    'GALPAO',
    'PREDIO_COMERCIAL',
    'FAZENDA'
]

# Mapeamento correto (para referência)
MAPEAMENTO_CORRETO = {
    'CASA_CONDOMINIO': 'HOUSE',
    'CASA_VILA': 'HOUSE',
    'COBERTURA': 'PENTHOUSE',
    'LOFT': 'LOFT',
    'LOTE_TERRENO': 'ALLOTMENT_LAND',
    'SALA_COMERCIAL': 'COMMERCIAL_PROPERTY',
    'LOJA': 'COMMERCIAL_PROPERTY',
    'GALPAO': 'WAREHOUSE',
    'PREDIO_COMERCIAL': 'COMMERCIAL_BUILDING',
    'FAZENDA': 'FARM'
}


def listar_imoveis_afetados(property_code=None):
    """Lista imóveis que foram exportados com tipo incorreto"""
    
    query = Property.query.filter(
        Property.property_type.in_(TIPOS_AFETADOS),
        Property.status == 'exported',
        Property.remote_id.isnot(None)
    )
    
    # Filtrar por código específico se fornecido
    if property_code:
        query = query.filter(Property.property_code == property_code)
    
    # Filtrar apenas imóveis sem unit_types preenchido (foram os afetados)
    query = query.filter(
        db.or_(
            Property.unit_types.is_(None),
            Property.unit_types == '',
            Property.unit_types == '[]'
        )
    )
    
    imoveis = query.all()
    
    return imoveis


def exibir_relatorio(imoveis):
    """Exibe relatório dos imóveis afetados"""
    
    print("\n" + "="*80)
    print("📊 RELATÓRIO: Imóveis Exportados com Tipo Incorreto")
    print("="*80)
    
    if not imoveis:
        print("\n✅ Nenhum imóvel afetado encontrado!")
        return
    
    print(f"\n🔍 Total de imóveis afetados: {len(imoveis)}\n")
    
    # Agrupar por tipo
    por_tipo = {}
    for prop in imoveis:
        tipo = prop.property_type
        if tipo not in por_tipo:
            por_tipo[tipo] = []
        por_tipo[tipo].append(prop)
    
    # Exibir por tipo
    for tipo, props in sorted(por_tipo.items()):
        tipo_correto = MAPEAMENTO_CORRETO.get(tipo, '???')
        print(f"\n📌 {tipo} → {tipo_correto}")
        print(f"   Quantidade: {len(props)}")
        print(f"   Imóveis:")
        
        for prop in props[:10]:  # Mostrar no máximo 10 por tipo
            print(f"      • {prop.property_code} - {prop.title or 'Sem título'}")
            print(f"        Remote ID: {prop.remote_id}")
            print(f"        Última exportação: {prop.updated_at}")
        
        if len(props) > 10:
            print(f"      ... e mais {len(props) - 10} imóveis")
    
    print("\n" + "="*80)


def reexportar_imoveis(imoveis, tenant_id=1, user_id=1):
    """Re-exporta os imóveis com o mapeamento correto"""
    
    print("\n" + "="*80)
    print("🔄 RE-EXPORTAÇÃO: Corrigindo tipos no CanalPro")
    print("="*80)
    
    if not imoveis:
        print("\n✅ Nenhum imóvel para re-exportar!")
        return
    
    print(f"\n📤 Iniciando re-exportação de {len(imoveis)} imóveis...\n")
    
    exporter = CanalProExporter(tenant_id=tenant_id, user_id=user_id)
    
    # Autenticar
    print("🔐 Autenticando no CanalPro...")
    if not exporter.authenticate():
        print("❌ Falha na autenticação! Abortando.")
        return
    print("✅ Autenticado com sucesso!\n")
    
    sucessos = 0
    falhas = 0
    
    for i, prop in enumerate(imoveis, 1):
        tipo_atual = prop.property_type
        tipo_correto = MAPEAMENTO_CORRETO.get(tipo_atual, 'UNKNOWN')
        
        print(f"[{i}/{len(imoveis)}] {prop.property_code} ({tipo_atual} → {tipo_correto})")
        print(f"   Remote ID: {prop.remote_id}")
        
        try:
            # Re-exportar (força update pois já tem remote_id)
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
    print("="*80)


def main():
    """Função principal"""
    
    parser = argparse.ArgumentParser(
        description='Corrige tipos de imóveis exportados incorretamente para o CanalPro'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Apenas lista os imóveis afetados sem re-exportar'
    )
    parser.add_argument(
        '--property-code',
        type=str,
        help='Re-exportar apenas um imóvel específico (ex: FBBK6V)'
    )
    parser.add_argument(
        '--tenant-id',
        type=int,
        default=1,
        help='ID do tenant (padrão: 1)'
    )
    parser.add_argument(
        '--user-id',
        type=int,
        default=1,
        help='ID do usuário (padrão: 1)'
    )
    
    args = parser.parse_args()
    
    # Criar contexto da aplicação
    app = create_app()
    
    with app.app_context():
        print("\n🔍 Buscando imóveis afetados...")
        
        # Listar imóveis afetados
        imoveis = listar_imoveis_afetados(property_code=args.property_code)
        
        # Exibir relatório
        exibir_relatorio(imoveis)
        
        # Re-exportar se não for dry-run
        if not args.dry_run and imoveis:
            print("\n⚠️  ATENÇÃO: Esta operação irá re-exportar os imóveis para o CanalPro!")
            
            if args.property_code:
                resposta = input("\nDeseja prosseguir? [s/N]: ")
            else:
                resposta = input(f"\nDeseja re-exportar {len(imoveis)} imóveis? [s/N]: ")
            
            if resposta.lower() in ['s', 'sim', 'y', 'yes']:
                reexportar_imoveis(imoveis, args.tenant_id, args.user_id)
            else:
                print("\n❌ Operação cancelada pelo usuário.")
        
        elif args.dry_run:
            print("\n💡 Modo dry-run: Nenhuma alteração foi feita.")
            print("   Para re-exportar, execute sem --dry-run")


if __name__ == '__main__':
    main()
