import React from 'react';
import { Globe, Star, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import SidebarWidget from '@/components/ui/SidebarWidget';
import { useOptionalPropertyCreate } from '@/contexts/PropertyCreateContext';

interface Platform {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  minScore: number;
  recommended: boolean;
  reason: string;
}

const PLATFORMS: Platform[] = [
  {
    id: 'vivareal',
    name: 'VivaReal',
    description: 'Líder de mercado - Maior alcance',
    icon: <Star className="w-5 h-5" />,
    color: 'text-green-600',
    minScore: 60,
    recommended: true,
    reason: 'Maior visibilidade e leads qualificados',
  },
  {
    id: 'zapimoveis',
    name: 'ZapImóveis',
    description: 'Público premium - Alto padrão',
    icon: <Star className="w-5 h-5" />,
    color: 'text-orange-600',
    minScore: 70,
    recommended: true,
    reason: 'Ideal para imóveis de médio/alto padrão',
  },
  {
    id: 'olx',
    name: 'OLX',
    description: 'Grande público - Variedade',
    icon: <Globe className="w-5 h-5" />,
    color: 'text-purple-600',
    minScore: 50,
    recommended: false,
    reason: 'Boa opção para aumentar alcance',
  },
];

/**
 * PlatformRecommendations - Recomendações de plataformas
 * 
 * Analisa o anúncio e recomenda as melhores plataformas baseado em:
 * - Score de qualidade
 * - Tipo de imóvel
 * - Valores
 * - Localização
 */
const PlatformRecommendations: React.FC = () => {
  const context = useOptionalPropertyCreate();

  if (!context) {
    return null;
  }

  const { formData } = context;

  // Calcular score simplificado
  const calculateScore = () => {
    let score = 0;
    
    if (formData.property_type) score += 10;
    if (formData.business_type) score += 10;
    if (formData.usable_areas || formData.total_areas) score += 10;
    if (formData.bedrooms && formData.bathrooms) score += 10;
    if ((formData.features?.length || 0) >= 5) score += 10;
    if (formData.cep && formData.endereco) score += 10;
    if (formData.price_sale || formData.price_rent) score += 10;
    
    // Contar AMBOS: Files novos + URLs existentes
    const newPhotos = formData.images?.length || 0;
    const existingPhotos = ((formData as any).image_urls?.length || 0);
    const photoCount = newPhotos + existingPhotos;
    if (photoCount >= 8) score += 15;
    else if (photoCount >= 5) score += 10;
    else if (photoCount >= 3) score += 5;
    
    if (formData.title && formData.title.length >= 30) score += 8;
    if (formData.description && formData.description.length >= 200) score += 7;
    
    return score;
  };

  const score = calculateScore();

  // Avaliar compatibilidade com cada plataforma
  const evaluatePlatforms = () => {
    return PLATFORMS.map(platform => {
      const isCompatible = score >= platform.minScore;
      const compatibilityPercentage = Math.min(Math.round((score / platform.minScore) * 100), 100);
      
      return {
        ...platform,
        isCompatible,
        compatibilityPercentage,
        shouldRecommend: isCompatible && platform.recommended,
      };
    });
  };

  const evaluatedPlatforms = evaluatePlatforms();
  const recommendedPlatforms = evaluatedPlatforms.filter(p => p.shouldRecommend);

  return (
    <SidebarWidget
      title="Plataformas Recomendadas"
      icon={<Globe className="w-4 h-4" />}
      badge={recommendedPlatforms.length}
      badgeColor="success"
    >
      <div className="space-y-3">
        {/* Resumo */}
        <div className="text-center p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="text-sm font-semibold text-primary">
            {recommendedPlatforms.length} {recommendedPlatforms.length === 1 ? 'plataforma recomendada' : 'plataformas recomendadas'}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            Baseado no score: {score}/100
          </div>
        </div>

        {/* Lista de plataformas */}
        <div className="space-y-2">
          {evaluatedPlatforms.map(platform => (
            <div
              key={platform.id}
              className={`p-3 rounded-lg border transition-all ${
                platform.shouldRecommend
                  ? 'bg-success/5 border-success/30 hover:border-success/50'
                  : platform.isCompatible
                  ? 'bg-background/50 border-border/30 hover:border-border/50'
                  : 'bg-background/30 border-border/20 opacity-60'
              }`}
            >
              {/* Header da plataforma */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={platform.color}>
                    {platform.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-text-primary">
                      {platform.name}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {platform.description}
                    </div>
                  </div>
                </div>
                
                {/* Badge de status */}
                {platform.shouldRecommend ? (
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                ) : platform.isCompatible ? (
                  <CheckCircle2 className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                )}
              </div>

              {/* Barra de compatibilidade */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-secondary">Compatibilidade</span>
                  <span className={`font-medium ${
                    platform.isCompatible ? 'text-success' : 'text-text-tertiary'
                  }`}>
                    {platform.compatibilityPercentage}%
                  </span>
                </div>
                <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      platform.isCompatible ? 'bg-success' : 'bg-text-tertiary'
                    }`}
                    style={{ width: `${Math.min(platform.compatibilityPercentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Motivo/Dica */}
              {platform.shouldRecommend ? (
                <div className="flex items-start gap-1.5 text-xs text-success">
                  <TrendingUp className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{platform.reason}</span>
                </div>
              ) : platform.isCompatible ? (
                <div className="text-xs text-text-secondary">
                  {platform.reason}
                </div>
              ) : (
                <div className="text-xs text-text-tertiary">
                  Score mínimo: {platform.minScore} pontos
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Dica final */}
        <div className="pt-3 border-t border-border/50">
          {recommendedPlatforms.length >= 2 ? (
            <div className="text-xs text-text-secondary">
              🎯 <strong className="text-primary">Estratégia recomendada:</strong> Publique
              nas {recommendedPlatforms.length} plataformas para maximizar alcance!
            </div>
          ) : recommendedPlatforms.length === 1 ? (
            <div className="text-xs text-text-secondary">
              💡 <strong className="text-primary">Dica:</strong> Melhore o score para
              desbloquear mais plataformas e aumentar visibilidade.
            </div>
          ) : (
            <div className="text-xs text-text-secondary">
              ⚠️ <strong className="text-warning">Atenção:</strong> Complete mais
              informações para alcançar o score mínimo das plataformas.
            </div>
          )}
        </div>
      </div>
    </SidebarWidget>
  );
};

export default PlatformRecommendations;
