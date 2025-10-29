#!/usr/bin/env python3
"""
Exemplo de uso dos utilitários de endereço.

Este script demonstra como usar as funções de validação e formatação
de endereços implementadas no utils/address_utils.py
"""

import sys
from pathlib import Path

# Adicionar o diretório backend ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from utils.address_utils import (
    validate_and_format_zip_code,
    extract_address_components,
    format_address_display,
    normalize_address_field
)

def demo_zip_validation():
    """Demonstra a validação e formatação de CEP."""
    print("🔍 Validação de CEP:")
    print("-" * 40)

    test_zips = [
        "12345-678",  # Válido
        "12345678",   # Válido sem formatação
        "12345",      # Inválido - muito curto
        "123456789",  # Inválido - muito longo
        "abc12345",   # Válido após limpeza
        "",           # Vazio
        None          # None
    ]

    for zip_code in test_zips:
        is_valid, formatted = validate_and_format_zip_code(zip_code)
        status = "✅ Válido" if is_valid else "❌ Inválido"
        print(f"'{zip_code}' → {status}: {formatted}")

def demo_address_extraction():
    """Demonstra a extração de componentes de endereço."""
    print("\n🏠 Extração de Componentes de Endereço:")
    print("-" * 50)

    test_addresses = [
        "Rua das Flores, 123 - Centro, São Paulo - SP, 01234-567",
        "Av. Paulista, 1000, Bela Vista, São Paulo/SP - CEP: 01310-100",
        "Praça da Sé, s/n - Sé - São Paulo - SP 01001-000",
        "Rua XV de Novembro, 1500 - Centro Histórico - Curitiba - PR"
    ]

    for addr in test_addresses:
        print(f"\n📍 Endereço: {addr}")
        components = extract_address_components(addr)

        for key, value in components.items():
            if value:
                print(f"  {key.capitalize()}: {value}")

def demo_address_formatting():
    """Demonstra a formatação de endereço para exibição."""
    print("\n📋 Formatação de Endereço para Exibição:")
    print("-" * 45)

    test_cases = [
        {
            'street': 'Rua das Flores',
            'number': '123',
            'complement': 'Apto 45',
            'neighborhood': 'Centro',
            'city': 'São Paulo',
            'state': 'SP'
        },
        {
            'street': 'Av. Paulista',
            'number': '1000',
            'neighborhood': 'Bela Vista',
            'city': 'São Paulo',
            'state': 'SP'
        },
        {
            'street': 'Praça da Sé',
            'number': 's/n',
            'neighborhood': 'Sé',
            'city': 'São Paulo',
            'state': 'SP'
        }
    ]

    for case in test_cases:
        formatted = format_address_display(**case)
        print(f"📍 {formatted}")

def demo_field_normalization():
    """Demonstra a normalização de campos de endereço."""
    print("\n🔤 Normalização de Campos:")
    print("-" * 35)

    test_fields = [
        "rua das flores",           # Deve capitalizar
        "AVENIDA PAULISTA",         # Deve capitalizar
        "praça da sé",              # Deve capitalizar
        "RUA XV DE NOVEMBRO",       # Deve manter maiúsculo apenas primeira letra
        "são paulo",                # Deve capitalizar
        "CENTRO HISTÓRICO",         # Deve manter maiúsculo apenas primeira letra
        "",                         # Deve retornar None
        None                        # Deve retornar None
    ]

    for field in test_fields:
        normalized = normalize_address_field(field)
        print(f"'{field}' → '{normalized}'")

def main():
    """Executa todas as demonstrações."""
    print("🎯 Demonstração dos Utilitários de Endereço")
    print("=" * 50)

    demo_zip_validation()
    demo_address_extraction()
    demo_address_formatting()
    demo_field_normalization()

    print("\n" + "=" * 50)
    print("✅ Demonstração concluída!")
    print("\n💡 Estes utilitários podem ser usados para:")
    print("  • Validar CEPs antes de salvar no banco")
    print("  • Extrair componentes de endereços completos")
    print("  • Formatar endereços para exibição amigável")
    print("  • Normalizar campos de endereço para consistência")

if __name__ == "__main__":
    main()
