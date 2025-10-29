import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import SidebarWidget from '@/components/ui/SidebarWidget';
import StatusBadge from '@/components/ui/StatusBadge';
import { useOptionalPropertyCreate } from '@/contexts/PropertyCreateContext';

interface ChecklistItem {
  id: string;
  label: string;
  isComplete: boolean;
}

/**
 * StepChecklistWidget - Checklist de campos preenchidos do Step 1
 * 
 * Mostra visualmente quais campos obrigatórios foram preenchidos
 * e quais ainda faltam, incentivando o usuário a completar o formulário.
 */
const StepChecklistWidget: React.FC = () => {
  const context = useOptionalPropertyCreate();

  if (!context) {
    return null;
  }

  const { formData } = context;

  const checklist: ChecklistItem[] = [
    {
      id: 'property_type',
      label: 'Tipo de imóvel',
      isComplete: !!formData.property_type,
    },
    {
      id: 'business_type',
      label: 'Tipo de negócio',
      isComplete: !!formData.business_type,
    },
    {
      id: 'area',
      label: 'Área do imóvel',
      isComplete: !!(formData.usable_areas || formData.total_areas),
    },
    {
      id: 'rooms',
      label: 'Quartos/Banheiros',
      isComplete: !!formData.bedrooms && !!formData.bathrooms,
    },
    {
      id: 'features',
      label: 'Características',
      isComplete: (formData.features?.length || 0) >= 3,
    },
  ];

  const completedCount = checklist.filter(item => item.isComplete).length;
  const totalCount = checklist.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  const getStatusType = () => {
    if (percentage === 100) return 'success';
    if (percentage >= 60) return 'warning';
    return 'error';
  };

  return (
    <SidebarWidget
      title="Progresso do Preenchimento"
      icon={<CheckCircle2 className="w-4 h-4" />}
      badge={`${percentage}%`}
      badgeColor={getStatusType()}
    >
      <div className="space-y-2">
        {/* Progress bar */}
        <div className="h-2 bg-border/40 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              percentage === 100
                ? 'bg-success'
                : percentage >= 60
                ? 'bg-warning'
                : 'bg-error'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Checklist items */}
        <div className="space-y-1.5 mt-3">
          {checklist.map(item => (
            <div key={item.id} className="flex items-center gap-2">
              {item.isComplete ? (
                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-text-tertiary flex-shrink-0" />
              )}
              <span
                className={`text-xs ${
                  item.isComplete
                    ? 'text-text-primary font-medium'
                    : 'text-text-secondary'
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Status message */}
        <div className="mt-3 pt-3 border-t border-border/50">
          {percentage === 100 ? (
            <StatusBadge status="success" label="Etapa completa!" />
          ) : (
            <p className="text-xs text-text-secondary">
              {totalCount - completedCount} {totalCount - completedCount === 1 ? 'item faltando' : 'itens faltando'}
            </p>
          )}
        </div>
      </div>
    </SidebarWidget>
  );
};

export default StepChecklistWidget;
