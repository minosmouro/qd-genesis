/**
 * Componente KPICard - Card reutilizável para exibição de KPIs
 * Versão consolidada e otimizada para o dashboard de refresh
 */
import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  Activity,
  Target,
  Zap,
  Home,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ConsolidatedKPI } from '@/types/consolidatedDashboard';

// Mapeamento de ícones
const iconMap = {
  Calendar,
  Activity,
  Target,
  Zap,
  Home,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  AlertCircle
};

// Mapeamento de ícones de tendência
const trendIconMap = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus
};

interface KPICardProps {
  kpi: ConsolidatedKPI;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
  showTrend?: boolean;
  showDescription?: boolean;
  clickable?: boolean;
  className?: string;
  onClick?: (kpi: ConsolidatedKPI) => void;
}

const KPICard: React.FC<KPICardProps> = ({
  kpi,
  size = 'md',
  variant = 'default',
  showTrend = true,
  showDescription = false,
  clickable = false,
  className,
  onClick
}) => {
  // Obter componentes de ícone
  const IconComponent = iconMap[kpi.icon as keyof typeof iconMap] || Activity;
  const TrendIcon = trendIconMap[kpi.trend];

  // Classes CSS baseadas no tamanho
  const sizeClasses = {
    sm: {
      card: 'p-3',
      icon: 'h-4 w-4',
      iconContainer: 'p-1.5',
      value: 'text-lg',
      label: 'text-xs',
      trend: 'text-xs',
      trendIcon: 'h-3 w-3'
    },
    md: {
      card: 'p-4',
      icon: 'h-5 w-5',
      iconContainer: 'p-2',
      value: 'text-2xl',
      label: 'text-sm',
      trend: 'text-xs',
      trendIcon: 'h-3 w-3'
    },
    lg: {
      card: 'p-6',
      icon: 'h-6 w-6',
      iconContainer: 'p-3',
      value: 'text-3xl',
      label: 'text-base',
      trend: 'text-sm',
      trendIcon: 'h-4 w-4'
    }
  };

  // Classes CSS baseadas na cor
  const colorClasses = {
    primary: {
      icon: 'text-primary',
      iconBg: 'bg-primary/10',
      value: 'text-primary',
      trend: 'text-primary'
    },
    success: {
      icon: 'text-success',
      iconBg: 'bg-success/10',
      value: 'text-success',
      trend: 'text-success'
    },
    warning: {
      icon: 'text-warning',
      iconBg: 'bg-warning/10',
      value: 'text-warning',
      trend: 'text-warning'
    },
    danger: {
      icon: 'text-danger',
      iconBg: 'bg-danger/10',
      value: 'text-danger',
      trend: 'text-danger'
    },
    secondary: {
      icon: 'text-secondary',
      iconBg: 'bg-secondary/10',
      value: 'text-secondary',
      trend: 'text-secondary'
    }
  };

  // Classes CSS baseadas na tendência
  const trendColorClasses = {
    up: 'text-success',
    down: 'text-danger',
    stable: 'text-text-secondary'
  };

  const currentSize = sizeClasses[size];
  const currentColor = colorClasses[kpi.color];
  const trendColor = trendColorClasses[kpi.trend];

  // Formatação do valor
  const formatValue = () => {
    let formattedValue = kpi.value.toString();
    
    if (kpi.prefix) {
      formattedValue = kpi.prefix + formattedValue;
    }
    
    if (kpi.suffix) {
      formattedValue = formattedValue + kpi.suffix;
    }
    
    return formattedValue;
  };

  // Handler de clique
  const handleClick = () => {
    if (clickable && onClick) {
      onClick(kpi);
    } else if (kpi.clickable && kpi.onClick) {
      kpi.onClick();
    }
  };

  // Renderização compacta
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'bg-surface border border-border rounded-lg transition-all duration-200',
          currentSize.card,
          clickable || kpi.clickable ? 'cursor-pointer hover:shadow-md hover:border-primary/20' : '',
          className
        )}
        onClick={handleClick}
        title={showDescription ? kpi.description : kpi.label}
      >
        <div className="flex items-center justify-between">
          <div className={cn('rounded-lg', currentSize.iconContainer, currentColor.iconBg)}>
            <IconComponent className={cn(currentSize.icon, currentColor.icon)} />
          </div>
          
          <div className="text-right flex-1 ml-3">
            <div className={cn('font-bold', currentSize.value, currentColor.value)}>
              {formatValue()}
            </div>
            <div className={cn('font-medium text-text-primary', currentSize.label)}>
              {kpi.label}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Renderização detalhada
  if (variant === 'detailed') {
    return (
      <div
        className={cn(
          'bg-surface border border-border rounded-lg transition-all duration-200',
          currentSize.card,
          clickable || kpi.clickable ? 'cursor-pointer hover:shadow-md hover:border-primary/20' : '',
          className
        )}
        onClick={handleClick}
      >
        {/* Header com ícone e valor */}
        <div className="flex items-center justify-between mb-3">
          <div className={cn('rounded-lg', currentSize.iconContainer, currentColor.iconBg)}>
            <IconComponent className={cn(currentSize.icon, currentColor.icon)} />
          </div>
          
          <div className="text-right">
            <div className={cn('font-bold', currentSize.value, currentColor.value)}>
              {formatValue()}
            </div>
          </div>
        </div>
        
        {/* Label e descrição */}
        <div className="space-y-1 mb-3">
          <div className={cn('font-medium text-text-primary', currentSize.label)}>
            {kpi.label}
          </div>
          
          {showDescription && kpi.description && (
            <div className="text-xs text-text-secondary">
              {kpi.description}
            </div>
          )}
        </div>
        
        {/* Tendência */}
        {showTrend && (
          <div className="flex items-center gap-1">
            <TrendIcon className={cn(currentSize.trendIcon, trendColor)} />
            <span className={cn('font-medium', currentSize.trend, trendColor)}>
              {kpi.trendLabel || (
                kpi.trend === 'up' ? 'Crescendo' :
                kpi.trend === 'down' ? 'Decrescendo' : 'Estável'
              )}
            </span>
            {kpi.trendValue && (
              <span className={cn('ml-1', currentSize.trend, 'text-text-secondary')}>
                ({kpi.trendValue})
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Renderização padrão
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg transition-all duration-200 hover:shadow-md',
        currentSize.card,
        clickable || kpi.clickable ? 'cursor-pointer hover:border-primary/20' : '',
        className
      )}
      onClick={handleClick}
    >
      {/* Header com ícone e valor */}
      <div className="flex items-center justify-between mb-3">
        <div className={cn('rounded-lg', currentSize.iconContainer, currentColor.iconBg)}>
          <IconComponent className={cn(currentSize.icon, currentColor.icon)} />
        </div>
        
        <div className="text-right">
          <div className={cn('font-bold', currentSize.value, currentColor.value)}>
            {formatValue()}
          </div>
        </div>
      </div>
      
      {/* Label */}
      <div className="space-y-1">
        <div className={cn('font-medium text-text-primary', currentSize.label)}>
          {kpi.label}
        </div>
        
        {/* Tendência */}
        {showTrend && (
          <div className="flex items-center gap-1">
            <TrendIcon className={cn(currentSize.trendIcon, trendColor)} />
            <span className={cn('font-medium', currentSize.trend, trendColor)}>
              {kpi.trendLabel || (
                kpi.trend === 'up' ? 'Crescendo' :
                kpi.trend === 'down' ? 'Decrescendo' : 'Estável'
              )}
            </span>
          </div>
        )}
      </div>
      
      {/* Descrição (tooltip ou texto) */}
      {showDescription && kpi.description && (
        <div className="mt-2 text-xs text-text-secondary">
          {kpi.description}
        </div>
      )}
    </div>
  );
};

export default KPICard;
