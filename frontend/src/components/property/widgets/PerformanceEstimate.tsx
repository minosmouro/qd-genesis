import React from 'react';
import { TrendingUp, Eye, Users, Clock, Target } from 'lucide-react';
import SidebarWidget from '@/components/ui/SidebarWidget';
import InfoCard from '@/components/ui/InfoCard';
import { useOptionalPropertyCreate } from '@/contexts/PropertyCreateContext';

/**
 * PerformanceEstimate - Estimativa de performance do anúncio
 * 
 * Baseado no score de qualidade, estima:
 * - Visualizações mensais (100-600)
 * - Leads esperados (5-25)
 * - Tempo médio de venda (30-90 dias)
 * - Taxa de conversão (1-5%)
 */
const PerformanceEstimate: React.FC = () => {
  const context = useOptionalPropertyCreate();

  if (!context) {
    return null;
  }

  const { formData } = context;

  // Calcular score simplificado para estimativas
  const calculateSimpleScore = () => {
    let score = 0;
    
    // Informações básicas (0-30)
    if (formData.property_type) score += 5;
    if (formData.business_type) score += 5;
    if (formData.usable_areas || formData.total_areas) score += 5;
    if (formData.bedrooms && formData.bathrooms) score += 5;
    if ((formData.features?.length || 0) >= 5) score += 10;
    
    // Localização (0-15)
    if (formData.cep) score += 5;
    if (formData.endereco && formData.numero) score += 5;
    if (formData.cidade && formData.estado) score += 5;
    
    // Valores (0-15)
    if (formData.price_sale || formData.price_rent) score += 15;
    
    // Fotos (0-25) - Contar AMBOS: Files novos + URLs existentes
    const newPhotos = formData.images?.length || 0;
    const existingPhotos = ((formData as any).image_urls?.length || 0);
    const photoCount = newPhotos + existingPhotos;
    if (photoCount >= 12) score += 15;
    else if (photoCount >= 8) score += 12;
    else if (photoCount >= 5) score += 9;
    else if (photoCount >= 3) score += 6;
    else if (photoCount >= 1) score += 3;
    if (formData.videos) score += 10;
    
    // Título e descrição (0-15)
    if (formData.title && formData.title.length >= 30) score += 8;
    else if (formData.title && formData.title.length >= 20) score += 5;
    if (formData.description && formData.description.length >= 200) score += 7;
    else if (formData.description && formData.description.length >= 100) score += 4;
    
    return score;
  };

  const score = calculateSimpleScore();
  const percentage = Math.round((score / 100) * 100);

  // Calcular estimativas baseadas no score
  const calculateEstimates = () => {
    // Visualizações mensais (100-600)
    const viewsMin = Math.round(100 + (percentage * 4));
    const viewsMax = Math.round(150 + (percentage * 5.5));
    
    // Leads mensais (5-25)
    const leadsMin = Math.round(5 + (percentage * 0.15));
    const leadsMax = Math.round(8 + (percentage * 0.25));
    
    // Tempo de venda em dias (90-30)
    const daysMin = Math.round(90 - (percentage * 0.6));
    const daysMax = Math.round(120 - (percentage * 0.9));
    
    // Taxa de conversão (1-5%)
    const conversionRate = Number((1 + (percentage * 0.04)).toFixed(1));
    
    return {
      views: { min: viewsMin, max: viewsMax },
      leads: { min: leadsMin, max: leadsMax },
      days: { min: daysMin, max: daysMax },
      conversion: conversionRate,
    };
  };

  const estimates = calculateEstimates();

  const getPerformanceLevel = () => {
    if (percentage >= 85) return { label: 'Excelente', color: 'text-success', icon: '🚀' };
    if (percentage >= 70) return { label: 'Muito Boa', color: 'text-success', icon: '📈' };
    if (percentage >= 60) return { label: 'Boa', color: 'text-warning', icon: '👍' };
    if (percentage >= 40) return { label: 'Regular', color: 'text-warning', icon: '⚠️' };
    return { label: 'Baixa', color: 'text-error', icon: '📉' };
  };

  const performanceLevel = getPerformanceLevel();

  return (
    <SidebarWidget
      title="Estimativa de Performance"
      icon={<TrendingUp className="w-4 h-4" />}
    >
      <div className="space-y-3">
        {/* Nível de performance */}
        <div className="text-center p-3 bg-background/50 rounded-lg border border-border/30">
          <div className="text-2xl mb-1">{performanceLevel.icon}</div>
          <div className={`text-sm font-semibold ${performanceLevel.color}`}>
            Performance {performanceLevel.label}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            Score: {percentage}%
          </div>
        </div>

        {/* Estimativas */}
        <div className="space-y-2">
          <InfoCard
            icon={<Eye className="w-4 h-4" />}
            label="Visualizações/mês"
            value={`${estimates.views.min}-${estimates.views.max}`}
            accent={percentage >= 70 ? 'success' : percentage >= 50 ? 'warning' : 'neutral'}
            size="md"
          />

          <InfoCard
            icon={<Users className="w-4 h-4" />}
            label="Leads esperados/mês"
            value={`${estimates.leads.min}-${estimates.leads.max}`}
            accent={percentage >= 70 ? 'success' : percentage >= 50 ? 'warning' : 'neutral'}
            size="md"
          />

          <InfoCard
            icon={<Clock className="w-4 h-4" />}
            label="Tempo médio de venda"
            value={`${estimates.days.min}-${estimates.days.max} dias`}
            accent={percentage >= 70 ? 'success' : percentage >= 50 ? 'warning' : 'neutral'}
            size="md"
          />

          <InfoCard
            icon={<Target className="w-4 h-4" />}
            label="Taxa de conversão"
            value={`${estimates.conversion}%`}
            accent={percentage >= 70 ? 'success' : percentage >= 50 ? 'warning' : 'neutral'}
            size="md"
          />
        </div>

        {/* Dica de melhoria */}
        <div className="pt-3 border-t border-border/50">
          <div className="text-xs text-text-secondary">
            {percentage >= 85 ? (
              <>
                🎯 <strong className="text-primary">Ótimo!</strong> Seu anúncio tem
                grande potencial de sucesso. Publique agora!
              </>
            ) : percentage >= 60 ? (
              <>
                💡 <strong className="text-primary">Dica:</strong> Adicione mais fotos
                e melhore a descrição para aumentar em até 40% os resultados.
              </>
            ) : (
              <>
                ⚠️ <strong className="text-warning">Atenção:</strong> Complete os
                campos obrigatórios para melhorar significativamente a performance.
              </>
            )}
          </div>
        </div>

        {/* Observação sobre metodologia */}
        <div className="text-xs text-text-tertiary italic p-2 bg-background/30 rounded">
          * Estimativas baseadas em média de mercado e score de qualidade do anúncio.
          Resultados reais podem variar.
        </div>
      </div>
    </SidebarWidget>
  );
};

export default PerformanceEstimate;
