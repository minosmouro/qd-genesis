"""Utilitários para validação e formatação de endereços."""

import re
from typing import Optional, Tuple


def validate_and_format_zip_code(zip_code: str) -> Tuple[bool, Optional[str]]:
    """Valida e formata um CEP brasileiro.

    Args:
        zip_code: CEP a ser validado (com ou sem formatação)

    Returns:
        Tuple: (is_valid, formatted_zip_code)
    """
    if not zip_code:
        return False, None

    # Remove caracteres não numéricos
    clean_zip = re.sub(r'\D', '', zip_code)

    # CEP deve ter exatamente 8 dígitos
    if len(clean_zip) != 8:
        return False, None

    # Formata como XXXXX-XXX
    formatted = f"{clean_zip[:5]}-{clean_zip[5:]}"

    return True, formatted


def extract_address_components(address_string: str) -> dict:
    """Extrai componentes de endereço de uma string completa.

    Args:
        address_string: String completa do endereço

    Returns:
        Dict com componentes extraídos
    """
    components = {
        'street': None,
        'number': None,
        'complement': None,
        'neighborhood': None,
        'city': None,
        'state': None,
        'zip_code': None
    }

    if not address_string:
        return components

    # Padrões comuns de endereço brasileiro
    patterns = {
        'zip_code': r'\b\d{5}-?\d{3}\b',
        'street_number': r'\b\d+[A-Za-z]?\b(?=\s*,|\s*$)',
        'neighborhood': r'(?:Bairro|Bairro:|B\.)\s*([^\n\r,]+)',
        'city_state': r'([^\n\r,]+?)\s*[-/]\s*([A-Z]{2})\b'
    }

    # Extrair CEP
    zip_match = re.search(patterns['zip_code'], address_string)
    if zip_match:
        is_valid, formatted = validate_and_format_zip_code(zip_match.group())
        if is_valid:
            components['zip_code'] = formatted

    # Extrair número
    number_match = re.search(patterns['street_number'], address_string)
    if number_match:
        components['number'] = number_match.group()

    # Extrair bairro
    neighborhood_match = re.search(patterns['neighborhood'], address_string, re.IGNORECASE)
    if neighborhood_match:
        components['neighborhood'] = neighborhood_match.group(1).strip()

    # Extrair cidade/estado
    city_state_match = re.search(patterns['city_state'], address_string)
    if city_state_match:
        components['city'] = city_state_match.group(1).strip()
        components['state'] = city_state_match.group(2).strip()

    # O restante é provavelmente a rua
    # Remove os componentes já extraídos e limpa
    remaining = address_string
    if components['zip_code']:
        remaining = remaining.replace(components['zip_code'], '')
    if components['number']:
        remaining = remaining.replace(components['number'], '')
    if components['neighborhood']:
        remaining = remaining.replace(neighborhood_match.group(), '')
    if components['city'] and components['state']:
        remaining = remaining.replace(city_state_match.group(), '')

    # Limpa caracteres especiais e espaços extras
    remaining = re.sub(r'[,\n\r]+', ' ', remaining)
    remaining = re.sub(r'\s+', ' ', remaining).strip()

    if remaining and not any(word in remaining.lower() for word in ['bairro', 'cep', 'cidade']):
        components['street'] = remaining

    return components


def format_address_display(street: str, number: str, complement: str = None,
                          neighborhood: str = None, city: str = None,
                          state: str = None) -> str:
    """Formata um endereço para exibição amigável.

    Args:
        street: Nome da rua
        number: Número
        complement: Complemento (opcional)
        neighborhood: Bairro (opcional)
        city: Cidade (opcional)
        state: Estado (opcional)

    Returns:
        String formatada do endereço
    """
    parts = []

    if street:
        parts.append(street)

    if number:
        parts.append(number)

    if complement:
        parts.append(f"({complement})")

    if neighborhood:
        parts.append(f"- {neighborhood}")

    if city and state:
        parts.append(f"{city}/{state}")
    elif city:
        parts.append(city)
    elif state:
        parts.append(state)

    return ", ".join(parts) if parts else ""


def normalize_address_field(value: str) -> Optional[str]:
    """Normaliza um campo de endereço (capitaliza corretamente).

    Args:
        value: Valor a ser normalizado

    Returns:
        Valor normalizado ou None se vazio
    """
    if not value:
        return None

    # Remove espaços extras
    normalized = " ".join(value.split())

    if not normalized:
        return None

    # Capitaliza palavras (exceto preposições comuns)
    words = normalized.split()
    prepositions = {'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os'}

    capitalized_words = []
    for i, word in enumerate(words):
        if i == 0 or word.lower() not in prepositions:
            capitalized_words.append(word.capitalize())
        else:
            capitalized_words.append(word.lower())

    return " ".join(capitalized_words)
