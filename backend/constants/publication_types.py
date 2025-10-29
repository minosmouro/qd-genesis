"""
Constantes para tipos de publicação do CanalPro/Gandalf.

Este módulo centraliza todas as definições relacionadas aos tipos de
publicação (destaques) para evitar duplicação e garantir consistência.
"""

# Tipos de publicação válidos aceitos pelo sistema
VALID_PUBLICATION_TYPES = {
    'STANDARD',       # Padrão (sem destaque)
    'PREMIUM',        # Destaque principal
    'SUPER_PREMIUM',  # Super destaque
    'PREMIERE_1',     # Destaque Exclusivo (tier 1)
    'PREMIERE_2',     # Destaque Superior (tier 2)
    'TRIPLE'          # Destaque Triplo
}

# Valor padrão quando nenhum tipo é especificado
DEFAULT_PUBLICATION_TYPE = 'STANDARD'

# Mapeamento de aliases/sinônimos para os valores padrão
# Permite aceitar diferentes variações de entrada e normalizar para os valores oficiais
PUBLICATION_TYPE_ALIASES = {
    # Variações de STANDARD
    'PADRAO': 'STANDARD',
    'PADRÃO': 'STANDARD',
    
    # Variações de PREMIUM
    'DESTAQUE_PADRAO': 'PREMIUM',
    'DESTAQUE_PADRÃO': 'PREMIUM',
    'DESTAQUE': 'PREMIUM',
    'DESTAQUE_PREMIUM': 'PREMIUM',
    
    # Variações de SUPER_PREMIUM
    'SUPER_DESTAQUE': 'SUPER_PREMIUM',
    'SUPER-DESTAQUE': 'SUPER_PREMIUM',
    'SUPERDESTAQUE': 'SUPER_PREMIUM',
    
    # Variações de PREMIERE_1
    'EXCLUSIVO': 'PREMIERE_1',
    'DESTAQUE_EXCLUSIVO': 'PREMIERE_1',
    'PREMIERE1': 'PREMIERE_1',
    
    # Variações de PREMIERE_2
    'SUPERIOR': 'PREMIERE_2',
    'DESTAQUE_SUPERIOR': 'PREMIERE_2',
    'PREMIERE2': 'PREMIERE_2',
    
    # Variações de TRIPLE
    'TRIPLO': 'TRIPLE',
    'DESTAQUE_TRIPLO': 'TRIPLE'
}

# Labels amigáveis para exibição (mapeamento interno/oficial → nome amigável)
PUBLICATION_TYPE_LABELS = {
    'STANDARD': 'Padrão',
    'PREMIUM': 'Destaque',
    'SUPER_PREMIUM': 'Super Destaque',
    'PREMIERE_1': 'Destaque Exclusivo',
    'PREMIERE_2': 'Destaque Superior',
    'TRIPLE': 'Destaque Triplo'
}


def normalize_publication_type(value: str) -> str:
    """
    Normaliza um tipo de publicação para o valor padrão oficial.
    
    Args:
        value: Valor a ser normalizado (pode ser um alias ou valor oficial)
    
    Returns:
        Valor oficial normalizado
    
    Raises:
        ValueError: Se o valor não for válido
    
    Examples:
        >>> normalize_publication_type('destaque')
        'PREMIUM'
        >>> normalize_publication_type('SUPER-DESTAQUE')
        'SUPER_PREMIUM'
        >>> normalize_publication_type('PREMIUM')
        'PREMIUM'
    """
    if not value or not isinstance(value, str):
        return DEFAULT_PUBLICATION_TYPE
    
    # Normalizar: upper case, remover espaços extras, substituir espaços por underscores
    normalized = value.strip().upper().replace(' ', '_')
    
    # Verificar se é um alias conhecido
    normalized = PUBLICATION_TYPE_ALIASES.get(normalized, normalized)
    
    # Verificar se o valor final é válido
    if normalized not in VALID_PUBLICATION_TYPES:
        raise ValueError(
            f"Invalid publication_type: '{value}'. "
            f"Valid values are: {', '.join(sorted(VALID_PUBLICATION_TYPES))}"
        )
    
    return normalized
