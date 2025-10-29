"""
🚀 Re-exportar imóveis via API (sem conexão direta ao banco)

Este script usa a API HTTP do backend para re-exportar imóveis,
evitando problemas de "too many clients" no PostgreSQL.

Uso:
    python scripts/reexportar_via_api.py
"""

import requests
import json
import time

# Configuração
BASE_URL = "http://localhost:5000"  # URL do backend (Docker)
USERNAME = "admin"                   # Username do admin
PASSWORD = "admin123"                # Senha do admin

def obter_token():
    """Faz login e obtém o token JWT."""
    print("🔐 Fazendo login...")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"username": USERNAME, "password": PASSWORD}
    )
    
    if response.status_code == 200:
        token = response.json().get('access_token')
        print("✅ Login bem-sucedido!")
        return token
    else:
        print(f"❌ Falha no login: {response.status_code}")
        print(response.text)
        return None


def listar_imoveis(token):
    """Lista todos os imóveis exportados."""
    print("\n📋 Listando imóveis exportados...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(
        f"{BASE_URL}/api/properties",
        headers=headers,
        params={
            "status": "exported",
            "per_page": 1000  # Buscar todos
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        imoveis = data.get('properties', [])
        print(f"✅ Encontrados {len(imoveis)} imóveis exportados")
        return imoveis
    else:
        print(f"❌ Falha ao listar: {response.status_code}")
        print(response.text)
        return []


def reexportar_imovel(token, imovel_id, codigo):
    """Re-exporta um imóvel específico usando a rota de refresh manual."""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Usar a rota de refresh manual: POST /api/properties/<id>/refresh
    response = requests.post(
        f"{BASE_URL}/api/properties/{imovel_id}/refresh",
        headers=headers
    )
    
    if response.status_code == 200:
        print(f"   ✅ {codigo} - Re-exportado com sucesso!")
        return True
    else:
        print(f"   ❌ {codigo} - Falha: {response.status_code}")
        if response.text:
            try:
                error = response.json()
                print(f"      Erro: {error.get('error', error.get('message', response.text))}")
            except:
                print(f"      Erro: {response.text[:100]}")
        return False


def main():
    print("\n" + "="*80)
    print("🚀 RE-EXPORTAÇÃO VIA API: Todos os imóveis para CanalPro")
    print("="*80)
    
    # 1. Login
    token = obter_token()
    if not token:
        print("\n❌ Não foi possível obter o token. Abortando.")
        return
    
    # 2. Listar imóveis
    imoveis = listar_imoveis(token)
    
    if not imoveis:
        print("\n✅ Nenhum imóvel para re-exportar!")
        return
    
    # 3. Mostrar preview
    print(f"\n📋 IMÓVEIS QUE SERÃO RE-EXPORTADOS:\n")
    for prop in imoveis[:10]:
        print(f"   • {prop.get('property_code')} - {prop.get('title', 'Sem título')}")
        print(f"     Tipo: {prop.get('property_type')}")
        print(f"     Remote ID: {prop.get('remote_id')}")
    
    if len(imoveis) > 10:
        print(f"   ... e mais {len(imoveis) - 10} imóveis")
    
    # 4. Confirmar
    print("\n⚠️  ATENÇÃO: Esta operação vai RE-EXPORTAR todos esses imóveis!")
    print(f"   Tempo estimado: ~5 segundos por imóvel")
    print(f"   Total: ~{len(imoveis) * 5 // 60} minutos")
    
    resposta = input(f"\nDeseja prosseguir? [s/N]: ")
    
    if resposta.lower() not in ['s', 'sim', 'y', 'yes']:
        print("\n❌ Operação cancelada pelo usuário.")
        return
    
    # 5. Re-exportar
    print(f"\n🔄 Iniciando re-exportação...\n")
    
    sucessos = 0
    falhas = 0
    
    for i, prop in enumerate(imoveis, 1):
        imovel_id = prop.get('id')
        codigo = prop.get('property_code')
        tipo = prop.get('property_type')
        
        print(f"[{i}/{len(imoveis)}] {codigo} - {tipo}")
        
        try:
            if reexportar_imovel(token, imovel_id, codigo):
                sucessos += 1
            else:
                falhas += 1
            
            # Delay para não sobrecarregar
            time.sleep(2)
        
        except Exception as e:
            falhas += 1
            print(f"   ❌ Exceção: {e}")
    
    # 6. Relatório final
    print("\n" + "="*80)
    print("📊 RESULTADO DA RE-EXPORTAÇÃO")
    print("="*80)
    print(f"✅ Sucessos: {sucessos}")
    print(f"❌ Falhas:   {falhas}")
    print(f"📊 Total:    {len(imoveis)}")
    if len(imoveis) > 0:
        print(f"📈 Taxa de sucesso: {sucessos / len(imoveis) * 100:.1f}%")
    print("="*80)
    
    if sucessos > 0:
        print(f"\n🎉 {sucessos} imóveis foram re-exportados com os tipos corretos!")
        print("   Agora eles devem aparecer corretamente no CanalPro.")
    
    if falhas > 0:
        print(f"\n⚠️  {falhas} imóveis falharam. Verifique os logs para detalhes.")


if __name__ == '__main__':
    main()
