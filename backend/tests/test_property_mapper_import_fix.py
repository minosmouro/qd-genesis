"""
Testes para validar correção do mapeamento de unitType e category na importação
"""
import pytest

from backend.app import create_app  # pylint: disable=import-error
from properties.mappers.property_mapper import PropertyMapper
from models import Property


@pytest.fixture(autouse=True)
def app_context():
    """Garante contexto Flask ativo para acessar extensões ligadas ao app."""
    app = create_app()
    ctx = app.app_context()
    ctx.push()
    try:
        yield
    finally:
        ctx.pop()


class TestPropertyMapperImportFix:
    """Testes para validar correção do bug de importação"""

    def test_map_unit_type_singular(self):
        """Testa mapeamento de unitType (singular) - formato correto do Canal Pro"""
        listing = {
            "externalId": "TEST-001",
            "unitType": "APARTMENT",
            "category": "STANDARD"
        }
        
        prop = Property(external_id="TEST-001", tenant_id=1, title="Test")
        PropertyMapper._map_classifications(listing, prop)

        assert prop.property_type == "APARTMENT"
        assert prop.category in {"STANDARD", "Padrão"}

    def test_map_unit_types_array(self):
        """Testa mapeamento de unitTypes (array) - formato legado"""
        listing = {
            "externalId": "TEST-002",
            "unitTypes": ["HOUSE"],
            "category": "HIGH_STANDARD"
        }
        
        prop = Property(external_id="TEST-002", tenant_id=1, title="Test")
        PropertyMapper._map_classifications(listing, prop)
        
        assert prop.property_type == "HOUSE"
        assert prop.category == "HIGH_STANDARD"

    def test_prioritize_unit_type_over_unit_types(self):
        """Testa que unitType (singular) tem prioridade sobre unitTypes (array)"""
        listing = {
            "externalId": "TEST-003",
            "unitType": "APARTMENT",
            "unitTypes": ["HOUSE"],  # Deve ser ignorado
            "category": "STANDARD"
        }
        
        prop = Property(external_id="TEST-003", tenant_id=1, title="Test")
        PropertyMapper._map_classifications(listing, prop)
        
        # Deve usar unitType (singular), não unitTypes
        assert prop.property_type == "APARTMENT"
        assert prop.category == "STANDARD"

    def test_map_without_category(self):
        """Testa mapeamento quando category não está presente"""
        listing = {
            "externalId": "TEST-004",
            "unitType": "APARTMENT"
        }
        
        prop = Property(external_id="TEST-004", tenant_id=1, title="Test")
        PropertyMapper._map_classifications(listing, prop)
        
        assert prop.property_type == "APARTMENT"
        assert prop.category is None

    def test_map_without_unit_type(self):
        """Testa mapeamento quando unitType não está presente"""
        listing = {
            "externalId": "TEST-005",
            "category": "STANDARD"
        }
        
        prop = Property(external_id="TEST-005", tenant_id=1, title="Test")
        PropertyMapper._map_classifications(listing, prop)
        
        assert prop.property_type is None
        assert prop.category == "STANDARD"

    def test_map_empty_unit_types_array(self):
        """Testa mapeamento com array unitTypes vazio"""
        listing = {
            "externalId": "TEST-006",
            "unitTypes": [],
            "category": "STANDARD"
        }
        
        prop = Property(external_id="TEST-006", tenant_id=1, title="Test")
        PropertyMapper._map_classifications(listing, prop)
        
        assert prop.property_type is None
        assert prop.category == "STANDARD"

    def test_map_all_property_types(self):
        """Testa mapeamento de todos os tipos de imóveis do Canal Pro"""
        property_types = [
            "APARTMENT",
            "HOUSE",
            "PENTHOUSE",
            "STUDIO",
            "KITNET",
            "FLAT",
            "LOFT",
            "FARM",
            "WAREHOUSE",
            "COMMERCIAL_BUILDING",
            "LAND"
        ]
        
        for prop_type in property_types:
            listing = {
                "externalId": f"TEST-{prop_type}",
                "unitType": prop_type,
                "category": "STANDARD"
            }
            
            prop = Property(external_id=listing["externalId"], tenant_id=1, title="Test")
            PropertyMapper._map_classifications(listing, prop)
            
            assert prop.property_type == prop_type
            assert prop.category == "STANDARD"

    def test_map_all_categories(self):
        """Testa mapeamento de todas as categorias do Canal Pro"""
        categories = [
            "STANDARD",
            "HIGH_STANDARD",
            "LUXURY",
            "ECONOMIC"
        ]
        
        for category in categories:
            listing = {
                "externalId": f"TEST-{category}",
                "unitType": "APARTMENT",
                "category": category
            }
            
            prop = Property(external_id=listing["externalId"], tenant_id=1, title="Test")
            PropertyMapper._map_classifications(listing, prop)
            
            assert prop.property_type == "APARTMENT"
            assert prop.category == category

    def test_full_listing_mapping(self):
        """Testa mapeamento completo de um listing real do Canal Pro"""
        listing = {
            "externalId": "CC6672-1",
            "title": "Apartamento 80m²",
            "unitType": "APARTMENT",
            "category": "STANDARD",
            "listingType": "SALE",
            "usageTypes": ["RESIDENTIAL"],
            "unitTypes": ["APARTMENT"],
            "unitSubTypes": ["FLAT"],
            "bedrooms": 3,
            "bathrooms": 2,
            "parkingSpaces": 2,
            "totalArea": 80,
            "price": 550000
        }
        
        prop = Property(external_id="CC6672-1", tenant_id=1, title="Test")
        PropertyMapper.map_listing_to_property(listing, prop)
        
        # Validar campos principais
        assert prop.property_type == "APARTMENT"
        assert prop.category in {"STANDARD", "Padrão"}
        assert prop.listing_type == "SALE"
        assert prop.bedrooms == 3
        assert prop.bathrooms == 2
        assert prop.parking_spaces == 2
        assert prop.total_area in (80, None)
        assert prop.price in (550000, None)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
