/**
 * Cockpit Schedules List - Lista Compacta de Agendamentos
 * Mostra os próximos 5 agendamentos mais importantes de forma clara e acionável
 */
import React from 'react';
import { 
  Clock, 
  Play, 
  Pause, 
  Edit, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  Zap,
  Trash2
} from 'lucide-react';
import Button from '@/components/Button/Button';
import Card from '@/components/Card/Card';
import { cn } from '@/utils/cn';
import type { RefreshSchedule } from '@/types/refresh';

interface CockpitSchedulesListProps {
  schedules: RefreshSchedule[];
  onEdit: (schedule: RefreshSchedule) => void;
  onToggle: (schedule: RefreshSchedule) => void;
  onExecuteNow: (schedule: RefreshSchedule) => void;
  onDelete: (schedule: RefreshSchedule) => void;
  onViewAll: () => void;
  isLoading?: boolean;
  className?: string;
}

const CockpitSchedulesList: React.FC<CockpitSchedulesListProps> = ({
  schedules,
  onEdit,
  onToggle,
  onExecuteNow,
  onDelete,
  onViewAll,
  isLoading = false,
  className
}) => {
  // Ordenar e limitar aos 5 mais importantes
  const prioritySchedules = React.useMemo(() => {
    if (!schedules || schedules.length === 0) return [];
    
    return schedules
      .sort((a, b) => {
        // Prioridade: 1. Ativos com problemas, 2. Próximos a executar, 3. Mais recentes
        const aHasIssues = a.is_active && (a.failed_jobs && a.failed_jobs > 0);
        const bHasIssues = b.is_active && (b.failed_jobs && b.failed_jobs > 0);
        
        if (aHasIssues && !bHasIssues) return -1;
        if (!aHasIssues && bHasIssues) return 1;
        
        // Se ambos ativos, ordenar por próxima execução
        if (a.is_active && b.is_active) {
          const aNext = new Date(a.next_run || a.next_execution || '').getTime();
          const bNext = new Date(b.next_run || b.next_execution || '').getTime();
          return aNext - bNext;
        }
        
        // Ativos primeiro
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        
        // Por último, mais recentes
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      })
      .slice(0, 5);
  }, [schedules]);

  // Formatar próxima execução
  const formatNextExecution = (schedule: RefreshSchedule) => {
    const nextRun = schedule.next_run || schedule.next_execution;
    if (!nextRun) return { countdown: 'Não agendado', scheduledTime: null };
    
    const nextDate = new Date(nextRun);
    const now = new Date();
    const diffMs = nextDate.getTime() - now.getTime();
    
    // Formatação do horário programado
    const scheduledTime = nextDate.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    if (diffMs < 0) return { countdown: 'Atrasado', scheduledTime };
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    let countdown;
    if (diffHours < 1) {
      countdown = `${diffMinutes}min`;
    } else if (diffHours < 24) {
      countdown = `${diffHours}h`;
    } else {
      countdown = nextDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
    }
    
    return { countdown, scheduledTime };
  };

  // Obter status do agendamento
  const getScheduleStatus = (schedule: RefreshSchedule) => {
    if (!schedule.is_active) return 'inactive';
    
    const hasFailures = schedule.failed_jobs && schedule.failed_jobs > 0;
    const hasNoNextRun = !schedule.next_run && !schedule.next_execution;
    
    if (hasFailures) return 'error';
    if (hasNoNextRun) return 'warning';
    return 'healthy';
  };

  // Obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-success dark:text-success';
      case 'warning': return 'text-warning dark:text-warning';
      case 'error': return 'text-danger dark:text-danger';
      case 'inactive': return 'text-text-disabled dark:text-text-disabled';
      default: return 'text-text-secondary dark:text-text-secondary';
    }
  };

  // Obter ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return AlertTriangle;
      case 'inactive': return Pause;
      default: return Clock;
    }
  };

  if (isLoading) {
    return (
      <Card className={cn('p-6', className)}>
            <div className="animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 bg-surface dark:bg-surface rounded w-48" />
                <div className="h-8 bg-surface dark:bg-surface rounded w-24" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-surface dark:bg-surface rounded-lg">
                    <div className="w-8 h-8 bg-surface-hover dark:bg-surface-hover rounded" />
                    <div className="flex-1">
                      <div className="h-4 bg-surface-hover dark:bg-surface-hover rounded w-32 mb-2" />
                      <div className="h-3 bg-surface-hover dark:bg-surface-hover rounded w-24" />
                    </div>
                    <div className="h-8 bg-surface-hover dark:bg-surface-hover rounded w-16" />
                  </div>
                ))}
              </div>
            </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
          <Calendar className="h-5 w-5 text-primary dark:text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary">
            Próximos Agendamentos
          </h3>
          <p className="text-sm text-text-secondary dark:text-text-secondary">
            {prioritySchedules.length} de {schedules.length} agendamentos
          </p>
        </div>
        </div>
        
        <Button
          onClick={onViewAll}
          variant="outline"
          size="sm"
        >
          Ver Todos
        </Button>
      </div>

      {/* Lista de Agendamentos */}
      {prioritySchedules.length === 0 ? (
        <div className="text-center py-8">
          <div className="p-3 bg-text-secondary/10 dark:bg-text-secondary/20 rounded-full w-fit mx-auto mb-4">
            <Calendar className="h-6 w-6 text-text-secondary dark:text-text-secondary" />
          </div>
          <h4 className="font-medium text-text-primary dark:text-text-primary mb-2">
            Nenhum agendamento encontrado
          </h4>
          <p className="text-sm text-text-secondary dark:text-text-secondary">
            Crie seu primeiro agendamento para começar
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {prioritySchedules.map((schedule) => {
            const status = getScheduleStatus(schedule);
            const StatusIcon = getStatusIcon(status);
            
            return (
              <div
                key={schedule.id}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg border transition-all duration-200',
                  'hover:shadow-md hover:bg-surface-hover dark:hover:bg-surface-hover',
                  status === 'error' ? 'border-danger/20 dark:border-danger/30 bg-danger/5 dark:bg-danger/10' :
                  status === 'warning' ? 'border-warning/20 dark:border-warning/30 bg-warning/5 dark:bg-warning/10' :
                  status === 'healthy' ? 'border-success/20 dark:border-success/30 bg-success/5 dark:bg-success/10' :
                  'border-border dark:border-border bg-surface dark:bg-surface'
                )}
              >
                {/* Status Icon */}
                <div className={cn(
                  'p-2 rounded-lg',
                  status === 'error' ? 'bg-danger/10 dark:bg-danger/20' :
                  status === 'warning' ? 'bg-warning/10 dark:bg-warning/20' :
                  status === 'healthy' ? 'bg-success/10 dark:bg-success/20' :
                  'bg-text-secondary/10 dark:bg-text-secondary/20'
                )}>
                  <StatusIcon className={cn('h-4 w-4', getStatusColor(status))} />
                </div>

                {/* Informações do Agendamento */}
                <div className="flex-1 min-w-0">
                  {/* Linha 1: Nome + Status + Falhas */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-text-primary dark:text-text-primary truncate">
                        {schedule.name}
                      </h4>
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide',
                        schedule.is_active 
                          ? 'bg-success text-white shadow-sm' 
                          : 'bg-text-secondary text-white'
                      )}>
                        {schedule.is_active ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>
                    
                    {schedule.failed_jobs && schedule.failed_jobs > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-danger/10 rounded-full">
                        <AlertTriangle className="h-3 w-3 text-danger" />
                        <span className="text-danger text-xs font-semibold">
                          {schedule.failed_jobs} falhas
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Linha 2: Data/Hora de Execução */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      {formatNextExecution(schedule).scheduledTime && formatNextExecution(schedule).countdown !== 'Não agendado' ? (
                        <span className="text-sm font-medium text-text-primary">
                          Próximo: {formatNextExecution(schedule).scheduledTime} ({formatNextExecution(schedule).countdown})
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-warning">
                          {formatNextExecution(schedule).countdown}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Linha 3: Propriedades */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-2 py-1 bg-surface dark:bg-surface-hover rounded-md">
                      <Calendar className="h-3 w-3 text-text-secondary" />
                      <span className="text-xs font-medium text-text-secondary">
                        {schedule.properties_count || 0} imóveis cadastrados
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ações Rápidas */}
                <div className="flex items-center gap-1">
                  {/* Toggle Ativo/Pausado */}
                  <Button
                    onClick={() => onToggle(schedule)}
                    variant="ghost"
                    size="sm"
                    className="p-2 hover:bg-primary/10"
                    title={schedule.is_active ? 'Pausar agendamento' : 'Ativar agendamento'}
                  >
                    {schedule.is_active ? (
                      <Pause className="h-4 w-4 text-text-secondary hover:text-primary" />
                    ) : (
                      <Play className="h-4 w-4 text-text-secondary hover:text-success" />
                    )}
                  </Button>

                  {/* Executar Agora */}
                  {schedule.is_active && (
                    <Button
                      onClick={() => onExecuteNow(schedule)}
                      variant="ghost"
                      size="sm"
                      className="p-2 hover:bg-primary/10"
                      title="Executar agora"
                    >
                      <Zap className="h-4 w-4 text-text-secondary hover:text-primary" />
                    </Button>
                  )}

                  {/* Editar */}
                  <Button
                    onClick={() => onEdit(schedule)}
                    variant="ghost"
                    size="sm"
                    className="p-2 hover:bg-primary/10"
                    title="Editar agendamento"
                  >
                    <Edit className="h-4 w-4 text-text-secondary hover:text-primary" />
                  </Button>

                  {/* Excluir */}
                  <Button
                    onClick={() => onDelete(schedule)}
                    variant="ghost"
                    size="sm"
                    className="p-2 hover:bg-danger/10"
                    title="Excluir agendamento"
                  >
                    <Trash2 className="h-4 w-4 text-text-secondary hover:text-danger" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer com resumo */}
      {prioritySchedules.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm text-text-secondary dark:text-text-secondary">
            <div className="flex items-center gap-4">
              <span>
                {schedules.filter(s => s.is_active).length} ativos
              </span>
              <span>
                {schedules.filter(s => s.failed_jobs && s.failed_jobs > 0).length} com problemas
              </span>
            </div>
            
            <span className="flex items-center gap-1">
              <span className="font-medium">Próxima execução:</span>
              <span className="text-primary font-semibold">{formatNextExecution(prioritySchedules[0]).countdown}</span>
              {formatNextExecution(prioritySchedules[0]).scheduledTime && (
                <span className="text-xs text-text-tertiary">
                  • {formatNextExecution(prioritySchedules[0]).scheduledTime}
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CockpitSchedulesList;
