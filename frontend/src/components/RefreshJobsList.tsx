/**
 * Lista de jobs de refresh
 */
import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  AlertCircle,
  Play,
  Search,
  RotateCcw
} from 'lucide-react';
import Card from '@/components/Card/Card';
import Button from '@/components/Button/Button';
import Input from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import type { RefreshJob } from '@/types/refresh';

interface RefreshJobsListProps {
  jobs: RefreshJob[];
  loading?: boolean;
  onRefresh?: () => void;
  onRetryJob?: (job: RefreshJob) => void;
  className?: string;
}

type JobStatus = 'all' | 'pending' | 'processing' | 'completed' | 'failed';

const RefreshJobsList: React.FC<RefreshJobsListProps> = ({
  jobs,
  loading = false,
  onRefresh,
  onRetryJob,
  className,
}) => {
  const [statusFilter, setStatusFilter] = useState<JobStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-danger" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <AlertCircle className="h-4 w-4 text-text-secondary" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'failed':
        return 'Falhou';
      case 'processing':
        return 'Processando';
      case 'pending':
        return 'Pendente';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-success bg-success/10';
      case 'failed':
        return 'text-danger bg-danger/10';
      case 'processing':
        return 'text-primary bg-primary/10';
      case 'pending':
        return 'text-warning bg-warning/10';
      default:
        return 'text-text-secondary bg-text-secondary/10';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) {
      return `${diffSeconds}s`;
    } else if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      const seconds = diffSeconds % 60;
      return `${minutes}m ${seconds}s`;
    } else {
      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  // Filtrar jobs
  const filteredJobs = jobs.filter((job) => {
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesSearch = !searchTerm || 
      job.schedule_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.id.toString().includes(searchTerm);
    
    return matchesStatus && matchesSearch;
  });

  const statusOptions: { value: JobStatus; label: string; count: number }[] = [
    { value: 'all', label: 'Todos', count: jobs.length },
    { value: 'pending', label: 'Pendentes', count: jobs.filter(j => j.status === 'pending').length },
    { value: 'processing', label: 'Processando', count: jobs.filter(j => j.status === 'processing').length },
    { value: 'completed', label: 'Concluídos', count: jobs.filter(j => j.status === 'completed').length },
    { value: 'failed', label: 'Falharam', count: jobs.filter(j => j.status === 'failed').length },
  ];

  return (
    <Card className={cn('p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-text-secondary" />
          <h3 className="font-semibold text-text-primary">
            Jobs de Refresh
          </h3>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>
        
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        {/* Filtro por Status */}
        <div className="flex gap-2 flex-wrap">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                statusFilter === option.value
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-hover'
              )}
            >
              {option.label} ({option.count})
            </button>
          ))}
        </div>

        {/* Busca */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            type="text"
            placeholder="Buscar por cronograma ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lista de Jobs */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-text-secondary mx-auto mb-3" />
          <p className="text-text-secondary">
            {jobs.length === 0 
              ? 'Nenhum job encontrado' 
              : 'Nenhum job corresponde aos filtros selecionados'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="p-3 border border-border rounded-lg hover:bg-surface/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header do Job */}
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(job.status)}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">
                          {job.schedule_name || `Cronograma #${job.schedule_id}`}
                        </span>
                        <span className="text-xs text-text-secondary">
                          #{job.id}
                        </span>
                      </div>
                    </div>

                    <div className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      getStatusColor(job.status)
                    )}>
                      {getStatusText(job.status)}
                    </div>
                  </div>

                  {/* Detalhes do Job */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-text-secondary">
                    <div>
                      <span className="font-medium">Criado:</span>{' '}
                      {formatDateTime(job.created_at)}
                    </div>
                    
                    {job.started_at && (
                      <div>
                        <span className="font-medium">Iniciado:</span>{' '}
                        {formatDateTime(job.started_at)}
                      </div>
                    )}
                    
                    {job.completed_at && (
                      <div>
                        <span className="font-medium">Concluído:</span>{' '}
                        {formatDateTime(job.completed_at)}
                      </div>
                    )}
                  </div>

                  {/* Duração */}
                  {job.started_at && (
                    <div className="mt-2 text-sm text-text-secondary">
                      <span className="font-medium">Duração:</span>{' '}
                      {formatDuration(job.started_at, job.completed_at)}
                    </div>
                  )}

                  {/* Progresso */}
                  {(job.total_properties && job.total_properties > 0) && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-text-secondary">
                          Progresso: {job.processed_properties}/{job.total_properties}
                        </span>
                        <span className="text-text-secondary">
                          {Math.round(((job.processed_properties || 0) / (job.total_properties || 1)) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-surface rounded-full h-2">
                        <div
                          className={cn(
                            'h-2 rounded-full transition-all duration-500',
                            job.status === 'completed' ? 'bg-success' :
                            job.status === 'failed' ? 'bg-danger' :
                            'bg-primary'
                          )}
                          style={{
                            width: `${((job.processed_properties || 0) / (job.total_properties || 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Resultado */}
                  {job.result && (
                    <div className="mt-2 p-2 bg-surface rounded text-sm">
                      <div className="font-medium text-text-primary mb-1">Resultado:</div>
                      <pre className="text-text-secondary whitespace-pre-wrap">
                        {typeof job.result === 'string' 
                          ? job.result 
                          : JSON.stringify(job.result, null, 2)
                        }
                      </pre>
                    </div>
                  )}

                  {/* Erro */}
                  {job.error && (
                    <div className="mt-2 p-2 bg-danger/5 border border-danger/20 rounded text-sm">
                      <div className="font-medium text-danger mb-1">Erro:</div>
                      <pre className="text-danger/80 whitespace-pre-wrap">
                        {job.error}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {job.status === 'failed' && onRetryJob && (
                  <div className="ml-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRetryJob(job)}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Repetir
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default RefreshJobsList;