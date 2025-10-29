"""
Utilitários para cálculo de agendamento de execução em UTC
"""
from datetime import datetime, timedelta
import pytz  # pylint: disable=import-error

def calculate_next_run(schedule):
    """
    Calcula a próxima execução baseado no time_slot, frequency_days e days_of_week
    schedule: objeto com atributos:
        - time_slot (datetime.time): horário de execução
        - frequency_days (int): intervalo mínimo em dias
        - days_of_week (list[int]): dias da semana permitidos (0=Domingo, 1=Segunda, ..., 6=Sábado)
    
    Sempre retorna o horário em UTC.
    """
    # Timezone do usuário
    local_tz = pytz.timezone('America/Sao_Paulo')
    now_utc = datetime.now(pytz.utc).replace(second=0, microsecond=0)
    now_local = datetime.now(local_tz).replace(second=0, microsecond=0)
    
    # Monta o horário de execução local para hoje
    today_execution_local = local_tz.localize(
        datetime.combine(now_local.date(), schedule.time_slot)
    )
    # Converte para UTC
    today_execution_utc = today_execution_local.astimezone(pytz.utc)
    
    # Se ainda não passou o horário de hoje, começar de hoje
    if today_execution_utc >= now_utc:
        candidate = today_execution_utc
    else:
        # Já passou, começar de amanhã
        candidate = today_execution_utc + timedelta(days=1)
    
    # Se não há restrição de dias da semana, retornar o candidato
    if not schedule.days_of_week or len(schedule.days_of_week) == 0:
        return candidate.replace(tzinfo=pytz.utc)
    
    # Converter candidate para local para verificar dia da semana
    # Python weekday(): 0=Monday, 6=Sunday
    # Nossa convenção: 0=Domingo, 1=Segunda, ..., 6=Sábado
    # Conversão: python_weekday 0-6 (Mon-Sun) -> nossa convenção 1-7,0 (Mon-Sat,Sun)
    max_attempts = 14  # Evitar loop infinito (2 semanas devem cobrir qualquer caso)
    attempts = 0
    
    while attempts < max_attempts:
        candidate_local = candidate.astimezone(local_tz)
        python_weekday = candidate_local.weekday()  # 0=Monday, 6=Sunday
        
        # Converter para nossa convenção: 0=Domingo, 1=Segunda, ..., 6=Sábado
        # Python: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
        # Nossa:  Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
        if python_weekday == 6:  # Sunday em Python
            our_weekday = 0  # Domingo na nossa convenção
        else:
            our_weekday = python_weekday + 1  # Segunda=1, ..., Sábado=6
        
        # Verificar se este dia está na lista permitida
        if our_weekday in schedule.days_of_week:
            # Encontrou um dia válido!
            return candidate.replace(tzinfo=pytz.utc)
        
        # Não é um dia permitido, avançar 1 dia
        candidate = candidate + timedelta(days=1)
        attempts += 1
    
    # Fallback: se não encontrou em 14 dias, retornar o candidato atual
    # (não deveria acontecer se days_of_week for válido)
    return candidate.replace(tzinfo=pytz.utc)
