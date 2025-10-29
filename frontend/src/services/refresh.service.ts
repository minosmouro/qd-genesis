/**
 * Service para gerenciar Refresh Schedules do CanalPro
 */
import { apiGet, apiPost, apiPut, apiDelete } from './api';
import type {
  RefreshSchedule,
  RefreshScheduleProperty,
  RefreshJob,
  RefreshStats,
  CreateRefreshScheduleRequest,
  UpdateRefreshScheduleRequest,
  RefreshScheduleListResponse,
  RefreshJobListResponse,
  BulkOperationResponse,
  CleanupResponse,
  PaginationParams,
} from '@/types/refresh';

class RefreshService {
  private basePath = '/api/refresh-schedules';

  // ===== REFRESH SCHEDULES =====

  /**
   * Lista todos os cronogramas de refresh
   */
  async listSchedules(params: PaginationParams = {}): Promise<RefreshScheduleListResponse> {
    return apiGet<RefreshScheduleListResponse>(this.basePath, params);
  }

  /**
   * Busca um cronograma específico
   */
  async getSchedule(id: number): Promise<RefreshSchedule> {
    return apiGet<RefreshSchedule>(`${this.basePath}/${id}`);
  }

  /**
   * Cria novo cronograma
   */
  async createSchedule(data: CreateRefreshScheduleRequest): Promise<RefreshSchedule> {
    return apiPost<RefreshSchedule>(this.basePath, data);
  }

  /**
   * Atualiza cronograma existente
   */
  async updateSchedule(id: number, data: Partial<UpdateRefreshScheduleRequest>): Promise<RefreshSchedule> {
    return apiPut<RefreshSchedule>(`${this.basePath}/${id}`, data);
  }

  /**
   * Deleta cronograma
   */
  async deleteSchedule(id: number): Promise<BulkOperationResponse> {
    return apiDelete<BulkOperationResponse>(`${this.basePath}/${id}`);
  }

  /**
   * Ativa/desativa cronograma
   */
  async toggleSchedule(id: number, isActive: boolean): Promise<RefreshSchedule> {
    return apiPut<RefreshSchedule>(`${this.basePath}/${id}/toggle`, { is_active: isActive });
  }

  // ===== SCHEDULE PROPERTIES =====

  /**
   * Lista propriedades de um cronograma
   */
  async getScheduleProperties(scheduleId: number, params: PaginationParams = {}): Promise<{
    data: RefreshScheduleProperty[];
    total: number;
  }> {
    return apiGet<{
      data: RefreshScheduleProperty[];
      total: number;
    }>(`${this.basePath}/${scheduleId}/properties`, params);
  }

  /**
   * Adiciona propriedades ao cronograma
   */
  async addPropertiesToSchedule(scheduleId: number, propertyIds: number[]): Promise<BulkOperationResponse> {
    return apiPost<BulkOperationResponse>(`${this.basePath}/${scheduleId}/properties`, {
      property_ids: propertyIds,
    });
  }

  /**
   * Remove propriedades do cronograma
   */
  async removePropertiesFromSchedule(scheduleId: number, propertyIds: number[]): Promise<BulkOperationResponse> {
    return apiDelete<BulkOperationResponse>(`${this.basePath}/${scheduleId}/properties`, {
      property_ids: propertyIds
    });
  }

  // ===== MANUAL REFRESH =====

  /**
   * Dispara o refresh manual para um imóvel específico.
   */
  async manualRefresh(propertyId: number): Promise<{ message: string; operation_id: number; new_remote_id: string }> {
    // Note que o endpoint aqui é diferente do basePath da classe, pois atua diretamente sobre uma propriedade.
    return apiPost<{ message: string; operation_id: number; new_remote_id: string }>(`/api/properties/${propertyId}/refresh`, {});
  }

  // ===== MONITORING & CONTROL =====

  /**
   * Busca estatísticas gerais
   */
  async getStats(): Promise<RefreshStats> {
  return apiGet<RefreshStats>('/api/refresh-monitor/stats');
  }

  /**
   * Lista jobs de refresh
   */
  async listJobs(params: PaginationParams & { 
    schedule_id?: number; 
    status?: string;
    start_date?: string;
    end_date?: string;
  } = {}): Promise<RefreshJobListResponse> {
  return apiGet<RefreshJobListResponse>('/api/refresh-monitor/jobs', params);
  }

  /**
   * Busca detalhes de um job
   */
  async getJob(jobId: number): Promise<RefreshJob> {
  return apiGet<RefreshJob>(`/api/refresh-monitor/jobs/${jobId}`);
  }

  /**
   * Execução manual de um cronograma
   */
  async runScheduleNow(scheduleId: number): Promise<BulkOperationResponse> {
  return apiPost<BulkOperationResponse>(`/api/refresh-monitor/schedules/${scheduleId}/run`);
  }

  /**
   * Para execução de um cronograma
   */
  async stopSchedule(scheduleId: number): Promise<BulkOperationResponse> {
  return apiPost<BulkOperationResponse>(`/api/refresh-monitor/schedules/${scheduleId}/stop`);
  }

  /**
   * Limpa jobs antigos
   */
  async cleanupJobs(days: number = 30): Promise<CleanupResponse> {
  return apiPost<CleanupResponse>('/api/refresh-monitor/cleanup', { days });
  }

  /**
   * Health check do sistema
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    celery_status: 'connected' | 'disconnected';
    pending_jobs: number;
    last_execution?: string;
    issues?: string[];
  }> {
    return apiGet<{
      status: 'healthy' | 'warning' | 'error';
      celery_status: 'connected' | 'disconnected';
      pending_jobs: number;
      last_execution?: string;
      issues?: string[];
  }>('/api/refresh-monitor/health');
  }

  // ===== UTILITIES =====

  /**
   * Formata horários para exibição
   */
  formatTimes(times: string[]): string {
    if (!times?.length) return 'Nenhum horário';
    return times.sort().join(', ');
  }

  /**
   * Calcula próxima execução (aproximada)
   */
  calculateNextRun(schedule: RefreshSchedule): string | null {
    if (!schedule.is_active || !schedule.time_config?.times?.length) {
      return null;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);

    // Busca próximo horário hoje
    const todayTimes = schedule.time_config.times.filter(time => time > currentTime);
    
    if (todayTimes.length > 0) {
      return `${today} ${todayTimes[0]}`;
    }

    // Próximo horário será amanhã
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    const firstTime = schedule.time_config.times.sort()[0];

    return `${tomorrowDate} ${firstTime}`;
  }

  /**
   * Valida configuração de horários
   */
  validateTimeConfig(timeConfig: { times: string[]; days_of_week?: number[] }): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!timeConfig.times?.length) {
      errors.push('Pelo menos um horário deve ser definido');
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    timeConfig.times?.forEach((time, index) => {
      if (!timeRegex.test(time)) {
        errors.push(`Horário ${index + 1} inválido: ${time}`);
      }
    });

    if (timeConfig.days_of_week && timeConfig.days_of_week.length === 0) {
      errors.push('Pelo menos um dia da semana deve ser selecionado');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const refreshService = new RefreshService();
export default refreshService;