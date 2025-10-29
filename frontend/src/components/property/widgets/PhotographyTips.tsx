import React from 'react';
import { Lightbulb, Camera, Sun, Home, Smartphone } from 'lucide-react';
import SidebarWidget from '@/components/ui/SidebarWidget';

interface PhotographyTip {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
}

const PHOTOGRAPHY_TIPS: PhotographyTip[] = [
  {
    id: 'natural-light',
    icon: <Sun className="w-4 h-4 text-yellow-600" />,
    title: 'Use luz natural',
    description: 'Tire fotos durante o dia, com janelas abertas. Evite flash direto.',
    importance: 'high',
  },
  {
    id: 'all-rooms',
    icon: <Home className="w-4 h-4 text-blue-600" />,
    title: 'Fotografe todos os cômodos',
    description: 'Sala, quartos, cozinha, banheiros e áreas externas. Mostre tudo!',
    importance: 'high',
  },
  {
    id: 'horizontal',
    icon: <Smartphone className="w-4 h-4 text-purple-600" />,
    title: 'Prefira fotos horizontais',
    description: 'Fotos em paisagem (horizontal) mostram mais do ambiente.',
    importance: 'medium',
  },
  {
    id: 'clean-organized',
    icon: <Camera className="w-4 h-4 text-green-600" />,
    title: 'Ambientes limpos e organizados',
    description: 'Remova objetos pessoais e organize antes de fotografar.',
    importance: 'high',
  },
  {
    id: 'angles',
    icon: <Camera className="w-4 h-4 text-orange-600" />,
    title: 'Tire de ângulos diferentes',
    description: 'Varie os ângulos para mostrar amplitude e profundidade.',
    importance: 'medium',
  },
  {
    id: 'first-photo',
    icon: <Camera className="w-4 h-4 text-red-600" />,
    title: 'Primeira foto é crucial',
    description: 'A foto de capa deve ser a melhor: fachada ou sala ampla.',
    importance: 'high',
  },
];

/**
 * PhotographyTips - Dicas profissionais de fotografia
 * 
 * Exibe dicas contextuais para melhorar a qualidade das fotos:
 * - Iluminação
 * - Enquadramento
 * - Composição
 * - Preparação do ambiente
 * - Ordem das fotos
 */
const PhotographyTips: React.FC = () => {
  // Mostrar apenas as 4 dicas mais importantes
  const topTips = PHOTOGRAPHY_TIPS
    .filter(tip => tip.importance === 'high')
    .slice(0, 4);

  return (
    <SidebarWidget
      title="Dicas de Fotografia"
      icon={<Lightbulb className="w-4 h-4" />}
      badge={topTips.length}
      badgeColor="info"
    >
      <div className="space-y-2">
        {topTips.map(tip => (
          <div
            key={tip.id}
            className="flex gap-2.5 p-2.5 bg-background/50 rounded-lg border border-border/30 hover:border-primary/30 transition-colors"
          >
            <div className="flex-shrink-0 mt-0.5">
              {tip.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-text-primary mb-0.5">
                {tip.title}
              </div>
              <div className="text-xs text-text-secondary leading-relaxed">
                {tip.description}
              </div>
            </div>
          </div>
        ))}

        {/* Dica extra sobre vídeos */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-start gap-2 text-xs text-text-secondary italic">
            <Camera className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-text-primary">Dica PRO:</strong> Vídeos aumentam
              em <strong className="text-primary">50%</strong> as visualizações!
              Grave um tour de 30-60 segundos.
            </div>
          </div>
        </div>

        {/* Stats sobre fotos */}
        <div className="mt-3 p-2.5 bg-primary/5 rounded-lg border border-primary/20">
          <div className="text-xs text-text-secondary">
            📊 <strong className="text-primary">Estatística:</strong> Imóveis com
            12+ fotos de qualidade recebem <strong>3x mais contatos</strong>!
          </div>
        </div>
      </div>
    </SidebarWidget>
  );
};

export default PhotographyTips;
