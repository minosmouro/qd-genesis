import React from 'react';
import { CheckCircle, XCircle, Zap } from 'lucide-react';
import { useExportAndActivateContext } from '@/contexts/ExportAndActivateContext';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface CanalProExportAndActivateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CanalProExportAndActivateModal: React.FC<CanalProExportAndActivateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { result, setIsModalOpen } = useExportAndActivateContext();

  const handleClose = () => {
    setIsModalOpen(false);
    onClose();
  };

  const getStatusIcon = (activated: boolean) => {
    return activated ? (
      <CheckCircle className="w-5 h-5 text-primary dark:text-primary" />
    ) : (
      <XCircle className="w-5 h-5 text-danger dark:text-danger" />
    );
  };

  const exportStats = result?.export_stats;
  const activationResults = result?.activation_results || [];
  const exportErrors = (exportStats?.errors || []) as Array<{
    property_id: number;
    external_id?: string;
    remote_id?: string;
    code?: string;
    message: string;
    step?: 'export' | 'activate';
  }>;

  const exportSuccess = exportStats?.successful || 0;
  const exportFailed = exportStats?.failed || 0;
  const activationSuccess = activationResults.filter(r => r.activated).length;
  const activationFailed = activationResults.filter(r => !r.activated).length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Exportar + Ativar para Canal Pro">
      <div className="space-y-6">
        {result && (
          <>
            {/* Resumo geral */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-primary dark:text-primary" />
                  <span className="font-medium">Exportação</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-primary">{exportSuccess}</div>
                  <div className="text-sm text-primary">Sucessos</div>
                  {exportFailed > 0 && (
                    <div className="text-sm text-danger">{exportFailed} falhas</div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-success/10 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-success dark:text-success" />
                  <span className="font-medium">Ativação</span>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-success">{activationSuccess}</div>
                  <div className="text-sm text-success">Ativados</div>
                  {activationFailed > 0 && (
                    <div className="text-sm text-danger">{activationFailed} falhas</div>
                  )}
                </div>
              </div>
            </div>

            {/* Detalhes por imóvel */}
            <div className="space-y-3">
              <h3 className="font-medium">Detalhes por imóvel</h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {activationResults.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-background rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(item.activated)}
                      <div>
                        <div className="font-medium">Imóvel #{item.property_id}</div>
                        {item.remote_id && (
                          <div className="text-sm text-text-secondary dark:text-text-secondary">
                            Remote ID: {item.remote_id}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {item.activated ? (
                        <span className="text-sm text-success">Ativado</span>
                      ) : (
                        <span className="text-sm text-danger">
                          {item.error || 'Falhou'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Erros na exportação */}
            {exportErrors.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">Erros na exportação</h3>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {exportErrors.map((err, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 bg-background rounded-lg">
                      <div className="flex items-center space-x-3">
                        <XCircle className="w-5 h-5 text-danger dark:text-danger" />
                        <div>
                          <div className="font-medium">Imóvel #{err.property_id}{err.external_id ? ` • ${err.external_id}` : ''}</div>
                          <div className="text-sm text-text-secondary dark:text-text-secondary">
                            {err.code ? `${err.code} — ` : ''}{err.message}
                          </div>
                          {err.remote_id && (
                            <div className="text-xs text-text-secondary dark:text-text-secondary">Remote ID: {err.remote_id}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-text-secondary dark:text-text-secondary">Etapa: {err.step || 'export'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensagem final */}
            <div className="p-4 bg-background rounded-lg">
              <p className="text-sm text-text-secondary dark:text-text-secondary">
                {activationSuccess > 0
                  ? `✅ ${activationSuccess} imóvel(ns) foram exportados e ativados com sucesso no Canal Pro!`
                  : '⚠️ Nenhum imóvel foi ativado. Verifique os erros acima.'
                }
              </p>
            </div>
          </>
        )}

        {/* Ações */}
        <div className="flex justify-end space-x-3">
          <Button variant="ghost" onClick={handleClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CanalProExportAndActivateModal;