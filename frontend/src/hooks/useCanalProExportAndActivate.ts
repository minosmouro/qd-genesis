import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { canalproService } from '@/services/canalpro.service';
import { ExportAndActivateResult } from '@/types/canalpro';
import { useExportAndActivateContext } from '@/contexts/ExportAndActivateContext';
import toast from 'react-hot-toast';

export const useCanalProExportAndActivate = () => {
  const queryClient = useQueryClient();
  // Read modal open state to avoid redundantly setting it and causing re-render loops
  const { setResult, setIsModalOpen, isModalOpen } = useExportAndActivateContext();

  // Mutation para iniciar exportação + ativação
  const exportAndActivateMutation = useMutation({
    mutationFn: (propertyIds?: number[]) => canalproService.exportAndActivateProperties(propertyIds),
    onSuccess: (data: ExportAndActivateResult) => {
      setResult(data);
      // Apenas abre o modal se ainda não estiver aberto (evita loops de atualização)
      try {
        if (!isModalOpen) {
          setIsModalOpen(true);
        }
      } catch (e) {
        // noop - garantir que erros aqui não quebrem o fluxo
      }

      const exportStats = data.export_stats;
      const activationResults = data.activation_results;

      const exportSuccess = exportStats.successful || 0;
      const exportFailed = exportStats.failed || 0;
      const activationSuccess = activationResults.filter(r => r.activated).length;
      const activationFailed = activationResults.filter(r => !r.activated).length;

      if (exportSuccess > 0 || activationSuccess > 0) {
        toast.success(
          `Operação concluída! Exportados: ${exportSuccess}, Ativados: ${activationSuccess}`
        );
      }

      if (exportFailed > 0 || activationFailed > 0) {
        toast.error(
          `Alguns erros ocorreram. Export falhas: ${exportFailed}, Ativação falhas: ${activationFailed}`
        );
      }

      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['canalpro-export-history'] });
    },
    onError: (error: any) => {
      setResult(null);
      toast.error('Erro na operação de exportação + ativação');
      console.error('Export and activate error:', error);
    }
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
    isExportingAndActivating: exportAndActivateMutation.isPending,
    credentialsStatus: credentialsQuery.data,

    // Ações
    exportAndActivateProperties: exportAndActivateMutation.mutate,
    checkCredentials,

    // Loading states
    isLoadingCredentials: credentialsQuery.isLoading,

    // Errors
    exportAndActivateError: exportAndActivateMutation.error,
    credentialsError: credentialsQuery.error,
  };
};

export default useCanalProExportAndActivate;