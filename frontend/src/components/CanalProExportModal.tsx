import React from 'react';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useCanalProExport } from '@/hooks/useCanalProExport';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface CanalProExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyIds?: number[];
}

const CanalProExportModal: React.FC<CanalProExportModalProps> = ({
  isOpen,
  onClose,
  propertyIds,
}) => {
  const {
    isExporting,
    isPolling,
    exportStatus,
    exportHistory,
    exportProperties,
    stopPolling,
  } = useCanalProExport();

  const handleStartExport = () => {
    exportProperties(propertyIds);
  };

  const handleClose = () => {
    stopPolling();
    onClose();
  };

  const getStatusIcon = () => {
    if (isExporting || isPolling) {
      return <Loader2 className="w-6 h-6 animate-spin text-primary dark:text-primary" />;
    }
    if (exportStatus && !exportStatus.is_running) {
      return exportStatus.failed > 0 ? (
        <XCircle className="w-6 h-6 text-danger dark:text-danger" />
      ) : (
        <CheckCircle className="w-6 h-6 text-primary dark:text-primary" />
      );
    }
    return <Clock className="w-6 h-6 text-text-secondary dark:text-text-secondary" />;
  };

  const getStatusMessage = () => {
    if (isExporting) {
      return 'Iniciando exportação...';
    }
    if (isPolling && exportStatus) {
      const progress = exportStatus.total_properties > 0
        ? Math.round((exportStatus.processed / exportStatus.total_properties) * 100)
        : 0;
      return `Exportando... ${progress}% (${exportStatus.processed}/${exportStatus.total_properties})`;
    }
    if (exportStatus && !exportStatus.is_running) {
      return exportStatus.failed > 0
        ? `Exportação concluída com erros: ${exportStatus.successful} sucesso, ${exportStatus.failed} falhas`
        : `Exportação concluída com sucesso! ${exportStatus.successful} imóveis exportados`;
    }
    return 'Pronto para exportar';
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Exportar para Canal Pro">
      <div className="space-y-6">
        {/* Status atual */}
        <div className="flex items-center space-x-3 p-4 bg-background rounded-lg">
          {getStatusIcon()}
          <div className="flex-1">
            <p className="font-medium">{getStatusMessage()}</p>
            {exportStatus?.current_property && (
              <p className="text-sm text-text-secondary dark:text-text-secondary">
                Processando: {exportStatus.current_property.title}
              </p>
            )}
          </div>
        </div>

        {/* Barra de progresso */}
        {isPolling && exportStatus && (
          <div className="space-y-2">
            <div className="w-full bg-surface dark:bg-surface rounded-full h-2">
              <div
                className="bg-primary dark:bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${exportStatus.total_properties > 0
                    ? (exportStatus.processed / exportStatus.total_properties) * 100
                    : 0}%`
                }}
              />
            </div>
            <div className="flex justify-between text-sm text-text-secondary dark:text-text-secondary">
              <span>{exportStatus.processed} de {exportStatus.total_properties} imóveis</span>
              {exportStatus.estimated_time_remaining && (
                <span>~{Math.round(exportStatus.estimated_time_remaining / 60)}min restantes</span>
              )}
            </div>
          </div>
        )}

        {/* Estatísticas detalhadas */}
        {exportStatus && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">{exportStatus.successful}</div>
              <div className="text-sm text-primary">Sucessos</div>
            </div>
            <div className="text-center p-3 bg-danger/10 rounded-lg">
              <div className="text-2xl font-bold text-danger">{exportStatus.failed}</div>
              <div className="text-sm text-danger">Falhas</div>
            </div>
            <div className="text-center p-3 bg-surface rounded-lg">
              <div className="text-2xl font-bold text-text-primary">{exportStatus.processed}</div>
              <div className="text-sm text-text-primary">Processados</div>
            </div>
          </div>
        )}

        {/* Histórico recente */}
        {exportHistory && exportHistory.data && exportHistory.data.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Últimas exportações</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {exportHistory.data.slice(0, 3).map((record: any) => (
                <div key={record.id} className="flex items-center justify-between p-2 bg-background rounded">
                  <div className="flex items-center space-x-2">
                    {record.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4 text-primary dark:text-primary" />
                    ) : record.status === 'failed' ? (
                      <XCircle className="w-4 h-4 text-danger dark:text-danger" />
                    ) : (
                      <Clock className="w-4 h-4 text-text-secondary dark:text-text-secondary" />
                    )}
                    <span className="text-sm text-text-secondary dark:text-text-secondary">
                      {new Date(record.started_at).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-sm text-text-secondary dark:text-text-secondary">
                    {record.successful}/{record.total_properties}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex justify-end space-x-3">
          <Button variant="ghost" onClick={handleClose}>
            {isPolling ? 'Parar e Fechar' : 'Fechar'}
          </Button>
          {!isExporting && !isPolling && (
            <Button onClick={handleStartExport}>
              Iniciar Exportação
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CanalProExportModal;