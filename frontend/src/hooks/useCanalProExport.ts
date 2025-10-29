import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { canalproService } from '@/services/canalpro.service';
import { ExportResult } from '@/types/canalpro';
import toast from 'react-hot-toast';

export const useCanalProExport = () => {
  const queryClient = useQueryClient();
  const [isPolling, setIsPolling] = useState(false);

  // Mutation para iniciar exportação
  const exportMutation = useMutation({
    mutationFn: (propertyIds?: number[]) => canalproService.exportProperties(propertyIds),
    onSuccess: (result: ExportResult) => {
      // Suporte a múltiplos formatos de retorno do backend
      const successFlag = typeof result.success !== 'undefined' ? result.success : undefined;
      const exportedProcessed = result.processed ?? (typeof result.export_id === 'object' ? (result.export_id as any).processed : undefined);
      const exportedFailed = result.failed ?? (typeof result.export_id === 'object' ? (result.export_id as any).failed : undefined);

      if (successFlag === true || typeof result.export_id !== 'undefined' || exportedProcessed !== undefined) {
        // iniciar polling do status sempre que o backend criou um job
        toast.success(`Exportação iniciada! ${exportedProcessed ?? '-'} processado(s), ${exportedFailed ?? 0} falha(s)`);
        setIsPolling(true);
      } else {
        toast.error('Falha ao iniciar exportação');
      }
      queryClient.invalidateQueries({ queryKey: ['canalpro-export-history'] });
    },
    onError: (error) => {
      toast.error('Erro ao iniciar exportação');
      console.error('Export error:', error);
    }
  });

  // Query para status da exportação
  const statusQuery = useQuery({
    queryKey: ['canalpro-export-status'],
    queryFn: canalproService.getExportStatus,
    enabled: isPolling,
    refetchInterval: isPolling ? 2000 : false, // Poll a cada 2 segundos
  });

  // Parar polling quando exportação terminar
  useEffect(() => {
    if (statusQuery.data && !statusQuery.data.is_running) {
      setIsPolling(false);
      if (statusQuery.data.successful > 0) {
        toast.success(`Exportação concluída! ${statusQuery.data.successful} imóveis exportados`);
      }
      queryClient.invalidateQueries({ queryKey: ['canalpro-export-history'] });
    }
  }, [statusQuery.data, queryClient]);

  // Query para histórico
  const historyQuery = useQuery({
    queryKey: ['canalpro-export-history'],
    queryFn: () => canalproService.getExportHistory(),
  });

  // Query para verificar credenciais
  const credentialsQuery = useQuery({
    queryKey: ['canalpro-credentials-check'],
    queryFn: canalproService.checkCredentials,
    enabled: false, // Só executar quando solicitado
  });

  // Função para verificar credenciais
  const checkCredentials = () => {
    credentialsQuery.refetch();
  };

  return {
    // Estado
    isExporting: exportMutation.isPending,
    isPolling,
    exportStatus: statusQuery.data,
    exportHistory: historyQuery.data,
    credentialsStatus: credentialsQuery.data,

    // Ações
    exportProperties: exportMutation.mutate,
    stopPolling: () => setIsPolling(false),
    checkCredentials,

    // Loading states
    isLoadingStatus: statusQuery.isLoading,
    isLoadingHistory: historyQuery.isLoading,
    isLoadingCredentials: credentialsQuery.isLoading,

    // Errors
    exportError: exportMutation.error,
    statusError: statusQuery.error,
    historyError: historyQuery.error,
    credentialsError: credentialsQuery.error,
  };
};