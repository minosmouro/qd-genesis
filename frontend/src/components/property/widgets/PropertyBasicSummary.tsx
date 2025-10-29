import React from 'react';
import { Home, Ruler, Bed, Bath, Car, MapPin } from 'lucide-react';
import SidebarWidget from '@/components/ui/SidebarWidget';
import InfoCard from '@/components/ui/InfoCard';
import { useOptionalPropertyCreate } from '@/contexts/PropertyCreateContext';

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Apartamento',
  HOUSE: 'Casa',
  CASA_CONDOMINIO: 'Casa de Condomínio',
  CASA_VILA: 'Casa de Vila',
  COBERTURA: 'Cobertura',
  FAZENDA_SITIO_CHACARA: 'Fazenda/Sítio/Chácara',
  FLAT: 'Flat',
  KITNET_CONJUGADO: 'Kitnet/Conjugado',
  LOFT: 'Loft',
  LOTE_TERRENO: 'Lote/Terreno',
  PREDIO_EDIFICIO_INTEIRO: 'Prédio/Edifício Inteiro',
  STUDIO: 'Studio',
};

/**
 * PropertyBasicSummary - Resumo visual compacto do imóvel
 * 
 * Exibe informações básicas do imóvel em tempo real:
 * - Tipo de imóvel
 * - Tipo de negócio
 * - Área útil/total
 * - Quartos, banheiros, vagas
 * - Localização (se disponível)
 */
const PropertyBasicSummary: React.FC = () => {
  const context = useOptionalPropertyCreate();

  if (!context) {
    return null;
  }

  const { formData } = context;

  const propertyTypeLabel = formData.property_type
    ? PROPERTY_TYPE_LABELS[formData.property_type]
    : 'Não definido';

  const area = formData.usable_areas || formData.total_areas || 0;
  const location = formData.cidade && formData.estado
    ? `${formData.cidade}, ${formData.estado}`
    : formData.estado || 'Localização não definida';

  return (
    <SidebarWidget
      title="Resumo do Imóvel"
      icon={<Home className="w-4 h-4" />}
    >
      <div className="space-y-1 divide-y divide-border/50">
        <InfoCard
          icon={<Home className="w-4 h-4" />}
          label="Tipo"
          value={propertyTypeLabel}
          accent="primary"
        />

        <InfoCard
          icon={<Ruler className="w-4 h-4" />}
          label="Área"
          value={area > 0 ? `${area} m²` : 'Não informada'}
          accent={area > 0 ? 'success' : 'neutral'}
        />

        {formData.bedrooms !== undefined && formData.bedrooms > 0 && (
          <InfoCard
            icon={<Bed className="w-4 h-4" />}
            label="Quartos"
            value={formData.bedrooms}
            accent="neutral"
          />
        )}

        {formData.bathrooms !== undefined && formData.bathrooms > 0 && (
          <InfoCard
            icon={<Bath className="w-4 h-4" />}
            label="Banheiros"
            value={formData.bathrooms}
            accent="neutral"
          />
        )}

        {formData.parking_spaces !== undefined && formData.parking_spaces > 0 && (
          <InfoCard
            icon={<Car className="w-4 h-4" />}
            label="Vagas"
            value={formData.parking_spaces}
            accent="neutral"
          />
        )}

        <InfoCard
          icon={<MapPin className="w-4 h-4" />}
          label="Localização"
          value={location}
          accent={formData.cidade ? 'success' : 'neutral'}
        />
      </div>
    </SidebarWidget>
  );
};

export default PropertyBasicSummary;
