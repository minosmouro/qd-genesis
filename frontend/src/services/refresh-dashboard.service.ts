/**
 * Service para o dashboard de refresh - Integração 100% com banco de dados
 * Consome os novos endpoints /refresh para KPIs e relatórios
 */
import { apiGet } from '@/services/api';

// Tipos para o dashboard de refresh
export interface RefreshDashboardData {
  status: string;
  timestamp: string;
  tenant_id: string;
  kpis: {
    total_schedules: number;
    active_schedules: number;
    total_properties: number;
    success_rate: number;
    efficiency: number;
    jobs_last_24h: {
      total: number;
      completed: number;
      failed: number;
      pending: number;
    };
    pending_jobs: number;
  };
  statistics: any;
  system_health: {
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    last_check: string;
  };
  schedules: Array<{
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    properties_count: number;
    next_run?: string;
    last_run?: string;
    time_slot?: string;
    frequency_days: number;
  }>;
  next_executions: Array<{
    schedule_id: number;
    schedule_name: string;
    next_execution: string;
    properties_count: number;
  }>;
  recent_jobs: Array<{
    id: number;
    status: string;
    property_id: number;
    property_title: string;
    schedule_id?: number;
    schedule_name?: string;
    created_at: string;
    completed_at?: string;
    error_message?: string;
  }>;
  performance: {
    avg_execution_time: number;
    failure_rate: number;
    most_active_schedule?: {
      id: number;
      name: string;
      properties_count: number;
    };
    properties_per_schedule: number;
  };
}

export interface RefreshKPI {
  value: number;
  label: string;
  icon: string;
  trend: 'up' | 'down' | 'stable';
  color: 'primary' | 'success' | 'warning' | 'danger' | 'secondary';
  suffix?: string;
}

export interface RefreshKPIsResponse {
  status: string;
  kpis: Record<string, RefreshKPI>;
  summary: {
    total_kpis: number;
    healthy_kpis: number;
    warning_kpis: number;
    critical_kpis: number;
  };
  timestamp: string;
}

export interface RefreshHealthResponse {
  status: 'healthy' | 'warning' | 'error';
  celery_status: 'connected' | 'disconnected';
  celery_workers: number;
  pending_jobs: number;
  active_schedules: number;
  issues: string[];
  last_check: string;
  tenant_id: string;
}

class RefreshDashboardService {
  /**
   * Obtém dados completos do dashboard de refresh
   */
  async getDashboardData(): Promise<RefreshDashboardData> {
    return apiGet<RefreshDashboardData>('/refresh');
  }

  /**
   * Obtém KPIs formatados do sistema de refresh
   */
  async getKPIs(): Promise<RefreshKPIsResponse> {
    return apiGet<RefreshKPIsResponse>('/refresh/kpis');
  }

  /**
   * Obtém status de saúde do sistema
   */
  async getHealthStatus(): Promise<RefreshHealthResponse> {
    return apiGet<RefreshHealthResponse>('/refresh/health');
  }

  /**
   * Formata KPIs para exibição no dashboard
   */
  formatKPIsForDisplay(kpis: Record<string, RefreshKPI>) {
    return Object.entries(kpis).map(([key, kpi]) => ({
      id: key,
      ...kpi,
      formattedValue: `${kpi.value}${kpi.suffix || ''}`,
      iconComponent: this.getIconComponent(kpi.icon),
      colorClass: this.getColorClass(kpi.color),
      trendIcon: this.getTrendIcon(kpi.trend)
    }));
  }

  /**
   * Obtém componente de ícone baseado no nome
   */
  private getIconComponent(iconName: string) {
    const iconMap: Record<string, string> = {
      'calendar': 'Calendar',
      'activity': 'Activity',
      'target': 'Target',
      'zap': 'Zap',
      'home': 'Home',
      'bar-chart': 'BarChart3'
    };
    return iconMap[iconName] || 'Activity';
  }

  /**
   * Obtém classe CSS para cor
   */
  private getColorClass(color: string) {
    const colorMap: Record<string, string> = {
      'primary': 'text-primary',
      'success': 'text-success',
      'warning': 'text-warning',
      'danger': 'text-danger',
      'secondary': 'text-secondary'
    };
    return colorMap[color] || 'text-primary';
  }

  /**
   * Obtém ícone de tendência
   */
  private getTrendIcon(trend: string) {
    const trendMap: Record<string, string> = {
      'up': 'TrendingUp',
      'down': 'TrendingDown',
      'stable': 'Minus'
    };
    return trendMap[trend] || 'Minus';
  }

