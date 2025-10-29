/**
 * Cockpit Status Cards - Cards de Status Essenciais para Corretores
 * Métricas críticas em formato visual rápido e claro
 */
import React from 'react';
import { 
  Activity, 
  Clock, 
  TrendingUp,
  Calendar
} from 'lucide-react';
import Card from '@/components/Card/Card';
import { cn } from '@/utils/cn';

interface StatusMetric {
  label: string;
  value: number | string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  status: 'success' | 'warning' | 'danger' | 'info';
  description?: string;
}

interface CockpitStatusCardsProps {
  activeSchedules: number;
  pendingJobs: number;
  nextExecution?: string;
  successRate: number;
  isLoading?: boolean;
  className?: string;
}

const CockpitStatusCards: React.FC<CockpitStatusCardsProps> = ({
  activeSchedules,
  pendingJobs,
  nextExecution,
  successRate,
  isLoading = false,
  className
}) => {
  // Calcular próxima execução formatada
  const getNextExecutionText = () => {
    if (!nextExecution) return 'Não agendado';
    
    const nextDate = new Date(nextExecution);
    const now = new Date();
    const diffMs = nextDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffMs < 0) return 'Atrasado';
    if (diffHours < 1) return `${diffMinutes}min`;
    if (diffHours < 24) return `${diffHours}h ${diffMinutes}min`;
    
    return nextDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Definir métricas essenciais
  const metrics: StatusMetric[] = [
    {
      label: 'Agendamentos Ativos',
      value: activeSchedules,
      status: activeSchedules > 0 ? 'success' : 'warning',
      description: activeSchedules > 0 ? 'Cronogramas funcionando' : 'Nenhum cronograma ativo',
      trend: activeSchedules > 0 ? 'stable' : undefined
    },
    {
      label: 'Jobs Pendentes',
      value: pendingJobs,
      status: pendingJobs === 0 ? 'success' : pendingJobs < 5 ? 'info' : 'warning',
      description: pendingJobs === 0 ? 'Tudo em dia' : `${pendingJobs} aguardando execução`,
      trend: pendingJobs > 10 ? 'up' : 'stable'
    },
    {
      label: 'Próxima Execução',
      value: getNextExecutionText(),
      status: nextExecution ? 'info' : 'warning',
      description: nextExecution ? 'Próximo agendamento' : 'Configure um cronograma'
    },
    {
      label: 'Taxa de Sucesso',
      value: `${successRate}%`,
      status: successRate >= 90 ? 'success' : successRate >= 70 ? 'warning' : 'danger',
      description: successRate >= 90 ? 'Excelente performance' : 'Pode melhorar',
      trend: successRate >= 90 ? 'up' : successRate >= 70 ? 'stable' : 'down',
      trendValue: successRate >= 90 ? '+5%' : undefined
    }
  ];

  // Obter ícone para cada métrica
  const getMetricIcon = (index: number) => {
    const icons = [Activity, Clock, Calendar, TrendingUp];
    return icons[index] || Activity;
  };

  // Obter cor do status
  const getStatusColor = (status: StatusMetric['status']) => {
    switch (status) {
      case 'success': return 'text-success dark:text-success';
      case 'warning': return 'text-warning dark:text-warning';
      case 'danger': return 'text-danger dark:text-danger';
      case 'info': return 'text-primary dark:text-primary';
      default: return 'text-text-secondary dark:text-text-secondary';
    }
  };

  // Obter cor de fundo do status
  const getStatusBgColor = (status: StatusMetric['status']) => {
    switch (status) {
      case 'success': return 'bg-success/10 dark:bg-success/20 border-success/20 dark:border-success/30';
      case 'warning': return 'bg-warning/10 dark:bg-warning/20 border-warning/20 dark:border-warning/30';
      case 'danger': return 'bg-danger/10 dark:bg-danger/20 border-danger/20 dark:border-danger/30';
      case 'info': return 'bg-primary/10 dark:bg-primary/20 border-primary/20 dark:border-primary/30';
      default: return 'bg-surface dark:bg-surface border-border dark:border-border';
    }
  };

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-surface dark:bg-surface rounded-lg" />
                <div className="h-4 bg-surface dark:bg-surface rounded w-24" />
              </div>
              <div className="h-8 bg-surface dark:bg-surface rounded w-16 mb-2" />
              <div className="h-3 bg-surface dark:bg-surface rounded w-32" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {metrics.map((metric, index) => {
        const Icon = getMetricIcon(index);
        
        return (
          <Card 
            key={metric.label}
            className={cn(
              'p-6 border transition-all duration-200 hover:shadow-lg',
              getStatusBgColor(metric.status)
            )}
          >
            {/* Header com ícone e label */}
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                'p-2 rounded-lg',
                metric.status === 'success' ? 'bg-success/20 dark:bg-success/30' :
                metric.status === 'warning' ? 'bg-warning/20 dark:bg-warning/30' :
                metric.status === 'danger' ? 'bg-danger/20 dark:bg-danger/30' : 'bg-primary/20 dark:bg-primary/30'
              )}>
                <Icon className={cn('h-5 w-5', getStatusColor(metric.status))} />
              </div>
              <span className="text-sm font-medium text-text-secondary dark:text-text-secondary">
                {metric.label}
              </span>
            </div>

            {/* Valor principal */}
            <div className="flex items-end gap-2 mb-2">
              <span className={cn(
                'text-2xl font-bold',
                getStatusColor(metric.status)
              )}>
                {metric.value}
              </span>
              
              {/* Indicador de tendência */}
              {metric.trend && (
                <div className="flex items-center gap-1">
                  {metric.trend === 'up' && (
                    <TrendingUp className="h-4 w-4 text-success" />
                  )}
                  {metric.trend === 'down' && (
                    <TrendingUp className="h-4 w-4 text-danger rotate-180" />
                  )}
                  {metric.trendValue && (
                    <span className={cn(
                      'text-xs font-medium',
                      metric.trend === 'up' ? 'text-success dark:text-success' : 'text-danger dark:text-danger'
                    )}>
                      {metric.trendValue}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Descrição */}
            <p className="text-xs text-text-secondary dark:text-text-secondary">
              {metric.description}
            </p>

            {/* Indicador visual de status */}
            <div className="mt-3 flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                metric.status === 'success' ? 'bg-success dark:bg-success' :
                metric.status === 'warning' ? 'bg-warning dark:bg-warning' :
                metric.status === 'danger' ? 'bg-danger dark:bg-danger' : 'bg-primary dark:bg-primary'
              )} />
              <span className={cn(
                'text-xs font-medium',
                getStatusColor(metric.status)
              )}>
                {metric.status === 'success' ? 'Ótimo' :
                 metric.status === 'warning' ? 'Atenção' :
                 metric.status === 'danger' ? 'Crítico' : 'Normal'}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default CockpitStatusCards;
