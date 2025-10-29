/**
 * Dashboard de KPIs do Sistema de Refresh - Integração 100% com Banco de Dados
 * Componente principal que exibe todos os KPIs e métricas do sistema de refresh
 */
import React from 'react';
import { 
  Calendar, 
  Activity, 
  Target, 
  Zap, 
  Home, 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Settings
} from 'lucide-react';
import Card from '@/components/Card/Card';
import Button from '@/components/Button/Button';
import { cn } from '@/utils/cn';
import { useRefreshDashboardComplete } from '@/hooks/useRefreshDashboard';

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
  Users
};

interface RefreshKPIDashboardProps {
  className?: string;
  showActions?: boolean;
  compact?: boolean;
}

const RefreshKPIDashboard: React.FC<RefreshKPIDashboardProps> = ({
  className,
  showActions = true,
  compact = false
}) => {
  const {
    dashboard,
    kpis,
    health,
    metrics,
    formattedKPIs,
    kpisSummary,
    isLoading,
    isError,
    actions
  } = useRefreshDashboardComplete();

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-surface rounded mb-2" />
                <div className="h-8 bg-surface rounded mb-2" />
                <div className="h-3 bg-surface rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <XCircle className="h-6 w-6 text-danger" />
          <h3 className="text-lg font-semibold text-danger">
            Erro ao Carregar KPIs
          </h3>
        </div>
        <p className="text-text-secondary mb-4">
          Não foi possível carregar os dados do sistema de refresh.
        </p>
        <Button onClick={actions.refreshAll} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar Novamente
        </Button>
      </Card>
    );
  }

  if (!dashboard || !kpis || !formattedKPIs) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-success';
      case 'warning': return 'text-warning';
      case 'error': return 'text-danger';
      default: return 'text-text-secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return XCircle;
      default: return Activity;
    }
  };

  const StatusIcon = getStatusIcon(health?.status || 'healthy');

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header com Status Geral */}
      <Card className="p-6 bg-primary/5 border-primary/20 dark:bg-[var(--color-semantic-surface-dark)] dark:text-[var(--color-semantic-text-primary-dark)] dark:border-[var(--color-semantic-border-dark)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              'p-3 rounded-full',
              health?.status === 'healthy' ? 'bg-success/10 dark:bg-success/20' :
              health?.status === 'warning' ? 'bg-warning/10 dark:bg-warning/20' : 'bg-danger/10 dark:bg-danger/20'
            )}>
              <StatusIcon className={cn('h-6 w-6', getStatusColor(health?.status || 'healthy'))} />
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-text-primary dark:text-[var(--color-semantic-text-primary-dark)]">
                Sistema de Refresh
              </h2>
              <p className="text-text-secondary">
                {health?.status === 'healthy' ? 'Operacional' :
                 health?.status === 'warning' ? 'Com Alertas' : 'Com Problemas'}
                {health?.last_check && (
                  <span className="ml-2">
                    • Última verificação: {new Date(health.last_check).toLocaleTimeString('pt-BR')}
                  </span>
                )}
              </p>
            </div>
          </div>

          {showActions && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={actions.refreshAll}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
                Atualizar
              </Button>
              
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configurar
              </Button>
            </div>
          )}
        </div>

        {/* Alertas */}
        {health?.issues && health.issues.length > 0 && (
          <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium text-warning">
                {health.issues.length} problema{health.issues.length > 1 ? 's' : ''} detectado{health.issues.length > 1 ? 's' : ''}
              </span>
            </div>
            <ul className="text-xs text-warning/80 space-y-1 ml-6">
              {health.issues.map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Grid de KPIs Principais */}
      <div className={cn(
        'grid gap-4',
        compact 
          ? 'grid-cols-2 lg:grid-cols-4' 
          : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
      )}>
        {formattedKPIs.map((kpi) => {
          const IconComponent = iconMap[kpi.iconComponent as keyof typeof iconMap] || Activity;
          const TrendIcon = iconMap[kpi.trendIcon as keyof typeof iconMap] || Minus;
          
          return (
            <Card key={kpi.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  kpi.color === 'success' ? 'bg-success/10' :
                  kpi.color === 'warning' ? 'bg-warning/10' :
                  kpi.color === 'danger' ? 'bg-danger/10' :
                  kpi.color === 'secondary' ? 'bg-secondary/10' : 'bg-primary/10'
                )}>
                  <IconComponent className={cn('h-5 w-5', kpi.colorClass)} />
                </div>
                
                <div className="text-right">
                  <div className={cn('text-2xl font-bold', kpi.colorClass)}>
                    {kpi.formattedValue}
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-medium text-text-primary">
                  {kpi.label}
                </div>
                
                <div className="flex items-center gap-1">
                  <TrendIcon className={cn(
                    'h-3 w-3',
                    kpi.trend === 'up' ? 'text-success' :
                    kpi.trend === 'down' ? 'text-danger' : 'text-text-secondary'
                  )} />
                  <span className={cn(
                    'text-xs font-medium',
                    kpi.trend === 'up' ? 'text-success' :
                    kpi.trend === 'down' ? 'text-danger' : 'text-text-secondary'
                  )}>
                    {kpi.trend === 'up' ? 'Crescendo' :
                     kpi.trend === 'down' ? 'Decrescendo' : 'Estável'}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Métricas Adicionais */}
      {metrics && !compact && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-lg font-bold text-text-primary">
                  {metrics.scheduleUtilization}%
                </div>
                <div className="text-xs text-text-secondary">
                  Utilização de Cronogramas
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <Home className="h-4 w-4 text-secondary" />
              </div>
              <div>
                <div className="text-lg font-bold text-text-primary">
                  {metrics.avgPropertiesPerSchedule}
                </div>
                <div className="text-xs text-text-secondary">
                  Propriedades por Cronograma
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-warning/10 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              <div>
                <div className="text-lg font-bold text-text-primary">
                  {metrics.schedulesWithIssues}
                </div>
                <div className="text-xs text-text-secondary">
                  Cronogramas com Problemas
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-success/10 rounded-lg">
                <Clock className="h-4 w-4 text-success" />
              </div>
              <div>
                <div className="text-lg font-bold text-text-primary">
                  {metrics.nextExecution ? 
                    new Date(metrics.nextExecution.next_execution).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 
                    'N/A'
                  }
                </div>
                <div className="text-xs text-text-secondary">
                  Próxima Execução
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Resumo dos KPIs */}
      {kpisSummary && !compact && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-text-primary mb-1">
                Resumo dos KPIs
              </h3>
              <p className="text-sm text-text-secondary">
                Visão geral do status dos indicadores
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-lg font-bold text-success">
                  {kpisSummary.healthy_kpis}
                </div>
                <div className="text-xs text-text-secondary">Saudáveis</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-warning">
                  {kpisSummary.warning_kpis}
                </div>
                <div className="text-xs text-text-secondary">Atenção</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-danger">
                  {kpisSummary.critical_kpis}
                </div>
                <div className="text-xs text-text-secondary">Críticos</div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default RefreshKPIDashboard;