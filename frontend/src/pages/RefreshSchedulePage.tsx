/**
 * Cockpit do Corretor - Sistema de Refresh Simplificado
 * Interface otimizada para ações rápidas e decisões em segundos
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { errorLog } from '@/utils/logger';
import PageLayout from '@/components/Layout/PageLayout';
import CockpitQuickActions from '@/components/CockpitQuickActions';
import ManualRefreshModal from '@/components/ManualRefreshModal';
import CockpitStatusCards from '@/components/CockpitStatusCards';
import CockpitSchedulesList from '@/components/CockpitSchedulesList';
import CockpitErrorReport from '@/components/CockpitErrorReport';
import { 
  useRefreshStats, 
  useRefreshSchedules, 
  useRefreshJobs,
  useToggleRefreshSchedule,
  useExecuteRefreshScheduleNow,
  useDeleteRefreshSchedule,
  useCleanupRefreshJobs
} from '@/hooks/useRefresh';
import type { RefreshSchedule } from '@/types/refresh';

const RefreshSchedulePage: React.FC = () => {
  const navigate = useNavigate();

  // Hooks de dados essenciais
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useRefreshStats();
  const { data: schedules, isLoading: schedulesLoading, refetch: refetchSchedules } = useRefreshSchedules();
  const { data: jobs, isLoading: jobsLoading, refetch: refetchJobs } = useRefreshJobs();

  // Hooks de mutations
  const toggleScheduleMutation = useToggleRefreshSchedule();
  const executeNowMutation = useExecuteRefreshScheduleNow();
  const deleteScheduleMutation = useDeleteRefreshSchedule();
  const cleanupJobsMutation = useCleanupRefreshJobs();

  // Métricas essenciais calculadas
  const cockpitMetrics = useMemo(() => {
    if (!stats || !schedules?.data || !jobs?.data) {
      return {
        activeSchedules: 0,
        pendingJobs: 0,
        nextExecution: undefined,
        successRate: 0,
        totalProperties: 0,
        failedJobs: 0,
        hasActiveSchedules: false,
        hasIssues: false
      };
    }

    const activeSchedules = schedules.data.filter(s => s.is_active).length;
    const pendingJobs = stats.jobs_last_24h.pending || 0;
    const totalProperties = schedules.data.reduce((sum, s) => sum + (s.properties_count || 0), 0);
    const failedJobs = jobs.data.filter(j => j.status === 'failed').length;
    
    // Calcular próxima execução
    const nextSchedule = schedules.data
      .filter(s => s.is_active && (s.next_run || s.next_execution))
      .sort((a, b) => {
        const aNext = new Date(a.next_run || a.next_execution || '').getTime();
        const bNext = new Date(b.next_run || b.next_execution || '').getTime();
        return aNext - bNext;
      })[0];

    const successRate = stats.jobs_last_24h.total > 0 
      ? Math.round((stats.jobs_last_24h.completed / stats.jobs_last_24h.total) * 100)
      : 0;

    const hasIssues = failedJobs > 0 || successRate < 80 || 
      schedules.data.some(s => s.is_active && s.failed_jobs && s.failed_jobs > 0);

    return {
      activeSchedules,
      pendingJobs,
      nextExecution: nextSchedule?.next_run || nextSchedule?.next_execution,
      successRate,
      totalProperties,
      failedJobs,
      hasActiveSchedules: activeSchedules > 0,
      hasIssues
    };
  }, [stats, schedules, jobs]);

  // Handlers simplificados
  const handleCreateSchedule = () => {
    navigate('/refresh/new');
  };

  const handleExecuteNow = async (schedule?: RefreshSchedule) => {
    try {
      if (schedule) {
        await executeNowMutation.mutateAsync(schedule.id);
      } else {
        // Executar o próximo cronograma ativo
        const activeSchedule = schedules?.data?.find(s => s.is_active);
        if (activeSchedule) {
          await executeNowMutation.mutateAsync(activeSchedule.id);
        }
      }
      refetchJobs();
    } catch (error) {
      errorLog('Erro ao executar cronograma:', error);
    }
  };

  const handleToggleSchedule = async (schedule: RefreshSchedule) => {
    try {
      await toggleScheduleMutation.mutateAsync({
        id: schedule.id,
        isActive: !schedule.is_active,
      });
      refetchSchedules();
    } catch (error) {
      errorLog('Erro ao alterar status do cronograma:', error);
    }
  };

  const handleDeleteSchedule = async (schedule: RefreshSchedule) => {
    try {
      await deleteScheduleMutation.mutateAsync(schedule.id);
      refetchSchedules();
    } catch (error) {
      errorLog('Erro ao excluir cronograma:', error);
    }
  };

  const handleEditSchedule = (schedule: RefreshSchedule) => {
    navigate(`/refresh/${schedule.id}/edit`);
  };

  const handleViewReports = () => {
    navigate('/dashboard'); // Redirecionar para dashboard completo
  };

  // const handleViewSettings = () => {
  //   navigate('/settings');
  // };

  const handleRefreshAll = () => {
    refetchStats();
    refetchSchedules();
    refetchJobs();
  };

  // const handleRetryJob = async (jobId: number) => {
  //   // TODO: Implementar retry de job específico
  //   console.log('Retry job:', jobId);
  //   refetchJobs();
  // };

  const handleRetryAllJobs = async () => {
    // TODO: Implementar retry de todos os jobs com falha
    console.log('Retry all failed jobs');
    refetchJobs();
  };

  const handleClearOldLogs = async (beforeDate: Date) => {
    const daysSince = Math.ceil((new Date().getTime() - beforeDate.getTime()) / (1000 * 60 * 60 * 24));
    cleanupJobsMutation.mutate(daysSince);
  };

  const handleViewAllSchedules = () => {
    // Manter na mesma página mas expandir lista (futuro)
    console.log('View all schedules');
  };

  const isLoading = statsLoading || schedulesLoading || jobsLoading;
  const [isManualRefreshOpen, setIsManualRefreshOpen] = React.useState(false);
  const failedJobsList = jobs?.data?.filter(j => j.status === 'failed') || [];

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header do Cockpit */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">
              Cockpit do Corretor
            </h1>
            <p className="text-text-secondary">
              Gerencie seus agendamentos de forma rápida e eficiente
            </p>
          </div>
        </div>
        {/* Ações Rápidas - Prioridade Máxima */}
        <CockpitQuickActions
          onCreateSchedule={handleCreateSchedule}
          onExecuteNow={() => handleExecuteNow()}
          onViewReports={handleViewReports}
          onRefreshAll={handleRefreshAll}
          onManualRefresh={() => setIsManualRefreshOpen(true)}
          hasActiveSchedules={cockpitMetrics.hasActiveSchedules}
          isLoading={isLoading}
        />

        <ManualRefreshModal
          isOpen={isManualRefreshOpen}
          onClose={() => setIsManualRefreshOpen(false)}
          onSuccess={() => {
            refetchStats();
            refetchJobs();
          }}
        />

        {/* Status Cards - Métricas Essenciais */}
          <CockpitStatusCards
            activeSchedules={cockpitMetrics.activeSchedules}
            pendingJobs={cockpitMetrics.pendingJobs}
            nextExecution={cockpitMetrics.nextExecution}
            successRate={cockpitMetrics.successRate}
            isLoading={statsLoading}
          />        {/* Layout em duas colunas para desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Lista de Agendamentos Prioritários */}
          <CockpitSchedulesList
            schedules={schedules?.data || []}
            onEdit={handleEditSchedule}
            onToggle={handleToggleSchedule}
            onExecuteNow={handleExecuteNow}
            onDelete={handleDeleteSchedule}
            onViewAll={handleViewAllSchedules}
            isLoading={schedulesLoading}
          />

          {/* Relatório de Erros Críticos */}
          <CockpitErrorReport
            failedJobs={failedJobsList}
            onRetryAll={handleRetryAllJobs}
            onClearOldLogs={handleClearOldLogs}
            isLoading={jobsLoading}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default RefreshSchedulePage;
