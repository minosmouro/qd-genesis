"""
Script de diagnóstico para verificar dados de empreendimentos
"""
import sys
import os

# Adicionar o diretório raiz ao path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from extensions import db
from empreendimentos.models.empreendimento import Empreendimento
from app import create_app

def check_empreendimentos():
    """Verifica dados de empreendimentos no banco"""
    app = create_app()
    
    with app.app_context():
        print("\n" + "="*80)
        print("DIAGNÓSTICO DE EMPREENDIMENTOS")
        print("="*80 + "\n")
        
        # 1. Contar total de empreendimentos
        total = db.session.query(Empreendimento).count()
        print(f"📊 Total de empreendimentos no banco: {total}")
        
        # 2. Contar por status ativo
        ativos = db.session.query(Empreendimento).filter(Empreendimento.ativo == True).count()
        inativos = db.session.query(Empreendimento).filter(Empreendimento.ativo == False).count()
        print(f"✅ Ativos: {ativos}")
        print(f"❌ Inativos: {inativos}")
        
        # 3. Listar todos os empreendimentos
        if total > 0:
            print(f"\n📋 Listando todos os empreendimentos:\n")
            empreendimentos = db.session.query(Empreendimento).all()
            
            for emp in empreendimentos:
                print(f"ID: {emp.id}")
                print(f"  Nome: {emp.nome}")
                print(f"  CEP: {emp.cep}")
                print(f"  Bairro: {emp.bairro}")
                print(f"  Cidade: {emp.cidade}")
                print(f"  Estado: {emp.estado}")
                print(f"  Tenant ID: {emp.tenant_id}")
                print(f"  Ativo: {emp.ativo}")
                print(f"  Total Imóveis: {emp.total_imoveis}")
                print(f"  Criado em: {emp.created_at}")
                print("-" * 80)
        else:
            print("\n⚠️  NENHUM EMPREENDIMENTO ENCONTRADO NO BANCO!")
            print("\n💡 Possíveis causas:")
            print("   1. Banco de dados vazio (nenhum empreendimento foi cadastrado)")
            print("   2. Tabela 'empreendimentos' não existe")
            print("   3. Conexão com banco de dados incorreta")
            print("\n📝 Solução:")
            print("   - Cadastre pelo menos 1 empreendimento através da interface")
            print("   - Ou execute migrations: flask db upgrade")
        
        # 4. Verificar estrutura da tabela
        print(f"\n🔍 Verificando estrutura da tabela 'empreendimentos':")
        try:
            columns = db.session.execute(db.text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'empreendimentos'
                ORDER BY ordinal_position
            """)).fetchall()
            
            if columns:
                print(f"\n✅ Tabela existe com {len(columns)} colunas:")
                for col in columns:
                    print(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")
            else:
                print("\n❌ Tabela 'empreendimentos' não encontrada!")
        except Exception as e:
            print(f"\n⚠️  Erro ao verificar estrutura: {e}")
        
        # 5. Testar query de busca
        print(f"\n🔎 Testando query de busca (simulando endpoint /search):")
        
        # Teste 1: Busca sem filtro (todos ativos)
        query_test = db.session.query(Empreendimento).filter(
            Empreendimento.ativo == True
        )
        print(f"\n   Query SQL: {query_test}")
        result = query_test.all()
        print(f"   Resultado: {len(result)} empreendimentos encontrados")
        
        # Teste 2: Busca com nome
        if total > 0:
            primeiro = db.session.query(Empreendimento).first()
            if primeiro:
                print(f"\n   Testando busca por nome: '{primeiro.nome}'")
                query_nome = db.session.query(Empreendimento).filter(
                    Empreendimento.nome.ilike(f'%{primeiro.nome}%')
                )
                result_nome = query_nome.all()
                print(f"   Resultado: {len(result_nome)} empreendimentos encontrados")
        
        print("\n" + "="*80)
        print("FIM DO DIAGNÓSTICO")
        print("="*80 + "\n")

if __name__ == '__main__':
    check_empreendimentos()
