import React from 'react';
import { Image, Video, AlertTriangle, CheckCircle2 } from 'lucide-react';
import SidebarWidget from '@/components/ui/SidebarWidget';
import InfoCard from '@/components/ui/InfoCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { useOptionalPropertyCreate } from '@/contexts/PropertyCreateContext';

const MAX_PHOTOS = 20;

/**
 * GalleryStatus - Status visual da galeria de fotos
 * 
 * Exibe:
 * - Quantidade de fotos enviadas (X/20)
 * - Status da foto de capa
 * - Status do vídeo
 * - Score geral da galeria (cores)
 */
const GalleryStatus: React.FC = () => {
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

  // Calcular score da galeria (0-100)
  const calculateGalleryScore = () => {
    let score = 0;

    // Quantidade de fotos (máximo 50 pontos)
    if (photoCount >= 12) score += 50;
    else if (photoCount >= 8) score += 40;
    else if (photoCount >= 5) score += 30;
    else if (photoCount >= 3) score += 20;
    else if (photoCount >= 1) score += 10;

    // Foto de capa definida (+20 pontos)
    if (hasCover) score += 20;

    // Tem vídeo (+30 pontos)
    if (hasVideo) score += 30;

    return Math.min(score, 100);
  };

  const score = calculateGalleryScore();

  const getScoreStatus = () => {
    if (score >= 80) return { status: 'success' as const, label: 'Excelente', emoji: '🌟' };
    if (score >= 60) return { status: 'warning' as const, label: 'Bom', emoji: '👍' };
    if (score >= 40) return { status: 'warning' as const, label: 'Regular', emoji: '⚠️' };
    return { status: 'error' as const, label: 'Insuficiente', emoji: '❌' };
  };

  const scoreStatus = getScoreStatus();
  const photoPercentage = Math.round((photoCount / MAX_PHOTOS) * 100);

  return (
    <SidebarWidget
      title="Status da Galeria"
      icon={<Image className="w-4 h-4" />}
      badge={`${score}/100`}
      badgeColor={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error'}
    >
      <div className="space-y-3">
        {/* Score visual */}
        <div className="text-center py-3 bg-background/50 rounded-lg border border-border/30">
          <div className="text-3xl mb-1">{scoreStatus.emoji}</div>
          <div className="text-sm font-semibold text-text-primary">
            {score}/100 pontos
          </div>
          <div className="text-xs text-text-secondary mt-1">
            Qualidade: {scoreStatus.label}
          </div>
        </div>

        {/* Contadores */}
        <div className="space-y-2 divide-y divide-border/50">
          {/* Fotos */}
          <div className="pt-2 first:pt-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-text-primary">
                  Fotos
                </span>
              </div>
              <span className="text-xs font-bold text-text-primary">
                {photoCount}/{MAX_PHOTOS}
              </span>
            </div>
            <div className="h-2 bg-border/40 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  photoCount >= 12 ? 'bg-success' : photoCount >= 5 ? 'bg-warning' : 'bg-error'
                }`}
                style={{ width: `${Math.min(photoPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Foto de Capa */}
          <InfoCard
            icon={
              hasCover ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-warning" />
              )
            }
            label="Foto de Capa"
            value={hasCover ? 'Definida' : 'Não definida'}
            accent={hasCover ? 'success' : 'warning'}
          />

          {/* Vídeo */}
          <InfoCard
            icon={
              hasVideo ? (
                <Video className="w-4 h-4 text-success" />
              ) : (
                <Video className="w-4 h-4 text-text-tertiary" />
              )
            }
            label="Vídeo"
            value={hasVideo ? 'Enviado' : 'Não enviado'}
            accent={hasVideo ? 'success' : 'neutral'}
          />
        </div>

        {/* Status badge */}
        <div className="pt-2 border-t border-border/50">
          <StatusBadge
            status={scoreStatus.status}
            label={`Galeria ${scoreStatus.label}`}
          />
        </div>
      </div>
    </SidebarWidget>
  );
};

export default GalleryStatus;
