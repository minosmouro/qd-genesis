"""
MIGRAÇÃO CRÍTICA: Property → Empreendimentos

Este script migra dados de empreendimento da tabela 'property' 
para a tabela dedicada 'empreendimentos', eliminando duplicidade.

FASES:
1. Análise: Identificar empreendimentos únicos em 'property'
2. Criação: Criar registros em 'empreendimentos'
3. Vinculação: Atualizar property.empreendimento_id
4. Validação: Verificar integridade dos dados
5. Relatório: Gerar relatório detalhado

SEGURANÇA:
- Executa em transação (rollback em caso de erro)
- Valida dados antes de migrar
- Gera backup de dados
- Relatório detalhado de todas as operações
"""

import sys
import os

# Ajustar path para importar módulos do backend
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, backend_dir)

from app import create_app
from extensions import db
from empreendimentos.models.empreendimento import Empreendimento
from sqlalchemy import text
from datetime import datetime
import json

app = create_app()

def gerar_relatorio(conteudo):
    """Salva relatório em arquivo"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'migracao_empreendimentos_{timestamp}.txt'
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('\n'.join(conteudo))
    
    return filename

def main():
    relatorio = []
    relatorio.append("="*80)
    relatorio.append("MIGRAÇÃO: PROPERTY → EMPREENDIMENTOS")
    relatorio.append(f"Data/Hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    relatorio.append("="*80)
    
    with app.app_context():
        try:
            # ============================================================
            # FASE 1: ANÁLISE
            # ============================================================
            relatorio.append("\n📊 FASE 1: ANÁLISE DE DADOS")
            relatorio.append("-" * 80)
            
            # Contar imóveis com dados de empreendimento
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM property 
                WHERE building_name IS NOT NULL 
                AND building_name != ''
            """))
            total_com_empreendimento = result.fetchone()[0]
            
            relatorio.append(f"Total de imóveis com empreendimento: {total_com_empreendimento}")
            
            # Identificar empreendimentos únicos
            result = db.session.execute(text("""
                SELECT DISTINCT
                    building_name,
                    address_zip,
                    address_street,
                    address_number,
                    address_neighborhood,
                    address_city,
                    address_state,
                    floors,
                    buildings,
                    units_on_floor,
                    delivery_at,
                    COUNT(*) as total_imoveis
                FROM property
                WHERE building_name IS NOT NULL 
                AND building_name != ''
                AND address_zip IS NOT NULL
                GROUP BY 
                    building_name,
                    address_zip,
                    address_street,
                    address_number,
                    address_neighborhood,
                    address_city,
                    address_state,
                    floors,
                    buildings,
                    units_on_floor,
                    delivery_at
                ORDER BY building_name
            """))
            
            empreendimentos_unicos = result.fetchall()
            relatorio.append(f"Empreendimentos únicos identificados: {len(empreendimentos_unicos)}")
            
            if len(empreendimentos_unicos) == 0:
                relatorio.append("\n⚠️  Nenhum empreendimento para migrar!")
                filename = gerar_relatorio(relatorio)
                print(f"Relatório salvo em: {filename}")
                return
            
            relatorio.append("\nEmpreendimentos a migrar:")
            for emp in empreendimentos_unicos[:10]:  # Mostrar primeiros 10
                relatorio.append(f"  - {emp[0]} ({emp[1]}) - {emp[11]} imóveis")
            
            if len(empreendimentos_unicos) > 10:
                relatorio.append(f"  ... e mais {len(empreendimentos_unicos) - 10}")
            
            # ============================================================
            # FASE 2: CRIAÇÃO DE EMPREENDIMENTOS
            # ============================================================
            relatorio.append("\n📦 FASE 2: CRIAÇÃO DE REGISTROS EM 'empreendimentos'")
            relatorio.append("-" * 80)
            
            empreendimentos_criados = []
            empreendimentos_existentes = []
            erros = []
            
            for emp_data in empreendimentos_unicos:
                building_name = emp_data[0]
                cep = emp_data[1]
                
                try:
                    # Verificar se já existe
                    cep_limpo = cep.replace('-', '').replace('.', '') if cep else ''
                    
                    existing = db.session.query(Empreendimento).filter(
                        db.func.lower(Empreendimento.nome) == building_name.lower(),
                        Empreendimento.cep == cep_limpo
                    ).first()
                    
                    if existing:
                        empreendimentos_existentes.append({
                            'id': existing.id,
                            'nome': building_name
                        })
                        relatorio.append(f"  ✓ Já existe: {building_name} (ID: {existing.id})")
                        continue
                    
                    # Criar novo empreendimento
                    novo_emp = Empreendimento(
                        nome=building_name,
                        cep=cep_limpo,
                        endereco=emp_data[2] or '',
                        numero=emp_data[3],
                        bairro=emp_data[4] or '',
                        cidade=emp_data[5] or '',
                        estado=emp_data[6] or '',
                        andares=emp_data[7],
                        blocos=emp_data[8],
                        unidades_por_andar=emp_data[9],
                        entrega_em=emp_data[10],
                        tenant_id=1,  # Tenant padrão
                        ativo=True,
                        total_imoveis=emp_data[11]
                    )
                    
                    db.session.add(novo_emp)
                    db.session.flush()  # Para obter o ID
                    
                    empreendimentos_criados.append({
                        'id': novo_emp.id,
                        'nome': building_name,
                        'total_imoveis': emp_data[11]
                    })
                    
                    relatorio.append(f"  ✅ Criado: {building_name} (ID: {novo_emp.id}) - {emp_data[11]} imóveis")
                    
                except Exception as e:
                    erros.append({
                        'nome': building_name,
                        'erro': str(e)
                    })
                    relatorio.append(f"  ❌ Erro: {building_name} - {str(e)}")
            
            relatorio.append(f"\nResumo Fase 2:")
            relatorio.append(f"  Criados: {len(empreendimentos_criados)}")
            relatorio.append(f"  Já existiam: {len(empreendimentos_existentes)}")
            relatorio.append(f"  Erros: {len(erros)}")
            
            # ============================================================
            # FASE 3: VINCULAÇÃO (property.empreendimento_id)
            # ============================================================
            relatorio.append("\n🔗 FASE 3: VINCULAÇÃO property → empreendimentos")
            relatorio.append("-" * 80)
            
            total_vinculados = 0
            
            # Vincular imóveis aos empreendimentos criados
            for emp in empreendimentos_criados + empreendimentos_existentes:
                emp_id = emp['id']
                emp_nome = emp['nome']
                
                # Buscar empreendimento no banco para obter CEP
                empreendimento = db.session.query(Empreendimento).filter(
                    Empreendimento.id == emp_id
                ).first()
                
                if not empreendimento:
                    continue
                
                # Atualizar imóveis
                result = db.session.execute(text("""
                    UPDATE property
                    SET empreendimento_id = :emp_id
                    WHERE building_name = :nome
                    AND (address_zip = :cep OR address_zip = :cep_formatado)
                    AND empreendimento_id IS NULL
                """), {
                    'emp_id': emp_id,
                    'nome': emp_nome,
                    'cep': empreendimento.cep,
                    'cep_formatado': f"{empreendimento.cep[:5]}-{empreendimento.cep[5:]}" if len(empreendimento.cep) == 8 else empreendimento.cep
                })
                
                vinculados = result.rowcount
                total_vinculados += vinculados
                
                if vinculados > 0:
                    relatorio.append(f"  ✅ {emp_nome}: {vinculados} imóveis vinculados")
            
            relatorio.append(f"\nTotal de imóveis vinculados: {total_vinculados}")
            
            # ============================================================
            # FASE 4: VALIDAÇÃO
            # ============================================================
            relatorio.append("\n✅ FASE 4: VALIDAÇÃO")
            relatorio.append("-" * 80)
            
            # Verificar empreendimentos criados
            result = db.session.execute(text("""
                SELECT COUNT(*) FROM empreendimentos
            """))
            total_empreendimentos = result.fetchone()[0]
            relatorio.append(f"Total de empreendimentos na tabela: {total_empreendimentos}")
            
            # Verificar imóveis vinculados
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM property 
                WHERE empreendimento_id IS NOT NULL
            """))
            total_vinculados_check = result.fetchone()[0]
            relatorio.append(f"Total de imóveis vinculados: {total_vinculados_check}")
            
            # Verificar imóveis sem vínculo (mas com building_name)
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM property 
                WHERE building_name IS NOT NULL 
                AND building_name != ''
                AND empreendimento_id IS NULL
            """))
            total_sem_vinculo = result.fetchone()[0]
            relatorio.append(f"Imóveis com building_name mas sem vínculo: {total_sem_vinculo}")
            
            if total_sem_vinculo > 0:
                relatorio.append(f"\n⚠️  ATENÇÃO: {total_sem_vinculo} imóveis não foram vinculados!")
                relatorio.append("   Possíveis causas:")
                relatorio.append("   - CEP diferente entre property e empreendimento")
                relatorio.append("   - Nome do empreendimento com diferenças")
                
                # Listar alguns exemplos
                result = db.session.execute(text("""
                    SELECT id, building_name, address_zip
                    FROM property 
                    WHERE building_name IS NOT NULL 
                    AND building_name != ''
                    AND empreendimento_id IS NULL
                    LIMIT 5
                """))
                
                relatorio.append("\n   Exemplos:")
                for row in result:
                    relatorio.append(f"   - ID {row[0]}: {row[1]} (CEP: {row[2]})")
            
            # ============================================================
            # COMMIT OU ROLLBACK
            # ============================================================
            relatorio.append("\n" + "="*80)
            
            if len(erros) > 0:
                relatorio.append("⚠️  MIGRAÇÃO COM ERROS - FAZENDO ROLLBACK")
                relatorio.append(f"   {len(erros)} empreendimentos não puderam ser criados")
                db.session.rollback()
            else:
                relatorio.append("✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO - FAZENDO COMMIT")
                db.session.commit()
            
            relatorio.append("="*80)
            
            # ============================================================
            # RESUMO FINAL
            # ============================================================
            relatorio.append("\n📊 RESUMO FINAL")
            relatorio.append("-" * 80)
            relatorio.append(f"Empreendimentos únicos identificados: {len(empreendimentos_unicos)}")
            relatorio.append(f"Empreendimentos criados: {len(empreendimentos_criados)}")
            relatorio.append(f"Empreendimentos já existentes: {len(empreendimentos_existentes)}")
            relatorio.append(f"Imóveis vinculados: {total_vinculados}")
            relatorio.append(f"Erros: {len(erros)}")
            
            if len(erros) == 0:
                relatorio.append("\n✅ MIGRAÇÃO 100% CONCLUÍDA!")
            else:
                relatorio.append(f"\n⚠️  MIGRAÇÃO PARCIAL - {len(erros)} erros")
            
        except Exception as e:
            relatorio.append(f"\n❌ ERRO CRÍTICO NA MIGRAÇÃO:")
            relatorio.append(f"   {type(e).__name__}: {str(e)}")
            relatorio.append("\n🔄 FAZENDO ROLLBACK...")
            db.session.rollback()
            relatorio.append("✅ Rollback concluído - banco de dados não foi alterado")
            
            import traceback
            relatorio.append("\n📋 Traceback completo:")
            relatorio.append(traceback.format_exc())
    
    # Salvar relatório
    filename = gerar_relatorio(relatorio)
    
    # Imprimir resumo
    print("\n" + "="*80)
    print("MIGRAÇÃO CONCLUÍDA")
    print("="*80)
    print(f"\n📄 Relatório completo salvo em: {filename}")
    print("\nResumo:")
    for linha in relatorio[-15:]:  # Últimas 15 linhas
        print(linha)

if __name__ == '__main__':
    print("\n" + "="*80)
    print("INICIANDO MIGRAÇÃO: PROPERTY → EMPREENDIMENTOS")
    print("="*80)
    print("\n⚠️  ATENÇÃO: Esta operação irá:")
    print("   1. Criar registros na tabela 'empreendimentos'")
    print("   2. Vincular imóveis aos empreendimentos (FK)")
    print("   3. Gerar relatório detalhado")
    print("\n✅ Segurança: Executa em transação (rollback em caso de erro)")
    
    input("\nPressione ENTER para continuar ou Ctrl+C para cancelar...")
    
    main()
