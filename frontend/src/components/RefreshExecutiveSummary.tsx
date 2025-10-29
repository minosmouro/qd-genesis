/**
 * Resumo Executivo do Sistema de Refresh
 * Componente para gestores com métricas de alto nível e insights estratégicos
 */
import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Zap,
  Target,
  Activity,
  BarChart3,
  Users
} from 'lucide-react';
import Card from '@/components/Card/Card';
import { cn } from '@/utils/cn';
import type { RefreshStats } from '@/types/refresh';

interface RefreshExecutiveSummaryProps {
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

const RefreshExecutiveSummary: React.FC<RefreshExecutiveSummaryProps> = ({
  stats,
  healthStatus,
  className,
}) => {
  // Calcular métricas executivas
  const successRate = stats.jobs_last_24h.total > 0 
    ? Math.round((stats.jobs_last_24h.completed / stats.jobs_last_24h.total) * 100)
    : 0;

  const efficiency = stats.total_schedules > 0 
    ? Math.round((stats.active_schedules / stats.total_schedules) * 100)
    : 0;

  const avgJobsPerSchedule = stats.active_schedules > 0 
    ? Math.round(stats.jobs_last_24h.total / stats.active_schedules)
    : 0;

  // Removido cálculo não utilizado para evitar warning de variável não usada

  // Determinar tendências
  const getPerformanceTrend = (rate: number) => {
    if (rate >= 90) return { icon: TrendingUp, color: 'text-success', label: 'Excelente' };
    if (rate >= 70) return { icon: Activity, color: 'text-warning', label: 'Bom' };
    return { icon: TrendingDown, color: 'text-danger', label: 'Crítico' };
  };

  const performanceTrend = getPerformanceTrend(successRate);
  const efficiencyTrend = getPerformanceTrend(efficiency);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Resumo de Alto Nível */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary mb-1">
              Resumo Executivo
            </h2>
            <p className="text-text-secondary text-sm">
              Visão geral da performance do sistema nas últimas 24h
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-3 h-3 rounded-full',
              healthStatus?.status === 'healthy' ? 'bg-success animate-pulse' :
              healthStatus?.status === 'warning' ? 'bg-warning' : 'bg-danger'
            )} />
            <span className="text-sm font-medium">
              Sistema {healthStatus?.status === 'healthy' ? 'Operacional' : 
                      healthStatus?.status === 'warning' ? 'Atenção' : 'Crítico'}
            </span>
          </div>
        </div>

        {/* KPIs Principais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Taxa de Sucesso */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <performanceTrend.icon className={cn('h-5 w-5', performanceTrend.color)} />
              <span className="text-2xl font-bold text-text-primary">
                {successRate}%
              </span>
            </div>
            <div className="text-sm text-text-secondary mb-1">Taxa de Sucesso</div>
            <div className={cn('text-xs font-medium', performanceTrend.color)}>
              {performanceTrend.label}
            </div>
          </div>

          {/* Eficiência do Sistema */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <efficiencyTrend.icon className={cn('h-5 w-5', efficiencyTrend.color)} />
              <span className="text-2xl font-bold text-text-primary">
                {efficiency}%
              </span>
            </div>
            <div className="text-sm text-text-secondary mb-1">Eficiência</div>
            <div className={cn('text-xs font-medium', efficiencyTrend.color)}>
              {stats.active_schedules}/{stats.total_schedules} ativos
            </div>
          </div>

          {/* Volume de Operações */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-text-primary">
                {stats.jobs_last_24h.total}
              </span>
            </div>
            <div className="text-sm text-text-secondary mb-1">Jobs Executados</div>
            <div className="text-xs text-primary font-medium">
              Últimas 24h
            </div>
          </div>

          {/* Propriedades Ativas */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="h-5 w-5 text-secondary" />
              <span className="text-2xl font-bold text-text-primary">
                {stats.total_properties}
              </span>
            </div>
            <div className="text-sm text-text-secondary mb-1">Propriedades</div>
            <div className="text-xs text-secondary font-medium">
              Em cronogramas ativos
            </div>
          </div>
        </div>
      </Card>

      {/* Alertas e Recomendações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alertas Críticos */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h3 className="font-semibold text-text-primary">
              Alertas e Problemas
            </h3>
          </div>
          
          <div className="space-y-2">
            {/* Sistema com problemas */}
            {healthStatus?.status === 'error' && (
              <div className="flex items-start gap-2 p-2 bg-danger/10 border border-danger/20 rounded">
                <AlertTriangle className="h-4 w-4 text-danger mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-danger">Sistema com falhas</div>
                  <div className="text-xs text-danger/80">
                    Celery desconectado - jobs não serão processados
                  </div>
                </div>
              </div>
            )}

            {/* Fila congestionada */}
            {healthStatus && healthStatus.pending_jobs > 10 && (
              <div className="flex items-start gap-2 p-2 bg-warning/10 border border-warning/20 rounded">
                <Clock className="h-4 w-4 text-warning mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-warning">Fila congestionada</div>
                  <div className="text-xs text-warning/80">
                    {healthStatus.pending_jobs} jobs aguardando processamento
                  </div>
                </div>
              </div>
            )}

            {/* Taxa de sucesso baixa */}
            {successRate < 70 && stats.jobs_last_24h.total > 0 && (
              <div className="flex items-start gap-2 p-2 bg-danger/10 border border-danger/20 rounded">
                <TrendingDown className="h-4 w-4 text-danger mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-danger">Taxa de sucesso baixa</div>
                  <div className="text-xs text-danger/80">
                    {stats.jobs_last_24h.failed} de {stats.jobs_last_24h.total} jobs falharam
                  </div>
                </div>
              </div>
            )}

            {/* Cronogramas inativos */}
            {stats.total_schedules > stats.active_schedules && (
              <div className="flex items-start gap-2 p-2 bg-warning/10 border border-warning/20 rounded">
                <Activity className="h-4 w-4 text-warning mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-warning">Cronogramas inativos</div>
                  <div className="text-xs text-warning/80">
                    {stats.total_schedules - stats.active_schedules} cronogramas pausados
                  </div>
                </div>
              </div>
            )}

            {/* Tudo OK */}
            {healthStatus?.status === 'healthy' && 
             successRate >= 90 && 
             (healthStatus.pending_jobs || 0) <= 5 && (
              <div className="flex items-start gap-2 p-2 bg-success/10 border border-success/20 rounded">
                <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-success">Sistema funcionando perfeitamente</div>
                  <div className="text-xs text-success/80">
                    Nenhum problema crítico detectado
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Recomendações Estratégicas */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-text-primary">
              Recomendações
            </h3>
          </div>
          
          <div className="space-y-2">
            {/* Recomendação baseada na performance */}
            {successRate < 80 && (
              <div className="flex items-start gap-2 p-2 bg-primary/10 border border-primary/20 rounded">
                <Zap className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-primary">Otimizar cronogramas</div>
                  <div className="text-xs text-primary/80">
                    Revisar cronogramas com alta taxa de falha
                  </div>
                </div>
              </div>
            )}

            {/* Recomendação de eficiência */}
            {efficiency < 70 && (
              <div className="flex items-start gap-2 p-2 bg-primary/10 border border-primary/20 rounded">
                <Activity className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-primary">Ativar cronogramas</div>
                  <div className="text-xs text-primary/80">
                    {stats.total_schedules - stats.active_schedules} cronogramas podem ser ativados
                  </div>
                </div>
              </div>
            )}

            {/* Recomendação de volume */}
            {avgJobsPerSchedule > 50 && (
              <div className="flex items-start gap-2 p-2 bg-primary/10 border border-primary/20 rounded">
                <BarChart3 className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-primary">Distribuir carga</div>
                  <div className="text-xs text-primary/80">
                    Considere criar mais cronogramas para distribuir a carga
                  </div>
                </div>
              </div>
            )}

            {/* Recomendação positiva */}
            {successRate >= 90 && efficiency >= 80 && (
              <div className="flex items-start gap-2 p-2 bg-success/10 border border-success/20 rounded">
                <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-success">Performance excelente</div>
                  <div className="text-xs text-success/80">
                    Sistema operando com alta eficiência
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RefreshExecutiveSummary;