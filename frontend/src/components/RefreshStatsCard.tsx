/**
 * Card de estatísticas do sistema de Refresh - Versão Melhorada
 * Interface otimizada para gestores com métricas claras e visuais informativos
 */
import React from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  Activity,
  Timer,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  BarChart3
} from 'lucide-react';
import Card from '@/components/Card/Card';
import { cn } from '@/utils/cn';
import type { RefreshStats } from '@/types/refresh';

interface RefreshStatsCardProps {
  stats: RefreshStats;
  healthStatus?: {
    status: 'healthy' | 'warning' | 'error';
    celery_status: 'connected' | 'disconnected';
    pending_jobs: number;
    last_execution?: string;
    issues?: string[];
  };
  className?: string;
}

const RefreshStatsCard: React.FC<RefreshStatsCardProps> = ({
  stats,
  healthStatus,
  className,
}) => {
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getHealthStatusColor = () => {
    if (!healthStatus) return 'text-text-secondary';
    
    switch (healthStatus.status) {
      case 'healthy':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'error':
        return 'text-danger';
      default:
        return 'text-text-secondary';
    }
  };

  const getHealthStatusIcon = () => {
    if (!healthStatus) return <Activity className="h-5 w-5" />;
    
    switch (healthStatus.status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'error':
        return <XCircle className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const getHealthStatusText = () => {
    if (!healthStatus) return 'Desconhecido';
    
    switch (healthStatus.status) {
      case 'healthy':
        return 'Sistema Operacional';
      case 'warning':
        return 'Atenção Necessária';
      case 'error':
        return 'Sistema com Falhas';
      default:
        return 'Status Desconhecido';
    }
  };

  // Calcular taxa de sucesso
  const successRate = stats.jobs_last_24h.total > 0 
    ? Math.round((stats.jobs_last_24h.completed / stats.jobs_last_24h.total) * 100)
    : 0;

  // Calcular eficiência (cronogramas ativos vs total)
  const efficiency = stats.total_schedules > 0 
    ? Math.round((stats.active_schedules / stats.total_schedules) * 100)
    : 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Status do Sistema - Destaque Principal */}
      <Card className="p-6 border-l-4 border-l-primary dark:bg-[var(--color-semantic-surface-dark)] dark:text-[var(--color-semantic-text-primary-dark)] dark:border-[var(--color-semantic-border-dark)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-3 rounded-full',
              healthStatus?.status === 'healthy' ? 'bg-success/10 dark:bg-success/20' :
              healthStatus?.status === 'warning' ? 'bg-warning/10 dark:bg-warning/20' : 'bg-danger/10 dark:bg-danger/20'
            )}>
              {getHealthStatusIcon()}
            </div>
            <div>
              <h3 className={cn('text-lg font-semibold', getHealthStatusColor(), 'dark:text-[var(--color-semantic-text-primary-dark)]')}>
                {getHealthStatusText()}
              </h3>
              <p className="text-sm text-text-secondary dark:text-[var(--color-semantic-text-secondary-dark)]">
                Última verificação: {formatDateTime(healthStatus?.last_execution)}
              </p>
            </div>
          </div>
          
          {/* Indicadores de Status */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={cn(
                    'w-3 h-3 rounded-full',
                    healthStatus?.celery_status === 'connected' 
                      ? 'bg-success animate-pulse' 
                      : 'bg-danger'
                  )}
                />
                <span className="text-sm font-medium">
                  Celery {healthStatus?.celery_status === 'connected' ? 'Online' : 'Offline'}
                </span>
              </div>
              
              {healthStatus && healthStatus.pending_jobs > 0 && (
                <div className="flex items-center gap-2 text-warning">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">
                    {healthStatus.pending_jobs} jobs na fila
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Alertas e Issues */}
        {healthStatus?.issues && healthStatus.issues.length > 0 && (
          <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium text-warning">
                Problemas Detectados ({healthStatus.issues.length})
              </span>
            </div>
            <ul className="text-xs text-warning/80 space-y-1 ml-6">
              {healthStatus.issues.map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Métricas Principais - Grid Responsivo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Cronogramas */}
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-text-primary">
                {stats.total_schedules}
              </div>
              <div className="text-xs text-text-secondary">
                Total
              </div>
            </div>
          </div>
          <div className="text-sm font-medium text-text-primary">
            Cronogramas
          </div>
          <div className="text-xs text-text-secondary">
            {stats.active_schedules} ativos
          </div>
        </Card>

        {/* Taxa de Sucesso */}
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-success/10 rounded-lg">
              <Target className="h-5 w-5 text-success" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-success">
                {successRate}%
              </div>
              <div className="text-xs text-text-secondary">
                24h
              </div>
            </div>
          </div>
          <div className="text-sm font-medium text-text-primary">
            Taxa de Sucesso
          </div>
          <div className="flex items-center gap-1 text-xs">
            {successRate >= 90 ? (
              <TrendingUp className="h-3 w-3 text-success" />
            ) : (
              <TrendingDown className="h-3 w-3 text-danger" />
            )}
            <span className={successRate >= 90 ? 'text-success' : 'text-danger'}>
              {successRate >= 90 ? 'Excelente' : 'Precisa atenção'}
            </span>
          </div>
        </Card>

        {/* Propriedades Ativas */}
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Activity className="h-5 w-5 text-secondary" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-text-primary">
                {stats.total_properties}
              </div>
              <div className="text-xs text-text-secondary">
                Ativas
              </div>
            </div>
          </div>
          <div className="text-sm font-medium text-text-primary">
            Propriedades
          </div>
          <div className="text-xs text-text-secondary">
            Em cronogramas ativos
          </div>
        </Card>

        {/* Eficiência do Sistema */}
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Zap className="h-5 w-5 text-warning" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-text-primary">
                {efficiency}%
              </div>
              <div className="text-xs text-text-secondary">
                Eficiência
              </div>
            </div>
          </div>
          <div className="text-sm font-medium text-text-primary">
            Utilização
          </div>
          <div className="text-xs text-text-secondary">
            Cronogramas ativos/total
          </div>
        </Card>
      </div>

      {/* Jobs das Últimas 24h - Painel Detalhado */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary text-lg">
                Atividade das Últimas 24h
              </h3>
              <p className="text-sm text-text-secondary">
                Resumo de execuções e performance
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-text-primary">
              {stats.jobs_last_24h.total}
            </div>
            <div className="text-sm text-text-secondary">
              Jobs executados
            </div>
          </div>
        </div>
        
        {/* Grid de Estatísticas de Jobs */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-surface rounded-lg">
            <div className="text-xl font-bold text-success mb-1">
              {stats.jobs_last_24h.completed}
            </div>
            <div className="text-xs text-text-secondary mb-1">Concluídos</div>
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="h-3 w-3 text-success" />
              <span className="text-xs text-success">
                {stats.jobs_last_24h.total > 0 
                  ? Math.round((stats.jobs_last_24h.completed / stats.jobs_last_24h.total) * 100)
                  : 0}%
              </span>
            </div>
          </div>
          
          <div className="text-center p-3 bg-surface rounded-lg">
            <div className="text-xl font-bold text-danger mb-1">
              {stats.jobs_last_24h.failed}
            </div>
            <div className="text-xs text-text-secondary mb-1">Falharam</div>
            <div className="flex items-center justify-center gap-1">
              <XCircle className="h-3 w-3 text-danger" />
              <span className="text-xs text-danger">
                {stats.jobs_last_24h.total > 0 
                  ? Math.round((stats.jobs_last_24h.failed / stats.jobs_last_24h.total) * 100)
                  : 0}%
              </span>
            </div>
          </div>
          
          <div className="text-center p-3 bg-surface rounded-lg">
            <div className="text-xl font-bold text-warning mb-1">
              {stats.jobs_last_24h.pending}
            </div>
            <div className="text-xs text-text-secondary mb-1">Pendentes</div>
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-warning" />
              <span className="text-xs text-warning">
                {stats.jobs_last_24h.total > 0 
                  ? Math.round((stats.jobs_last_24h.pending / stats.jobs_last_24h.total) * 100)
                  : 0}%
              </span>
            </div>
          </div>
          
          <div className="text-center p-3 bg-surface rounded-lg">
            <div className="text-xl font-bold text-text-primary mb-1">
              {successRate}%
            </div>
            <div className="text-xs text-text-secondary mb-1">Sucesso</div>
            <div className="flex items-center justify-center gap-1">
              {successRate >= 90 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-xs text-success">Ótimo</span>
                </>
              ) : successRate >= 70 ? (
                <>
                  <Activity className="h-3 w-3 text-warning" />
                  <span className="text-xs text-warning">Bom</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-danger" />
                  <span className="text-xs text-danger">Baixo</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Barra de Progresso Visual Melhorada */}
        {stats.jobs_last_24h.total > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Distribuição de Jobs</span>
              <span>{stats.jobs_last_24h.total} total</span>
            </div>
            <div className="flex h-3 bg-surface rounded-full overflow-hidden shadow-inner">
              <div
                className="bg-success transition-all duration-1000 ease-out"
                style={{
                  width: `${(stats.jobs_last_24h.completed / stats.jobs_last_24h.total) * 100}%`,
                }}
                title={`${stats.jobs_last_24h.completed} concluídos`}
              />
              <div
                className="bg-danger transition-all duration-1000 ease-out"
                style={{
                  width: `${(stats.jobs_last_24h.failed / stats.jobs_last_24h.total) * 100}%`,
                }}
                title={`${stats.jobs_last_24h.failed} falharam`}
              />
              <div
                className="bg-warning transition-all duration-1000 ease-out"
                style={{
                  width: `${(stats.jobs_last_24h.pending / stats.jobs_last_24h.total) * 100}%`,
                }}
                title={`${stats.jobs_last_24h.pending} pendentes`}
              />
            </div>
          </div>
        )}

        {/* Próxima Execução */}
        {stats.next_execution && (
          <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Próxima execução: {formatDateTime(stats.next_execution)}
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RefreshStatsCard;