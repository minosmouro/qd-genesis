"""
Teste da refatoração - Verifica se os novos services funcionam
"""
import sys
import os
import pytest

# Adicionar o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

def test_imports():
    """Testa se todos os módulos podem ser importados"""
    try:
        # Testar services
        from properties.services.import_service import ImportService
        from properties.services.bulk_service import BulkService
        from properties.services.validation_service import ValidationService
        print("✅ Services importados com sucesso")

        # Testar validators
        from properties.validators.bulk_validator import BulkValidator
        from properties.validators.import_validator import ImportValidator
        print("✅ Validators importados com sucesso")

        # Testar mappers
        from properties.mappers.property_mapper import PropertyMapper
        print("✅ Mappers importados com sucesso")

        # Testar routes
        from properties.routes.import_routes import create_import_routes
        from properties.routes.bulk_routes import create_bulk_routes
        print("✅ Routes importados com sucesso")

        # Testar blueprint principal
        from properties import properties_bp
        print("✅ Properties blueprint importado com sucesso")
    except Exception as e:
        pytest.fail(f"❌ Erro na importação: {e}")

def test_validators():
    """Testa os validators"""
    try:
        from properties.validators.bulk_validator import BulkValidator
        from properties.validators.import_validator import ImportValidator

        # Testar BulkValidator
        is_valid, error = BulkValidator.validate_delete_request([1, 2, 3])
        assert is_valid, f"BulkValidator falhou: {error}"
        print("✅ BulkValidator funcionando")

        # Testar ImportValidator
        is_valid, error = ImportValidator.validate_import_payload({
            'external_id': 'TEST123',
            'title': 'Test Property'
        })
        assert is_valid, f"ImportValidator falhou: {error}"
        print("✅ ImportValidator funcionando")
    except Exception as e:
        pytest.fail(f"❌ Erro nos validators: {e}")

def test_mapper():
    """Testa o PropertyMapper"""
    try:
        from properties.mappers.property_mapper import PropertyMapper

        # Testar simulate_mapping
        listing = {
            'externalId': 'TEST123',
            'title': 'Test Property',
            'address': {'street': 'Test St'},
            'pricingInfos': [{'price': 100000}]
        }

        result = PropertyMapper.simulate_mapping(listing)
        assert result['external_id'] == 'TEST123'
        assert result['title'] == 'Test Property'
        print("✅ PropertyMapper funcionando")
    except Exception as e:
        pytest.fail(f"❌ Erro no mapper: {e}")

if __name__ == "__main__":
    print("🚀 Testando refatoração do módulo Properties")
    print("=" * 50)

    success = True

    print("\n📦 Testando imports...")
    try:
        test_imports()
    except Exception as exc:  # pragma: no cover - apenas execução manual
        print(exc)
        success = False

    print("\n🔍 Testando validators...")
    try:
        test_validators()
    except Exception as exc:  # pragma: no cover - apenas execução manual
        print(exc)
        success = False

    print("\n🗺️  Testando mapper...")
    try:
        test_mapper()
    except Exception as exc:  # pragma: no cover - apenas execução manual
        print(exc)
        success = False

    print("\n" + "=" * 50)
    if success:
        print("🎉 Todos os testes passaram! Refatoração bem-sucedida.")
    else:
        print("❌ Alguns testes falharam. Verifique os erros acima.")
        sys.exit(1)
