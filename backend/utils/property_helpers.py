"""
Funções auxiliares para identificação de imóveis na API Gandalf
"""

def get_property_identifier(prop):
    """
    Retorna o identificador preferido para usar na API Gandalf
    Prioriza property_code (ex: AP7571-1), mas faz fallback para external_id
    
    Args:
        prop: Objeto Property do banco de dados
        
    Returns:
        str: Identificador a ser usado na API (property_code ou external_id)
    """
    if prop.property_code:
        return prop.property_code
    return prop.external_id

def get_property_identifier_by_external_id(external_id):
    """
    Busca um imóvel pelo external_id e retorna o identificador preferido
    Útil quando só temos o external_id como parâmetro
    
    Args:
        external_id: ID externo do imóvel
        
    Returns:
        str: Identificador a ser usado na API (property_code ou external_id)
    """
    from models import Property
    from flask import g
    
    prop = Property.query.filter_by(
        external_id=external_id, 
        tenant_id=g.tenant_id
    ).first()
    
    if prop and prop.property_code:
        return prop.property_code
    return external_id
