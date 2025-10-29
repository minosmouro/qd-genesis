import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Loader2, RefreshCw, X } from 'lucide-react';
import { useCanalProExportAndActivate } from '@/hooks/useCanalProExportAndActivate';
import { ExportAndActivateResult } from '@/types/canalpro';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';

interface ExportAfterPublishModalProps {
  propertyId: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
  isEditMode?: boolean;
  editPropertyId?: number;
}

const ExportAfterPublishModal: React.FC<ExportAfterPublishModalProps> = ({
  propertyId,
  isOpen,
  onClose,
  onNavigate,
  isEditMode = false,
  editPropertyId,
}) => {
  const queryClient = useQueryClient();
  const [exportResult, setExportResult] = useState<ExportAndActivateResult | null>(null);
  const [hasStartedExport, setHasStartedExport] = useState(false);

  const {
    exportAndActivateProperties,
    isExportingAndActivating,
    exportAndActivateError,
  } = useCanalProExportAndActivate();

  const handleExportNow = async () => {
    if (!propertyId) return;

    setHasStartedExport(true);
    try {
      await exportAndActivateProperties([propertyId]);
      // O resultado será definido pelo hook via context
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    } catch (error) {
      console.error('Erro na exportação:', error);
      toast.error('Erro na exportação. Tente novamente.');
    }
  };

  const handleRetry = () => {
    setExportResult(null);
    setHasStartedExport(false);
    handleExportNow();
  };

  const handleClose = () => {
    setExportResult(null);
    setHasStartedExport(false);
    onClose();
    
    // Navegar após fechar o modal
    if (onNavigate) {
      if (isEditMode && editPropertyId) {
        onNavigate(`/properties/${editPropertyId}`);
      } else {
        onNavigate('/properties');
      }
    }
  };

  const getExportStats = () => {
    if (!exportResult) return null;

    const exportStats = exportResult.export_stats;
    const activationResults = exportResult.activation_results;

    return {
      exportSuccess: exportStats.successful || 0,
      exportFailed: exportStats.failed || 0,
      activationSuccess: activationResults.filter(r => r.activated).length,
      activationFailed: activationResults.filter(r => !r.activated).length,
    };
  };

  const stats = getExportStats();

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">
            Imóvel Publicado com Sucesso! 🎉
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <p className="text-text-secondary">
            Seu imóvel foi salvo e publicado no sistema. Agora você pode exportá-lo para o Canal Pro (ZAP, Viva Real, OLX).
          </p>

          {/* Export Status */}
          {hasStartedExport && (
            <div className="border rounded-lg p-4 bg-background-secondary">
              {isExportingAndActivating ? (
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <div>
                    <p className="font-medium text-text-primary">Exportando...</p>
                    <p className="text-sm text-text-secondary">
                      Enviando dados e imagens para o Canal Pro
                    </p>
                  </div>
                </div>
              ) : stats ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    {(stats.exportSuccess > 0 || stats.activationSuccess > 0) ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <XCircle className="w-5 h-5 text-danger" />
                    )}
                    <div>
                      <p className="font-medium text-text-primary">
                        {(stats.exportSuccess > 0 || stats.activationSuccess > 0)
                          ? 'Exportação Concluída!'
                          : 'Exportação Falhou'
                        }
                      </p>
                      <p className="text-sm text-text-secondary">
                        Exportados: {stats.exportSuccess} | Ativados: {stats.activationSuccess}
                      </p>
                    </div>
                  </div>

                  {(stats.exportFailed > 0 || stats.activationFailed > 0) && (
                    <div className="text-sm text-danger">
                      Falhas: Exportação ({stats.exportFailed}) | Ativação ({stats.activationFailed})
                    </div>
                  )}
                </div>
              ) : exportAndActivateError ? (
                <div className="flex items-center space-x-3">
                  <XCircle className="w-5 h-5 text-danger" />
                  <div>
                    <p className="font-medium text-text-primary">Erro na Exportação</p>
                    <p className="text-sm text-text-secondary">
                      {exportAndActivateError.message || 'Ocorreu um erro inesperado'}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Error Message */}
          {exportAndActivateError && !isExportingAndActivating && (
            <div className="bg-danger/10 border border-danger/20 rounded-lg p-3">
              <p className="text-sm text-danger">
                {exportAndActivateError.message || 'Erro na exportação. Verifique suas credenciais.'}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3 mt-6">
          {!hasStartedExport ? (
            <>
              <Button
                variant="primary"
                onClick={handleExportNow}
                disabled={isExportingAndActivating}
                className="flex-1"
              >
                {isExportingAndActivating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Exportando...
                  </>
                ) : (
                  'Exportar Agora'
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={handleClose}
                className="flex-1"
              >
                Finalizar
              </Button>
            </>
          ) : stats && (stats.exportFailed > 0 || stats.activationFailed > 0) ? (
            <>
              <Button
                variant="primary"
                onClick={handleRetry}
                disabled={isExportingAndActivating}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
              <Button
                variant="secondary"
                onClick={handleClose}
                className="flex-1"
              >
                Fechar
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={handleClose}
              className="w-full"
            >
              Concluído
            </Button>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-text-secondary">
            💡 A exportação pode levar alguns minutos. Você pode acompanhar o progresso na página de imóveis.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ExportAfterPublishModal;
