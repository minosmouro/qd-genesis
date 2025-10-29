/**
 * Hook para gerenciar dados de Refresh Schedules
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { refreshService } from '@/services/refresh.service';
import type {
  CreateRefreshScheduleRequest,
  UpdateRefreshScheduleRequest,
  PaginationParams,
} from '@/types/refresh';
import type { Property } from '@/types/property';
import toast from 'react-hot-toast';

// ===== SCHEDULES =====

export const useRefreshSchedules = (params: PaginationParams = {}) => {
  return useQuery({
    queryKey: ['refresh-schedules', params],
    queryFn: () => refreshService.listSchedules(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const useRefreshSchedule = (id?: number, options = {}) => {
  return useQuery({
    queryKey: ['refresh-schedule', id],
    queryFn: () => refreshService.getSchedule(id!),
    enabled: (id && id > 0) || false,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

export const useCreateRefreshSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateRefreshScheduleRequest) => refreshService.createSchedule(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['refresh-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['refresh-stats'] });
      toast.success(`Cronograma "${data.name}" criado com sucesso!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar cronograma');
    },
  });
};

export const useUpdateRefreshSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateRefreshScheduleRequest) => 
      refreshService.updateSchedule(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['refresh-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['refresh-schedule', data.id] });
      queryClient.invalidateQueries({ queryKey: ['refresh-stats'] });
      toast.success(`Cronograma "${data.name}" atualizado!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar cronograma');
    },
  });
};

export const useDeleteRefreshSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => refreshService.deleteSchedule(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['refresh-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['refresh-stats'] });
      toast.success(data.message || 'Cronograma excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir cronograma');
    },
  });
};

export const useToggleRefreshSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => 
      refreshService.toggleSchedule(id, isActive),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['refresh-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['refresh-schedule', data.id] });
      queryClient.invalidateQueries({ queryKey: ['refresh-stats'] });
      toast.success(`Cronograma ${data.is_active ? 'ativado' : 'desativado'}!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao alterar status do cronograma');
    },
  });
};

// ===== SCHEDULE PROPERTIES =====

export const useRefreshScheduleProperties = (scheduleId?: number, params: PaginationParams = {}) => {
  return useQuery({
    queryKey: ['schedule-properties', scheduleId, params],
    queryFn: () => refreshService.getScheduleProperties(scheduleId!, params),
    enabled: scheduleId !== undefined && scheduleId > 0,
    staleTime: 2 * 60 * 1000,
  });
};

export const useAddPropertyToSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ scheduleId, propertyId }: { scheduleId: number; propertyId: number }) =>
      refreshService.addPropertiesToSchedule(scheduleId, [propertyId]),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-properties', variables.scheduleId] });
      queryClient.invalidateQueries({ queryKey: ['refresh-schedules'] });
      toast.success('Propriedade adicionada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar propriedade');
    },
  });
};

export const useRemovePropertyFromSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ scheduleId, propertyId }: { scheduleId: number; propertyId: number }) =>
      refreshService.removePropertiesFromSchedule(scheduleId, [propertyId]),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-properties', variables.scheduleId] });
      queryClient.invalidateQueries({ queryKey: ['refresh-schedules'] });
      toast.success('Propriedade removida!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover propriedade');
    },
  });
};

// Hook para buscar propriedades disponíveis (não incluídas em cronogramas)
export const useAvailableProperties = () => {
  return useQuery({
    queryKey: ['available-properties'],
    queryFn: async () => {
      // Usar a nova API específica para propriedades disponíveis
      const { apiGet } = await import('@/services/api');
      const response = await apiGet<Property[]>('/api/refresh-schedules/available-properties');
      return response || [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// ===== MONITORING =====

export const useRefreshStats = () => {
  return useQuery({
    queryKey: ['refresh-stats'],
    queryFn: () => refreshService.getStats(),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
};

export const useRefreshJobs = (params: PaginationParams & { 
  schedule_id?: number; 
  status?: string;
  start_date?: string;
  end_date?: string;
} = {}) => {
  return useQuery({
    queryKey: ['refresh-jobs', params],
    queryFn: () => refreshService.listJobs(params),
    staleTime: 1 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  });
};

export const useRefreshHealthStatus = () => {
  return useQuery({
    queryKey: ['refresh-health'],
    queryFn: () => refreshService.healthCheck(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    retry: 1, // Only retry once for health checks
  });
};

export const useExecuteRefreshScheduleNow = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (scheduleId: number) => refreshService.runScheduleNow(scheduleId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['refresh-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['refresh-stats'] });
      toast.success(data.message || 'Execução manual iniciada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao executar cronograma');
    },
  });
};

export const useCleanupRefreshJobs = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (days: number = 7) => refreshService.cleanupJobs(days),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['refresh-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['refresh-stats'] });
      toast.success(`${data.deleted || 0} logs antigos foram removidos!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao limpar logs antigos');
    },
  });
};