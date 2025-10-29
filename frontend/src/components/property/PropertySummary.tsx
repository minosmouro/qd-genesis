import React from 'react';
import { usePropertyCreate } from '@/contexts/PropertyCreateContext';
import { formatPrice } from '@/utils/formatters';

const PropertySummary: React.FC<{ variant?: 'full' | 'finance' }> = ({
  variant = 'full',
}) => {
  // Verificar se o contexto está disponível
  let formData: any = null;
  try {
    const context = usePropertyCreate();
    formData = context.formData;
  } catch (error) {
    // Contexto não disponível, não renderizar
    return null;
  }

  if (!formData) return null;

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
      <div className="flex items-center mb-2">
        <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center mr-2">
          <span className="text-xs font-bold text-primary">✓</span>
        </div>
        <h4 className="text-sm font-semibold text-text-primary">
          Resumo do Imóvel
        </h4>
      </div>

      <div className="text-xs text-text-secondary space-y-1">
        <div>
          <strong>Tipo:</strong> {formData.property_type || 'Não informado'}{' '}
          {formData.usage_type === 'RESIDENTIAL' ? 'Residencial' : ''}
        </div>
        {formData.category && (
          <div>
            <strong>Categoria:</strong> {formData.category}
          </div>
        )}
        {(formData.bedrooms ||
          formData.bathrooms ||
          formData.parking_spaces) && (
          <div>
            <strong>Composição:</strong>
            {formData.bedrooms && ` ${formData.bedrooms} quartos`}
            {formData.bathrooms && `, ${formData.bathrooms} banheiros`}
            {formData.suites && `, ${formData.suites} suítes`}
            {formData.parking_spaces && `, ${formData.parking_spaces} vagas`}
          </div>
        )}
        {(formData.usable_areas || formData.total_areas) && (
          <div>
            <strong>Área:</strong>{' '}
            {formData.usable_areas ? `${formData.usable_areas}m² útil` : ''}
            {formData.total_areas ? `, ${formData.total_areas}m² total` : ''}
          </div>
        )}

        {variant === 'finance' ? (
          <>
            {formData.price_sale && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">Venda:</span>
                <span className="text-xs font-medium text-secondary">
                  {formatPrice(formData.price_sale)}
                </span>
              </div>
            )}
            {formData.price_rent && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">Aluguel:</span>
                <span className="text-xs font-medium text-secondary">
                  {formatPrice(formData.price_rent)}/mês
                </span>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default PropertySummary;
