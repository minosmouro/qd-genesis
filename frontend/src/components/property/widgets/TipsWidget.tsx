import React from 'react';
import { Lightbulb, TrendingUp, Star } from 'lucide-react';
import SidebarWidget from '@/components/ui/SidebarWidget';
import { useOptionalPropertyCreate } from '@/contexts/PropertyCreateContext';

interface Tip {
  id: string;
  icon: React.ReactNode;
  text: string;
  condition?: (formData: any) => boolean;
}

const TIPS_DATABASE: Tip[] = [
  {
    id: 'bedrooms',
    icon: <TrendingUp className="w-4 h-4 text-blue-600" />,
    text: 'Imóveis com 3+ quartos têm 40% mais visualizações',
    condition: (formData) => !formData.bedrooms || formData.bedrooms < 3,
  },
  {
    id: 'features',
    icon: <Star className="w-4 h-4 text-yellow-600" />,
    text: 'Adicione pelo menos 5 características para melhorar o Score',
    condition: (formData) => (formData.features?.length || 0) < 5,
  },
  {
    id: 'furnished',
    icon: <TrendingUp className="w-4 h-4 text-green-600" />,
    text: 'Imóveis mobiliados podem aumentar o valor em até 15%',
    condition: (formData) => !formData.features?.includes('furnished'),
  },
  {
    id: 'area',
    icon: <Lightbulb className="w-4 h-4 text-orange-600" />,
    text: 'Preencha tanto área útil quanto área total para mais transparência',
    condition: (formData) => !formData.usable_areas || !formData.total_areas,
  },
  {
    id: 'parking',
    icon: <TrendingUp className="w-4 h-4 text-purple-600" />,
    text: 'Vagas de garagem são um dos itens mais procurados',
    condition: (formData) => !formData.parking_spaces || formData.parking_spaces === 0,
  },
];

/**
 * TipsWidget - Dicas contextuais para o Step 1
 * 
 * Exibe dicas relevantes baseadas no que o usuário já preencheu,
 * incentivando-o a adicionar mais informações e melhorar a qualidade
 * do anúncio.
 */
const TipsWidget: React.FC = () => {
  const context = useOptionalPropertyCreate();

  if (!context) {
    return null;
  }

  const { formData } = context;

  // Filtrar dicas relevantes baseadas nas condições
  const relevantTips = TIPS_DATABASE.filter(tip => 
    !tip.condition || tip.condition(formData)
  ).slice(0, 3); // Mostrar no máximo 3 dicas

  if (relevantTips.length === 0) {
    return (
      <SidebarWidget
        title="Dicas"
        icon={<Lightbulb className="w-4 h-4" />}
      >
        <div className="flex items-center gap-2 text-success">
          <Star className="w-4 h-4" />
          <span className="text-xs font-medium">
            Ótimo trabalho! Todas as informações básicas preenchidas.
          </span>
        </div>
      </SidebarWidget>
    );
  }

  return (
    <SidebarWidget
      title="Dicas para melhorar seu anúncio"
      icon={<Lightbulb className="w-4 h-4" />}
      badge={relevantTips.length}
      badgeColor="info"
    >
      <div className="space-y-3">
        {relevantTips.map((tip) => (
          <div
            key={tip.id}
            className="flex gap-2 p-2 bg-background/50 rounded-lg border border-border/30 hover:border-primary/30 transition-colors"
          >
            <div className="flex-shrink-0 mt-0.5">
              {tip.icon}
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              {tip.text}
            </p>
          </div>
        ))}

        {/* General tip at the bottom */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <p className="text-xs text-text-tertiary italic">
            💡 Quanto mais completo o cadastro, maior a chance de fechar negócio!
          </p>
        </div>
      </div>
    </SidebarWidget>
  );
};

export default TipsWidget;
