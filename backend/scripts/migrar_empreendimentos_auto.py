"""
MIGRAÇÃO AUTOMÁTICA: Property → Empreendimentos
(Versão sem confirmação interativa)
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

app = create_app()

def main():
    relatorio = []
    relatorio.append("="*80)
    relatorio.append("MIGRAÇÃO AUTOMÁTICA: PROPERTY → EMPREENDIMENTOS")
    relatorio.append(f"Data/Hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    relatorio.append("="*80)
    
    with app.app_context():
        try:
            # FASE 1: ANÁLISE
            relatorio.append("\n📊 FASE 1: ANÁLISE")
            relatorio.append("-" * 80)
            
            result = db.session.execute(text("""
                SELECT COUNT(*) 
                FROM property 
                WHERE building_name IS NOT NULL AND building_name != ''
            """))
            total_com_empreendimento = result.fetchone()[0]
            relatorio.append(f"Imóveis com empreendimento: {total_com_empreendimento}")
            
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
                    COUNT(*) OVER (PARTITION BY building_name, address_zip) as total_imoveis
                FROM property
                WHERE building_name IS NOT NULL 
                AND building_name != ''
                AND address_zip IS NOT NULL
                ORDER BY building_name
                LIMIT 100
            """))
            
            empreendimentos_unicos = result.fetchall()
            relatorio.append(f"Empreendimentos únicos: {len(empreendimentos_unicos)}")
            
            # FASE 2: CRIAÇÃO
            relatorio.append("\n📦 FASE 2: CRIAÇÃO")
            relatorio.append("-" * 80)
            
            criados = 0
            existentes = 0
            erros = 0
            
            for emp_data in empreendimentos_unicos:
                try:
                    building_name = emp_data[0]
                    cep = emp_data[1]
                    cep_limpo = cep.replace('-', '').replace('.', '') if cep else ''
                    
                    # Verificar se existe
                    existing = db.session.query(Empreendimento).filter(
                        db.func.lower(Empreendimento.nome) == building_name.lower(),
                        Empreendimento.cep == cep_limpo
                    ).first()
                    
                    if existing:
                        existentes += 1
                        continue
                    
                    # Criar novo
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
                        tenant_id=1,
                        ativo=True,
                        total_imoveis=0
                    )
                    
                    db.session.add(novo_emp)
                    db.session.flush()
                    criados += 1
                    relatorio.append(f"  ✅ {building_name} (ID: {novo_emp.id})")
                    
                except Exception as e:
                    erros += 1
                    relatorio.append(f"  ❌ {building_name}: {str(e)[:50]}")
            
            relatorio.append(f"\nCriados: {criados} | Existentes: {existentes} | Erros: {erros}")
            
            # FASE 3: VINCULAÇÃO
            relatorio.append("\n🔗 FASE 3: VINCULAÇÃO")
            relatorio.append("-" * 80)
            
            # Buscar todos os empreendimentos
            emps = db.session.query(Empreendimento).all()
            total_vinculados = 0
            
            for emp in emps:
                result = db.session.execute(text("""
                    UPDATE property
                    SET empreendimento_id = :emp_id
                    WHERE LOWER(building_name) = LOWER(:nome)
                    AND (address_zip = :cep OR address_zip = :cep_fmt)
                    AND empreendimento_id IS NULL
                """), {
                    'emp_id': emp.id,
                    'nome': emp.nome,
                    'cep': emp.cep,
                    'cep_fmt': f"{emp.cep[:5]}-{emp.cep[5:]}" if len(emp.cep) == 8 else emp.cep
                })
                
                vinculados = result.rowcount
                total_vinculados += vinculados
                
                if vinculados > 0:
                    relatorio.append(f"  ✅ {emp.nome}: {vinculados} imóveis")
            
            relatorio.append(f"\nTotal vinculados: {total_vinculados}")
            
            # COMMIT
            db.session.commit()
            relatorio.append("\n✅ MIGRAÇÃO CONCLUÍDA - COMMIT REALIZADO")
            
        except Exception as e:
            relatorio.append(f"\n❌ ERRO: {str(e)}")
            db.session.rollback()
            relatorio.append("🔄 ROLLBACK REALIZADO")
            import traceback
            relatorio.append(traceback.format_exc())
    
    # Salvar relatório
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'migracao_{timestamp}.txt'
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('\n'.join(relatorio))
    
    # Imprimir
    for linha in relatorio:
        print(linha)
    
    print(f"\n📄 Relatório: {filename}")

if __name__ == '__main__':
    main()
