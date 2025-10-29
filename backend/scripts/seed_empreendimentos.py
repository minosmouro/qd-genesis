"""
Script para cadastrar empreendimentos de teste no banco de dados
"""
import sys
import os

# Adicionar o diretório raiz ao path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from extensions import db
from empreendimentos.models.empreendimento import Empreendimento

app = create_app()

with app.app_context():
    print("\n" + "="*60)
    print("CADASTRANDO EMPREENDIMENTOS DE TESTE")
    print("="*60)
    
    # Verificar se já existem empreendimentos
    total_antes = db.session.query(Empreendimento).count()
    print(f"\nEmpreendimentos antes: {total_antes}")
    
    # Lista de empreendimentos de teste
    empreendimentos_teste = [
        {
            'nome': 'Residencial Paulista',
            'cep': '01310100',
            'endereco': 'Avenida Paulista',
            'numero': '1000',
            'bairro': 'Bela Vista',
            'cidade': 'São Paulo',
            'estado': 'SP',
            'andares': 15,
            'unidades_por_andar': 4,
            'blocos': 2,
            'caracteristicas': ['piscina', 'academia', 'playground', 'salao_festas'],
            'tenant_id': 1,
            'ativo': True,
            'total_imoveis': 0
        },
        {
            'nome': 'Condomínio Jardim das Flores',
            'cep': '04543011',
            'endereco': 'Avenida Brigadeiro Faria Lima',
            'numero': '2000',
            'bairro': 'Jardim Paulistano',
            'cidade': 'São Paulo',
            'estado': 'SP',
            'andares': 20,
            'unidades_por_andar': 6,
            'blocos': 1,
            'caracteristicas': ['piscina', 'academia', 'sauna', 'quadra_tenis'],
            'tenant_id': 1,
            'ativo': True,
            'total_imoveis': 0
        },
        {
            'nome': 'Edifício Central Park',
            'cep': '01452000',
            'endereco': 'Avenida Rebouças',
            'numero': '3000',
            'bairro': 'Pinheiros',
            'cidade': 'São Paulo',
            'estado': 'SP',
            'andares': 25,
            'unidades_por_andar': 8,
            'blocos': 1,
            'caracteristicas': ['piscina', 'academia', 'spa', 'coworking'],
            'tenant_id': 1,
            'ativo': True,
            'total_imoveis': 0
        },
        {
            'nome': 'Residencial Vila Mariana',
            'cep': '04101300',
            'endereco': 'Rua Domingos de Morais',
            'numero': '1500',
            'bairro': 'Vila Mariana',
            'cidade': 'São Paulo',
            'estado': 'SP',
            'andares': 12,
            'unidades_por_andar': 4,
            'blocos': 3,
            'caracteristicas': ['piscina', 'playground', 'churrasqueira'],
            'tenant_id': 1,
            'ativo': True,
            'total_imoveis': 0
        },
        {
            'nome': 'Condomínio Moema Life',
            'cep': '04077020',
            'endereco': 'Avenida Ibirapuera',
            'numero': '2500',
            'bairro': 'Moema',
            'cidade': 'São Paulo',
            'estado': 'SP',
            'andares': 18,
            'unidades_por_andar': 5,
            'blocos': 2,
            'caracteristicas': ['piscina', 'academia', 'bicicletario', 'pet_place'],
            'tenant_id': 1,
            'ativo': True,
            'total_imoveis': 0
        }
    ]
    
    # Cadastrar empreendimentos
    cadastrados = 0
    for emp_data in empreendimentos_teste:
        # Verificar se já existe
        existe = db.session.query(Empreendimento).filter(
            Empreendimento.nome == emp_data['nome']
        ).first()
        
        if existe:
            print(f"⚠️  '{emp_data['nome']}' já existe, pulando...")
            continue
        
        # Criar novo empreendimento
        emp = Empreendimento(**emp_data)
        db.session.add(emp)
        cadastrados += 1
        print(f"✅ Cadastrado: {emp_data['nome']}")
    
    # Salvar no banco
    if cadastrados > 0:
        db.session.commit()
        print(f"\n✅ {cadastrados} empreendimentos cadastrados com sucesso!")
    else:
        print("\nℹ️  Nenhum empreendimento novo cadastrado (todos já existem)")
    
    # Verificar total após cadastro
    total_depois = db.session.query(Empreendimento).count()
    print(f"\nEmpreendimentos depois: {total_depois}")
    
    print("\n" + "="*60)
    print("CADASTRO CONCLUÍDO")
    print("="*60)
    print("\n💡 Agora você pode testar a busca de empreendimentos no frontend!")
    print("   1. Acesse o cadastro de imóveis")
    print("   2. Vá para Step 2 (Informações do Empreendimento)")
    print("   3. Digite no campo de busca ou clique para ver todos\n")
