"""
Validators para refresh schedule requests
"""
import re
from typing import Tuple, Dict, Any


class RefreshScheduleValidator:
    """Validadores para requisições de refresh schedule"""

    @staticmethod
    def validate_create_request(data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Valida requisição de criação de refresh schedule
        
        Args:
            data: Dados da requisição
            
        Returns:
            Tuple[bool, str]: (é_válido, mensagem_erro)
        """
        if not data:
            return False, 'Request body is required'
        
        # Nome obrigatório
        if 'name' not in data or not data['name']:
            return False, 'name is required'
        
        name = data['name'].strip()
        if len(name) < 1 or len(name) > 100:
            return False, 'name must be between 1 and 100 characters'
        
        # time_slot obrigatório
        if 'time_slot' not in data or not data['time_slot']:
            return False, 'time_slot is required'
        
        # Validar formato do horário
        is_valid_time, time_error = RefreshScheduleValidator._validate_time_format(data['time_slot'])
        if not is_valid_time:
            return False, time_error
        
        # frequency_days opcional, mas deve ser válido se fornecido
        if 'frequency_days' in data:
            freq = data['frequency_days']
            if not isinstance(freq, int) or freq < 1 or freq > 365:
                return False, 'frequency_days must be an integer between 1 and 365'
        
        # property_ids OBRIGATÓRIO - seleção de imóveis é obrigatória
        if 'property_ids' not in data:
            return False, 'É necessário selecionar ao menos um imóvel para o agendamento'
        
        prop_ids = data['property_ids']
        if not isinstance(prop_ids, list):
            return False, 'property_ids must be a list'
        
        if not prop_ids:  # Lista vazia
            return False, 'É necessário selecionar ao menos um imóvel para o agendamento'
        
        if len(prop_ids) > 100:
            return False, 'Maximum 100 properties allowed per schedule'
        
        for prop_id in prop_ids:
            if not isinstance(prop_id, int) or prop_id <= 0:
                return False, 'All property_ids must be positive integers'
        
        # Verificar duplicatas
        if len(set(prop_ids)) != len(prop_ids):
            return False, 'Duplicate property_ids not allowed'
        
        # days_of_week opcional, mas deve ser válido se fornecido
        if 'days_of_week' in data:
            days = data['days_of_week']
            if not isinstance(days, list):
                return False, 'days_of_week must be a list'
            if not all(isinstance(day, int) and 0 <= day <= 6 for day in days):
                return False, 'days_of_week must contain integers from 0 (Dom) a 6 (Sáb)'
        
        return True, ''

    @staticmethod
    def validate_update_request(data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Valida requisição de atualização de refresh schedule
        
        Args:
            data: Dados da requisição
            
        Returns:
            Tuple[bool, str]: (é_válido, mensagem_erro)
        """
        if not data:
            return False, 'Request body is required'
        
        # Pelo menos um campo deve ser fornecido
        allowed_fields = ['name', 'time_slot', 'frequency_days', 'is_active']
        if not any(field in data for field in allowed_fields):
            return False, f'At least one of {allowed_fields} must be provided'
        
        # Validar nome se fornecido
        if 'name' in data:
            if not data['name']:
                return False, 'name cannot be empty'
            
            name = data['name'].strip()
            if len(name) < 1 or len(name) > 100:
                return False, 'name must be between 1 and 100 characters'
        
        # Validar time_slot se fornecido
        if 'time_slot' in data:
            if not data['time_slot']:
                return False, 'time_slot cannot be empty'
            
            is_valid_time, time_error = RefreshScheduleValidator._validate_time_format(data['time_slot'])
            if not is_valid_time:
                return False, time_error
        
        # Validar frequency_days se fornecido
        if 'frequency_days' in data:
            freq = data['frequency_days']
            if not isinstance(freq, int) or freq < 1 or freq > 365:
                return False, 'frequency_days must be an integer between 1 and 365'
        
        # Validar is_active se fornecido
        if 'is_active' in data:
            if not isinstance(data['is_active'], bool):
                return False, 'is_active must be a boolean'
        
        # days_of_week opcional, mas deve ser válido se fornecido
        if 'days_of_week' in data:
            days = data['days_of_week']
            if not isinstance(days, list):
                return False, 'days_of_week must be a list'
            if not all(isinstance(day, int) and 0 <= day <= 6 for day in days):
                return False, 'days_of_week must contain integers from 0 (Dom) a 6 (Sáb)'
        
        return True, ''

    @staticmethod
    def _validate_time_format(time_str: str) -> Tuple[bool, str]:
        """
        Valida formato de horário HH:MM
        
        Args:
            time_str: String do horário
            
        Returns:
            Tuple[bool, str]: (é_válido, mensagem_erro)
        """
        if not isinstance(time_str, str):
            return False, 'time_slot must be a string'
        
        # Verificar formato HH:MM
        if not re.match(r'^\d{1,2}:\d{2}$', time_str):
            return False, 'time_slot must be in HH:MM format'
        
        try:
            hour, minute = map(int, time_str.split(':'))
            
            if hour < 0 or hour > 23:
                return False, 'Hour must be between 0 and 23'
            
            if minute < 0 or minute > 59:
                return False, 'Minute must be between 0 and 59'
            
            return True, ''
            
        except (ValueError, IndexError):
            return False, 'Invalid time format. Use HH:MM'

    @staticmethod
    def validate_property_ids(property_ids: list) -> Tuple[bool, str]:
        """
        Valida lista de IDs de propriedades
        
        Args:
            property_ids: Lista de IDs
            
        Returns:
            Tuple[bool, str]: (é_válido, mensagem_erro)
        """
        if not isinstance(property_ids, list):
            return False, 'property_ids must be a list'
        
        if not property_ids:
            return False, 'property_ids cannot be empty'
        
        if len(property_ids) > 100:
            return False, 'Maximum 100 properties allowed'
        
        for prop_id in property_ids:
            if not isinstance(prop_id, int) or prop_id <= 0:
                return False, 'All property_ids must be positive integers'
        
        # Verificar duplicatas
        if len(set(property_ids)) != len(property_ids):
            return False, 'Duplicate property_ids not allowed'
        
        return True, ''

    @staticmethod
    def validate_schedule_name(name: str) -> Tuple[bool, str]:
        """
        Valida nome de schedule
        
        Args:
            name: Nome do schedule
            
        Returns:
            Tuple[bool, str]: (é_válido, mensagem_erro)
        """
        if not isinstance(name, str):
            return False, 'name must be a string'
        
        name = name.strip()
        
        if not name:
            return False, 'name cannot be empty'
        
        if len(name) > 100:
            return False, 'name cannot exceed 100 characters'
        
        # Verificar caracteres especiais problemáticos
        if re.search(r'[<>"\']', name):
            return False, 'name cannot contain < > " \' characters'
        
        return True, ''
