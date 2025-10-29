import React from 'react';
import { Star, TrendingUp, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import SidebarWidget from '@/components/ui/SidebarWidget';
import { useOptionalPropertyCreate } from '@/contexts/PropertyCreateContext';

interface QualityCategory {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  status: 'excellent' | 'good' | 'warning' | 'error';
}

/**
 * FinalQualityScore - Score consolidado final do anúncio
 * 
 * Consolida todos os aspectos do cadastro:
 * - Informações básicas (30 pontos)
 * - Localização (15 pontos)
 * - Valores (15 pontos)
 * - Fotos e Vídeos (25 pontos)
 * - Título e Descrição (15 pontos)
 * 
 * Score total: 0-100 pontos
 */
const FinalQualityScore: React.FC = () => {
  const context = useOptionalPropertyCreate();

  if (!context) {
    return null;
  }

  const { formData } = context;

  // Calcular score de informações básicas (0-30 pontos)
  const calculateBasicInfoScore = () => {
    let score = 0;
    if (formData.property_type) score += 5;
    if (formData.business_type) score += 5;
    if (formData.usable_areas || formData.total_areas) score += 5;
    if (formData.bedrooms && formData.bathrooms) score += 5;
    if ((formData.features?.length || 0) >= 5) score += 10;
    return score;
  };

  // Calcular score de localização (0-15 pontos)
  const calculateLocationScore = () => {
    let score = 0;
    if (formData.cep) score += 5;
    if (formData.endereco && formData.numero) score += 5;
    if (formData.cidade && formData.estado) score += 5;
    return score;
  };

  // Calcular score de valores (0-15 pontos)
  const calculateValuesScore = () => {
    let score = 0;
    if (formData.business_type === 'SALE' && formData.price_sale) score += 10;
    if (formData.business_type === 'RENTAL' && formData.price_rent) score += 10;
    if (formData.business_type === 'SALE_RENTAL' && formData.price_sale && formData.price_rent) score += 10;
    if (formData.iptu) score += 5;
    return Math.min(score, 15);
  };

  // Calcular score de fotos (0-25 pontos)
  const calculatePhotosScore = () => {
    let score = 0;
    // Contar AMBOS: Files novos + URLs existentes
    const newPhotos = formData.images?.length || 0;
    const existingPhotos = ((formData as any).image_urls?.length || 0);
    const photoCount = newPhotos + existingPhotos;
    
    if (photoCount >= 12) score += 15;
    else if (photoCount >= 8) score += 12;
    else if (photoCount >= 5) score += 9;
    else if (photoCount >= 3) score += 6;
    else if (photoCount >= 1) score += 3;
    
    if (formData.videos) score += 10;
    
    return score;
  };

  // Calcular score de título e descrição (0-15 pontos)
  const calculateTitleDescScore = () => {
    let score = 0;
    
    if (formData.title && formData.title.length >= 30) score += 8;
    else if (formData.title && formData.title.length >= 20) score += 5;
    else if (formData.title) score += 2;
    
    if (formData.description && formData.description.length >= 200) score += 7;
    else if (formData.description && formData.description.length >= 100) score += 4;
    else if (formData.description) score += 2;
    
    return score;
  };

  const categories: QualityCategory[] = [
    {
      id: 'basic',
      name: 'Informações Básicas',
      score: calculateBasicInfoScore(),
      maxScore: 30,
      status: calculateBasicInfoScore() >= 25 ? 'excellent' : calculateBasicInfoScore() >= 20 ? 'good' : calculateBasicInfoScore() >= 15 ? 'warning' : 'error',
    },
    {
      id: 'location',
      name: 'Localização',
      score: calculateLocationScore(),
      maxScore: 15,
      status: calculateLocationScore() >= 12 ? 'excellent' : calculateLocationScore() >= 10 ? 'good' : calculateLocationScore() >= 7 ? 'warning' : 'error',
    },
    {
      id: 'values',
      name: 'Valores',
      score: calculateValuesScore(),
      maxScore: 15,
      status: calculateValuesScore() >= 12 ? 'excellent' : calculateValuesScore() >= 10 ? 'good' : calculateValuesScore() >= 7 ? 'warning' : 'error',
    },
    {
      id: 'photos',
      name: 'Fotos e Vídeos',
      score: calculatePhotosScore(),
      maxScore: 25,
      status: calculatePhotosScore() >= 20 ? 'excellent' : calculatePhotosScore() >= 15 ? 'good' : calculatePhotosScore() >= 10 ? 'warning' : 'error',
    },
    {
      id: 'title',
      name: 'Título e Descrição',
      score: calculateTitleDescScore(),
      maxScore: 15,
      status: calculateTitleDescScore() >= 12 ? 'excellent' : calculateTitleDescScore() >= 10 ? 'good' : calculateTitleDescScore() >= 7 ? 'warning' : 'error',
    },
  ];

  const totalScore = categories.reduce((sum, cat) => sum + cat.score, 0);
  const maxTotalScore = categories.reduce((sum, cat) => sum + cat.maxScore, 0);
  const percentage = Math.round((totalScore / maxTotalScore) * 100);

  const getOverallStatus = () => {
    if (percentage >= 85) return { label: 'Excelente', emoji: '🌟', color: 'text-success', bg: 'bg-success/10' };
    if (percentage >= 70) return { label: 'Muito Bom', emoji: '🎯', color: 'text-success', bg: 'bg-success/10' };
    if (percentage >= 60) return { label: 'Bom', emoji: '👍', color: 'text-warning', bg: 'bg-warning/10' };
    if (percentage >= 40) return { label: 'Regular', emoji: '⚠️', color: 'text-warning', bg: 'bg-warning/10' };
    return { label: 'Incompleto', emoji: '❌', color: 'text-error', bg: 'bg-error/10' };
  };

  const overallStatus = getOverallStatus();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-error" />;
      default:
        return null;
    }
  };

  return (
    <SidebarWidget
      title="Score Final de Qualidade"
      icon={<Star className="w-4 h-4" />}
      badge={`${percentage}%`}
      badgeColor={percentage >= 85 ? 'success' : percentage >= 60 ? 'warning' : 'error'}
    >
      <div className="space-y-4">
        {/* Score principal */}
        <div className={`text-center py-4 rounded-lg border border-border/30 ${overallStatus.bg}`}>
          <div className="text-4xl mb-1">{overallStatus.emoji}</div>
          <div className={`text-5xl font-bold ${overallStatus.color} mb-1`}>
            {totalScore}
          </div>
          <div className="text-xs text-text-secondary">
            de {maxTotalScore} pontos possíveis
          </div>
          <div className={`text-sm font-semibold ${overallStatus.color} mt-2`}>
            {overallStatus.label}
          </div>
        </div>

        {/* Breakdown por categoria */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-text-primary mb-2">
            Detalhamento por Categoria:
          </div>

          {categories.map(category => (
            <div
              key={category.id}
              className="flex items-center justify-between p-2 bg-background/50 rounded-lg border border-border/30"
            >
              <div className="flex items-center gap-2 flex-1">
                {getStatusIcon(category.status)}
                <span className="text-xs text-text-primary">
                  {category.name}
                </span>
              </div>
              <div className="text-xs font-semibold text-text-primary">
                {category.score}/{category.maxScore}
              </div>
            </div>
          ))}
        </div>

        {/* Mensagem final */}
        {percentage >= 85 ? (
          <div className="flex items-start gap-2 p-3 bg-success/5 border border-success/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary">
              <strong className="text-success">Parabéns!</strong> Seu anúncio está
              excelente e pronto para atrair muitos compradores!
            </p>
          </div>
        ) : percentage >= 60 ? (
          <div className="flex items-start gap-2 p-3 bg-warning/5 border border-warning/20 rounded-lg">
            <TrendingUp className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary">
              Bom trabalho! Considere melhorar as categorias com score mais baixo
              para maximizar resultados.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 bg-error/5 border border-error/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary">
              Complete os campos obrigatórios e adicione mais informações para
              melhorar a qualidade do anúncio.
            </p>
          </div>
        )}
      </div>
    </SidebarWidget>
  );
};

export default FinalQualityScore;
