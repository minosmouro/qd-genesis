/**
 * Card individual de cronograma de refresh - Versão Melhorada
 * Interface otimizada para corretores e gestores com informações claras e ações intuitivas
 */
import React, { useState } from 'react';
import { 
  Clock, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  MapPin,
  Users,
  Activity,
  CheckCircle,
  XCircle,
  Calendar as CalendarIcon,
  AlertTriangle,
  Zap,
  MoreVertical,
  Eye,
  Settings,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import Card from '@/components/Card/Card';
import Button from '@/components/Button/Button';
import { cn } from '@/utils/cn';
import type { RefreshSchedule } from '@/types/refresh';
import ScheduleReport from './ScheduleReport';

interface RefreshScheduleCardProps {
  schedule: RefreshSchedule;
  onEdit?: (schedule: RefreshSchedule) => void;
  onDelete?: (schedule: RefreshSchedule) => void;
  onToggleActive?: (schedule: RefreshSchedule) => void;
  onExecuteNow?: (schedule: RefreshSchedule) => void;
  onManageProperties?: (schedule: RefreshSchedule) => void;
  className?: string;
}

const RefreshScheduleCard: React.FC<RefreshScheduleCardProps> = ({
  schedule,
  onEdit,
  onDelete,
  onToggleActive,
  onExecuteNow,
  onManageProperties,
  className,
}) => {
  const [showReport, setShowReport] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const formatDaysOfWeek = (days: number[] | null | undefined) => {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    if (!Array.isArray(days)) return 'Todos os dias';
    if (days.length === 7) return 'Todos os dias';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Dias úteis';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Fins de semana';
    return days.map(day => dayNames[day]).join(', ');
  };

  const getNextExecution = () => {
    if (!schedule.next_execution && !schedule.next_run) return { countdown: 'Não agendado', scheduledTime: null };
    
    const nextDate = new Date(schedule.next_execution || schedule.next_run || '');
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
    
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    let countdown;
    if (diffMinutes < 60) {
      countdown = `Em ${diffMinutes}min`;
    } else if (diffHours < 24) {
      countdown = `Em ${diffHours}h`;
    } else {
      countdown = `Em ${diffDays}d`;
    }
    
    return { countdown, scheduledTime };
  };

  const getLastExecutionStatus = () => {
    const lastRun = schedule.last_execution || schedule.last_run;
    if (!lastRun) return null;
    
    return {
      date: new Date(lastRun).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      success: schedule.last_execution_status === 'success' || !schedule.failed_jobs || schedule.failed_jobs === 0,
    };
  };

  const getHealthStatus = () => {
    if (!schedule.is_active) return 'inactive';
    
    const hasFailures = schedule.failed_jobs && schedule.failed_jobs > 0;
    const hasNoNextRun = !schedule.next_execution && !schedule.next_run;
    const lowSuccessRate = schedule.completed_jobs && schedule.failed_jobs && 
      (schedule.completed_jobs / (schedule.completed_jobs + schedule.failed_jobs)) < 0.8;
    
    if (hasFailures || hasNoNextRun || lowSuccessRate) return 'warning';
    return 'healthy';
  };

  const getSuccessRate = () => {
    const completed = schedule.completed_jobs || 0;
    const failed = schedule.failed_jobs || 0;
    const total = completed + failed;
    
    if (total === 0) return null;
    return Math.round((completed / total) * 100);
  };

  const lastExecution = getLastExecutionStatus();
  const healthStatus = getHealthStatus();
  const successRate = getSuccessRate();
  const nextExecutionInfo = getNextExecution();

  return (
    <Card className={cn(
      'p-5 hover:shadow-lg transition-all duration-200 border-l-4',
      healthStatus === 'healthy' && schedule.is_active ? 'border-l-success' :
      healthStatus === 'warning' ? 'border-l-warning' :
      healthStatus === 'inactive' ? 'border-l-text-disabled' : 'border-l-primary',
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-text-primary text-lg truncate">
              {schedule.name}
            </h3>
            
            {/* Status Indicator */}
            <div className="flex items-center gap-1">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  schedule.is_active ? 
                    (healthStatus === 'healthy' ? 'bg-success' : 'bg-warning') : 
                    'bg-text-disabled'
                )}
              />
              {healthStatus === 'warning' && schedule.is_active && (
                <AlertTriangle className="h-4 w-4 text-warning" />
              )}
            </div>
          </div>
          
          {schedule.description && (
            <p className="text-sm text-text-secondary mb-2 line-clamp-2">
              {schedule.description}
            </p>
          )}
        </div>

        {/* Status Badge e Menu */}
        <div className="flex items-center gap-2 ml-2">
          <div
            className={cn(
              'px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap',
              schedule.is_active
                ? healthStatus === 'healthy' 
                  ? 'bg-success/10 text-success'
                  : 'bg-warning/10 text-warning'
                : 'bg-text-disabled/10 text-text-disabled'
            )}
          >
            {schedule.is_active ? 
              (healthStatus === 'healthy' ? 'Ativo' : 'Atenção') : 
              'Inativo'
            }
          </div>

          {/* Menu de Ações */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActions(!showActions)}
              className="p-1"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            
            {showActions && (
              <div className="absolute right-0 top-8 bg-surface border border-border rounded-lg shadow-lg z-10 min-w-40">
                <div className="py-1">
                  {onEdit && (
                    <button
                      onClick={() => {
                        onEdit(schedule);
                        setShowActions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-surface-hover flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </button>
                  )}
                  
                  {onManageProperties && (
                    <button
                      onClick={() => {
                        onManageProperties(schedule);
                        setShowActions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-surface-hover flex items-center gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Gerenciar Propriedades
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setShowReport(!showReport);
                      setShowActions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-surface-hover flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {showReport ? 'Ocultar' : 'Ver'} Relatório
                  </button>
                  
                  {onDelete && (
                    <>
                      <div className="border-t border-border my-1" />
                      <button
                        onClick={() => {
                          onDelete(schedule);
                          setShowActions(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-danger/10 text-danger flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Deletar
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Informações Principais */}
      <div className="space-y-3 mb-4">
        {/* Horário e Frequência */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-text-secondary" />
              <span className="text-sm font-medium">
                {formatTime(schedule.execution_time)}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-text-secondary" />
              <span className="text-sm">
                {formatDaysOfWeek(schedule.days_of_week)}
              </span>
            </div>
          </div>
          
          {/* Nenhuma informação adicional de frequência por enquanto */}
        </div>

        {/* Propriedades e Performance */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-text-secondary" />
            <span className="text-sm">
              {schedule.properties_count || 0} propriedades
            </span>
            {schedule.total_properties && schedule.total_properties > (schedule.properties_count || 0) && (
              <span className="text-xs text-text-secondary">
                (de {schedule.total_properties})
              </span>
            )}
          </div>
          
          {/* Taxa de Sucesso */}
          {successRate !== null && (
            <div className="flex items-center gap-1">
              {successRate >= 80 ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-danger" />
              )}
              <span className={cn(
                'text-xs font-medium',
                successRate >= 80 ? 'text-success' : 'text-danger'
              )}>
                {successRate}% sucesso
              </span>
            </div>
          )}
        </div>

        {/* Status de Execução */}
        <div className="space-y-2">
          {/* Próxima Execução */}
          {schedule.is_active && (
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-medium text-text-primary">
                    {nextExecutionInfo.countdown}
                  </span>
                  {nextExecutionInfo.scheduledTime && nextExecutionInfo.countdown !== 'Não agendado' && (
                    <span className="text-xs text-text-tertiary">
                      • {nextExecutionInfo.scheduledTime}
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-secondary">Próxima execução</span>
              </div>
              {nextExecutionInfo.countdown === 'Atrasado' && (
                <AlertTriangle className="h-4 w-4 text-danger" />
              )}
            </div>
          )}

          {/* Última Execução */}
          {lastExecution && (
            <div className="flex items-center gap-2">
              {lastExecution.success ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-danger" />
              )}
              <span className="text-sm">
                Última: <span className="font-medium">{lastExecution.date}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Estatísticas de Jobs */}
      {((schedule.completed_jobs && schedule.completed_jobs > 0) || (schedule.failed_jobs && schedule.failed_jobs > 0)) && (
        <div className="flex items-center justify-between p-3 bg-surface rounded-lg mb-4">
          <div className="flex items-center gap-4">
            {schedule.completed_jobs && schedule.completed_jobs > 0 && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">
                  {schedule.completed_jobs}
                </span>
                <span className="text-xs text-text-secondary">concluídos</span>
              </div>
            )}
            
            {schedule.failed_jobs && schedule.failed_jobs > 0 && (
              <div className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-danger" />
                <span className="text-sm font-medium text-danger">
                  {schedule.failed_jobs}
                </span>
                <span className="text-xs text-text-secondary">falharam</span>
              </div>
            )}
          </div>
          
          {successRate !== null && (
            <div className={cn(
              'text-xs font-medium px-2 py-1 rounded',
              successRate >= 90 ? 'bg-success/10 text-success' :
              successRate >= 70 ? 'bg-warning/10 text-warning' :
              'bg-danger/10 text-danger'
            )}>
              {successRate >= 90 ? 'Excelente' :
               successRate >= 70 ? 'Bom' : 'Precisa atenção'}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        {/* Toggle Active/Inactive */}
        <Button
          variant={schedule.is_active ? "outline" : "primary"}
          size="sm"
          onClick={() => onToggleActive?.(schedule)}
          className="flex-1"
        >
          {schedule.is_active ? (
            <>
              <Pause className="h-4 w-4 mr-1" />
              Pausar
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1" />
              Ativar
            </>
          )}
        </Button>

        {/* Execute Now */}
        {schedule.is_active && onExecuteNow && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onExecuteNow(schedule)}
            className="flex-1"
          >
            <Zap className="h-4 w-4 mr-1" />
            Executar Agora
          </Button>
        )}

        {/* Quick Edit */}
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(schedule)}
            title="Editar cronograma"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Schedule Report */}
      {showReport && (
        <div className="mt-4 pt-4 border-t border-border">
          <ScheduleReport scheduleId={schedule.id} scheduleName={schedule.name} />
        </div>
      )}

      {/* Click outside handler para fechar menu */}
      {showActions && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowActions(false)}
        />
      )}
    </Card>
  );
};

export default RefreshScheduleCard;