import React from 'react';
import { PropertyFormData } from '@/types';
import { Bed, Bath, Car, Maximize2, MapPin } from 'lucide-react';

interface PropertyCardPreviewProps {
  data: Partial<PropertyFormData>;
}

const PropertyCardPreview: React.FC<PropertyCardPreviewProps> = ({ data }) => {
  // Obter primeira imagem ou placeholder
  const mainImage = data.image_urls?.[0] || 'https://via.placeholder.com/400x300?text=Sem+Foto';

  // Formatar preço
  const formatPrice = (price?: number): string => {
    if (!price) return 'Sob consulta';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Determinar preço a exibir
  const price = data.business_type === 'SALE' 
    ? data.price_sale 
    : data.business_type === 'RENTAL'
    ? data.price_rent
    : data.price_sale || data.price_rent;

  const priceLabel = data.business_type === 'RENTAL' ? '/mês' : '';

  // Determinar localização
  const location = data.bairro && data.cidade 
    ? `${data.bairro}, ${data.cidade}`
    : data.cidade || data.bairro || 'Localização não informada';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Imagem Principal */}
      <div className="relative h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <img
          src={mainImage}
          alt={data.title || 'Preview do imóvel'}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Sem+Foto';
          }}
        />
        {data.image_urls && data.image_urls.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            +{data.image_urls.length - 1} fotos
          </div>
        )}
        {data.business_type && (
          <div className="absolute top-2 left-2 bg-primary text-white text-xs font-semibold px-2 py-1 rounded">
            {data.business_type === 'SALE' ? 'Venda' : data.business_type === 'RENTAL' ? 'Aluguel' : 'Venda/Aluguel'}
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4">
        {/* Preço */}
        <div className="mb-3">
          <div className="text-2xl font-bold text-primary">
            {formatPrice(price)}
            {priceLabel && <span className="text-base font-normal text-text-secondary">{priceLabel}</span>}
          </div>
          {data.condo_fee && !data.condo_fee_exempt && (
            <div className="text-xs text-text-secondary mt-1">
              + Condomínio: {formatPrice(data.condo_fee)}
            </div>
          )}
        </div>

        {/* Título */}
        <h3 className="text-base font-semibold text-text-primary mb-2 line-clamp-2 min-h-[48px]">
          {data.title || 'Título do imóvel não informado'}
        </h3>

        {/* Localização */}
        <div className="flex items-center text-xs text-text-secondary mb-3">
          <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
          <span className="truncate">{location}</span>
        </div>

        {/* Características */}
        <div className="flex items-center gap-3 text-sm text-text-secondary flex-wrap">
          {data.bedrooms !== undefined && data.bedrooms > 0 && (
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              <span>{data.bedrooms}</span>
            </div>
          )}
          {data.bathrooms !== undefined && data.bathrooms > 0 && (
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4" />
              <span>{data.bathrooms}</span>
            </div>
          )}
          {data.parking_spaces !== undefined && data.parking_spaces > 0 && (
            <div className="flex items-center gap-1">
              <Car className="w-4 h-4" />
              <span>{data.parking_spaces}</span>
            </div>
          )}
          {data.usable_areas !== undefined && data.usable_areas > 0 && (
            <div className="flex items-center gap-1">
              <Maximize2 className="w-4 h-4" />
              <span>{data.usable_areas}m²</span>
            </div>
          )}
        </div>

        {/* Descrição Preview */}
        {data.description && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-text-secondary line-clamp-3">
              {data.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyCardPreview;
