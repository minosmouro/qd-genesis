import React from 'react';
import { QualityScore, getScoreColor, getScoreLabel } from '@/utils/qualityScore';
import { TrendingUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface QualityScoreMeterProps {
  score: QualityScore;
}

const QualityScoreMeter: React.FC<QualityScoreMeterProps> = ({ score }) => {
  const colors = getScoreColor(score.total);
  const label = getScoreLabel(score.total);

  // Ícone baseado no nível
  const getIcon = () => {
    if (score.level === 'excellent') return <CheckCircle className="w-5 h-5" />;
    if (score.level === 'good') return <TrendingUp className="w-5 h-5" />;
    if (score.level === 'fair') return <AlertCircle className="w-5 h-5" />;
    return <XCircle className="w-5 h-5" />;
  };

  // Calcular circunferência para o círculo SVG
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score.total / 100) * circumference;

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-4`}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold ${colors.text} flex items-center gap-2`}>
          {getIcon()}
          Score de Qualidade
        </h3>
        <span className={`text-xs font-medium ${colors.text} px-2 py-1 rounded bg-white/50 dark:bg-black/20`}>
          {label}
        </span>
      </div>

      {/* Medidor Circular */}
      <div className="flex justify-center mb-4">
        <div className="relative">
          <svg className="transform -rotate-90 w-32 h-32">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={`${
                score.total >= 85
                  ? 'text-green-500'
                  : score.total >= 70
                  ? 'text-blue-500'
                  : score.total >= 50
                  ? 'text-yellow-500'
                  : 'text-red-500'
              } transition-all duration-500 ease-out`}
              strokeLinecap="round"
            />
          </svg>
          {/* Score number */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-3xl font-bold ${colors.text}`}>
                {score.total}
              </div>
              <div className="text-xs text-text-secondary">
                /100
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 mb-4">
        <div className="text-xs font-semibold text-text-primary mb-2">Detalhamento:</div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">Título</span>
          <div className="flex items-center gap-2">
            <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full ${score.breakdown.title >= 25 ? 'bg-green-500' : score.breakdown.title >= 15 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${(score.breakdown.title / 30) * 100}%` }}
              />
            </div>
            <span className="text-text-primary font-medium w-8 text-right">
              {score.breakdown.title}/30
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">Descrição</span>
          <div className="flex items-center gap-2">
            <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full ${score.breakdown.description >= 25 ? 'bg-green-500' : score.breakdown.description >= 15 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${(score.breakdown.description / 30) * 100}%` }}
              />
            </div>
            <span className="text-text-primary font-medium w-8 text-right">
              {score.breakdown.description}/30
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">Palavras-chave</span>
          <div className="flex items-center gap-2">
            <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full ${score.breakdown.keywords >= 15 ? 'bg-green-500' : score.breakdown.keywords >= 10 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${(score.breakdown.keywords / 20) * 100}%` }}
              />
            </div>
            <span className="text-text-primary font-medium w-8 text-right">
              {score.breakdown.keywords}/20
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">Fotos</span>
          <div className="flex items-center gap-2">
            <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full ${score.breakdown.photos >= 18 ? 'bg-green-500' : score.breakdown.photos >= 10 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${(score.breakdown.photos / 20) * 100}%` }}
              />
            </div>
            <span className="text-text-primary font-medium w-8 text-right">
              {score.breakdown.photos}/20
            </span>
          </div>
        </div>
      </div>

      {/* Sugestões */}
      {score.suggestions.length > 0 && (
        <div className="border-t border-border pt-3">
          <div className="text-xs font-semibold text-text-primary mb-2">
            💡 Sugestões de Melhoria:
          </div>
          <ul className="space-y-1.5">
            {score.suggestions.slice(0, 5).map((suggestion, index) => (
              <li key={index} className="text-xs text-text-secondary flex items-start gap-1">
                <span className="text-primary mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default QualityScoreMeter;
