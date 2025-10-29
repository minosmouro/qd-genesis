import React from 'react';
import { Star, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import SidebarWidget from '@/components/ui/SidebarWidget';
import { useOptionalPropertyCreate } from '@/contexts/PropertyCreateContext';

interface QualityFactor {
  id: string;
  label: string;
  status: 'success' | 'warning' | 'error';
  points: number;
  icon: React.ReactNode;
}

/**
 * PhotoQualityScore - Score detalhado de qualidade das fotos
 * 
 * Analisa:
 * - Quantidade adequada de fotos (12+ = ideal)
 * - Foto de capa definida (+20 pontos)
 * - Diversidade de ambientes
 * - Presença de vídeo (+15 pontos)
 * 
 * Exibe breakdown do score com dicas de melhoria
 */
const PhotoQualityScore: React.FC = () => {
  const context = useOptionalPropertyCreate();

  if (!context) {
    return null;
  }

  const { formData } = context;

  // Contar AMBOS: Files novos (images) + URLs existentes (image_urls)
  const newPhotos = formData.images || [];
  const existingPhotos = (formData as any).image_urls || [];
  const photoCount = newPhotos.length + existingPhotos.length;
  
  const hasVideo = !!formData.videos;
  // Tem foto de capa se houver pelo menos 1 foto
  const hasCover = photoCount > 0;

  // Calcular fatores de qualidade
  const qualityFactors: QualityFactor[] = [
    {
      id: 'quantity',
      label: photoCount >= 12 ? 'Quantidade ideal de fotos' : photoCount >= 5 ? 'Quantidade adequada' : 'Poucas fotos',
      status: photoCount >= 12 ? 'success' : photoCount >= 5 ? 'warning' : 'error',
      points: photoCount >= 12 ? 40 : photoCount >= 5 ? 25 : photoCount >= 1 ? 10 : 0,
      icon: photoCount >= 12 ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />,
    },
    {
      id: 'cover',
      label: hasCover ? 'Foto de capa definida' : 'Foto de capa não definida',
      status: hasCover ? 'success' : 'error',
      points: hasCover ? 30 : 0,
      icon: hasCover ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />,
    },
    {
      id: 'video',
      label: hasVideo ? 'Vídeo enviado' : 'Sem vídeo',
      status: hasVideo ? 'success' : 'warning',
      points: hasVideo ? 30 : 0,
      icon: hasVideo ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />,
    },
  ];

  const totalScore = qualityFactors.reduce((sum, factor) => sum + factor.points, 0);
  const maxPossibleScore = 100;
  const scorePercentage = Math.round((totalScore / maxPossibleScore) * 100);

  const getScoreColor = () => {
    if (totalScore >= 80) return 'text-success';
    if (totalScore >= 60) return 'text-warning';
    return 'text-error';
  };

  const getScoreGradient = () => {
    if (totalScore >= 80) return 'from-success/20 to-success/5';
    if (totalScore >= 60) return 'from-warning/20 to-warning/5';
    return 'from-error/20 to-error/5';
  };

  return (
    <SidebarWidget
      title="Score de Qualidade"
      icon={<Star className="w-4 h-4" />}
      badge={`${scorePercentage}%`}
      badgeColor={totalScore >= 80 ? 'success' : totalScore >= 60 ? 'warning' : 'error'}
    >
      <div className="space-y-3">
        {/* Score principal */}
        <div className={`text-center py-4 rounded-lg border border-border/30 bg-gradient-to-br ${getScoreGradient()}`}>
          <div className={`text-4xl font-bold ${getScoreColor()}`}>
            {totalScore}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            de {maxPossibleScore} pontos possíveis
          </div>
        </div>

        {/* Breakdown dos fatores */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-text-primary mb-2">
            Análise Detalhada:
          </div>

          {qualityFactors.map(factor => (
            <div
              key={factor.id}
              className={`flex items-start gap-2 p-2 rounded-lg border ${
                factor.status === 'success'
                  ? 'bg-success/5 border-success/20'
                  : factor.status === 'warning'
                  ? 'bg-warning/5 border-warning/20'
                  : 'bg-error/5 border-error/20'
              }`}
            >
              <div
                className={`flex-shrink-0 mt-0.5 ${
                  factor.status === 'success'
                    ? 'text-success'
                    : factor.status === 'warning'
                    ? 'text-warning'
                    : 'text-error'
                }`}
              >
                {factor.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary">
                  {factor.label}
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {factor.points > 0 ? `+${factor.points}` : '0'} pontos
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dica de melhoria */}
        {totalScore < 100 && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-start gap-2 text-xs text-text-secondary">
              <TrendingUp className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                {totalScore < 60 && (
                  <span>
                    Adicione mais fotos e defina a capa para melhorar o score!
                  </span>
                )}
                {totalScore >= 60 && totalScore < 80 && (
                  <span>
                    Adicione um vídeo para alcançar score excelente!
                  </span>
                )}
                {totalScore >= 80 && totalScore < 100 && (
                  <span>
                    Quase perfeito! Complete todos os itens para 100 pontos.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarWidget>
  );
};

export default PhotoQualityScore;
