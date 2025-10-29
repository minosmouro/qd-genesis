import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PropertyCreateStepper from '@/components/property/PropertyCreateStepper';
import { propertiesService } from '@/services/properties.service';
import { AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useOptionalPropertyCreate, normalizeInitialData } from '@/contexts/PropertyCreateContext';

const PropertyCreatePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const context = useOptionalPropertyCreate();

  const { isLoading, error, data } = useQuery({
    queryKey: ['property', id],
    queryFn: () => propertiesService.getById(Number(id)),
    enabled: !!id,
  });

  useEffect(() => {
    if (data && context?.updateData) {
      context.updateData(normalizeInitialData(data));
    }
  }, [data, context?.updateData]); // ✅ Usar apenas a função updateData, não todo o context

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <AlertCircle className="mx-auto h-12 w-12 text-danger" />
        <h3 className="mt-2 text-lg font-semibold text-text-primary">
          Erro ao carregar imóvel
        </h3>
        <p className="mt-1 text-sm">
          {error.message ||
            'Não foi possível carregar os dados do imóvel para edição.'}
        </p>
        <Button
          onClick={() => window.history.back()}
          variant="primary"
          className="mt-6"
        >
          Voltar
        </Button>
      </div>
    );
  }

  // Retornar apenas o stepper - o provider está no PropertiesLayout
  return <PropertyCreateStepper />;
};

export default PropertyCreatePage;