  /**
   * Calcula métricas derivadas dos dados do dashboard
   */
  calculateDerivedMetrics(data: RefreshDashboardData) {
    const { kpis, schedules, recent_jobs } = data;
    
    return {
      // Taxa de utilização de cronogramas
      scheduleUtilization: kpis.total_schedules > 0 
        ? Math.round((kpis.active_schedules / kpis.total_schedules) * 100)
        : 0,
      
      // Média de propriedades por cronograma ativo
      avgPropertiesPerSchedule: kpis.active_schedules > 0
        ? Math.round(kpis.total_properties / kpis.active_schedules)
        : 0,
      
      // Cronogramas com problemas
      schedulesWithIssues: schedules.filter(s => 
        s.is_active && (!s.next_run || recent_jobs.some(j => 
          j.schedule_id === s.id && j.status === 'failed'
        ))
      ).length,
      
      // Jobs por status nas últimas 24h
      jobsByStatus: {
        completed: kpis.jobs_last_24h.completed,
        failed: kpis.jobs_last_24h.failed,
        pending: kpis.jobs_last_24h.pending,
        total: kpis.jobs_last_24h.total
      },
      
      // Próxima execução mais próxima
      nextExecution: data.next_executions.length > 0 
        ? data.next_executions[0]
        : null,
      
      // Status geral do sistema
      overallHealth: this.calculateOverallHealth(data)
    };
  }

  /**
   * Calcula status geral do sistema
   */
  private calculateOverallHealth(data: RefreshDashboardData) {
    const { system_health, kpis } = data;
    
    let score = 100;
    let status = 'healthy';
    let issues: string[] = [...system_health.issues];
    
    // Penalizar por baixa taxa de sucesso
    if (kpis.success_rate < 70) {
      score -= 30;
      status = 'warning';
      issues.push(`Taxa de sucesso baixa: ${kpis.success_rate}%`);
    } else if (kpis.success_rate < 90) {
      score -= 15;
      if (status === 'healthy') status = 'warning';
    }
    
    // Penalizar por muitos jobs pendentes
    if (kpis.pending_jobs > 20) {
      score -= 20;
      if (status === 'healthy') status = 'warning';
      issues.push(`${kpis.pending_jobs} jobs pendentes na fila`);
    }
    
    // Penalizar por falta de cronogramas ativos
    if (kpis.active_schedules === 0) {
      score -= 25;
      if (status === 'healthy') status = 'warning';
      issues.push('Nenhum cronograma ativo');
    }
    
    // Status crítico se sistema com problemas
    if (system_health.status === 'error') {
      score = Math.min(score, 25);
      status = 'error';
    }
    
    return {
      score: Math.max(score, 0),
      status: status as 'healthy' | 'warning' | 'error',
      issues: [...new Set(issues)] // Remove duplicatas
    };
  }

  /**
   * Formata dados para gráficos
   */
  formatDataForCharts(data: RefreshDashboardData) {
    const { kpis, recent_jobs } = data;
    
    // Dados para gráfico de pizza - Jobs por status
    const jobsStatusChart = [
      { name: 'Concluídos', value: kpis.jobs_last_24h.completed, color: '#10b981' },
      { name: 'Falharam', value: kpis.jobs_last_24h.failed, color: '#ef4444' },
      { name: 'Pendentes', value: kpis.jobs_last_24h.pending, color: '#f59e0b' }
    ].filter(item => item.value > 0);
    
    // Dados para gráfico de barras - Cronogramas
    const schedulesChart = [
      { name: 'Ativos', value: kpis.active_schedules, color: '#10b981' },
      { name: 'Inativos', value: kpis.total_schedules - kpis.active_schedules, color: '#6b7280' }
    ];
    
    // Timeline de jobs recentes (últimas 6 horas)
    const jobsTimeline = this.createJobsTimeline(recent_jobs);
    
    return {
      jobsStatusChart,
      schedulesChart,
      jobsTimeline
    };
  }

  /**
   * Cria timeline de jobs para gráfico
   */
  private createJobsTimeline(jobs: RefreshDashboardData['recent_jobs']) {
    const now = new Date();
    const timeline: Array<{ hour: string; completed: number; failed: number }> = [];
    
    // Criar buckets de 1 hora para as últimas 6 horas
    for (let i = 5; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const hourEnd = new Date(hourStart.getTime() + (60 * 60 * 1000));
      
      const jobsInHour = jobs.filter(job => {
        const jobTime = new Date(job.created_at);
        return jobTime >= hourStart && jobTime < hourEnd;
      });
      
      timeline.push({
        hour: hourStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        completed: jobsInHour.filter(j => j.status === 'completed').length,
        failed: jobsInHour.filter(j => j.status === 'failed').length
      });
    }
    
    return timeline;
  }
}

export const refreshDashboardService = new RefreshDashboardService();
export default refreshDashboardService;