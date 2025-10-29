import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import { canalproService } from '@/services/canalpro.service';
import { toast } from 'sonner';
import { Download, Loader2, RefreshCw, Settings } from 'lucide-react';

interface ImportPropertiesModalProps {
  onSuccess?: () => void;
}

const ImportPropertiesModal: React.FC<ImportPropertiesModalProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importOnlyActive, setImportOnlyActive] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('importOnlyActive');
      return v === null ? true : v === 'true';
    } catch {
      return true;
    }
  });
  const [importResult, setImportResult] = useState<any>(null);
  const [importRawError, setImportRawError] = useState<any>(null);
  const [showImportErrorDetails, setShowImportErrorDetails] = useState(false);

  const startImportAll = async (onlyActive: boolean) => {
    setIsImporting(true);
    setImportProgress(0);
    setImportMessage(null);
    setImportError(null);
    setImportResult(null);
    setImportRawError(null);

    try {
      localStorage.setItem('importOnlyActive', String(onlyActive));
    } catch {}

    try {
      setImportMessage('Iniciando importação...');
      setImportProgress(10);

      const response = await canalproService.importProperties(onlyActive);
      setImportProgress(100);

      if (response.success) {
        setImportMessage('Importação concluída com sucesso!');
        setImportResult(response.data);
        toast.success('Importação concluída!');
        onSuccess?.();
      } else {
        const errorMsg = response.error || 'Erro desconhecido durante a importação.';
        
        // Verifica se é erro de token/credenciais
        if (errorMsg.includes('No valid integration token') || errorMsg.includes('credentials')) {
          setImportError(
            '⚠️ Credenciais do CanalPro não configuradas ou expiradas.\n\n' +
            'Por favor, vá até "Configurações de Integração" e vincule sua conta CanalPro novamente.'
          );
          toast.error('Credenciais do CanalPro não configuradas', { duration: 6000 });
        } else {
          setImportError(errorMsg);
          toast.error('Falha na importação');
        }
        
        setImportRawError(response.data);
      }
    } catch (err: any) {
      setImportProgress(0);
      const errorMsg = err?.message || 'Erro ao tentar importar imóveis.';
      
      // Verifica se é erro de token/credenciais
      if (errorMsg.includes('No valid integration token') || errorMsg.includes('credentials')) {
        setImportError(
          '⚠️ Credenciais do CanalPro não configuradas ou expiradas.\n\n' +
          'Por favor, vá até "Configurações de Integração" e vincule sua conta CanalPro novamente.'
        );
        toast.error('Credenciais do CanalPro não configuradas', { duration: 6000 });
      } else {
        setImportError(errorMsg);
        toast.error('Erro na importação');
      }
      
      setImportRawError(err);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Visual com Gradiente Azul */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 p-6 shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.6))]"></div>
        <div className="relative flex items-start gap-4">
          <div className="rounded-xl bg-white/20 backdrop-blur-sm p-3 ring-1 ring-white/30">
            <Download className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">Importar Imóveis</h2>
            <p className="text-cyan-100 text-sm leading-relaxed">
              Sincronize imóveis em massa do CanalPro para o sistema. Acompanhe o progresso em tempo real e veja resultados detalhados.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-surface p-6 shadow-xl space-y-6">
        {/* Alert Informativo com Estilo */}
        <div className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-2 border-blue-200 dark:border-blue-800">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-start gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-300 text-sm mb-1">Importante</p>
              <p className="text-blue-700 dark:text-blue-400 text-sm">
                Certifique-se de que a vinculação CanalPro esteja ativa antes de importar.
              </p>
            </div>
          </div>
        </div>

        {/* Opções de Importação */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-border">
          <input
            type="checkbox"
            checked={importOnlyActive}
            onChange={e => setImportOnlyActive(e.target.checked)}
            disabled={isImporting}
            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/20"
            id="import-only-active"
          />
          <label htmlFor="import-only-active" className="flex-1 text-sm font-medium text-text-primary cursor-pointer">
            Importar apenas imóveis ativos
            <span className="block text-xs text-text-secondary mt-0.5">Recomendado para otimizar a importação</span>
          </label>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            onClick={() => startImportAll(importOnlyActive)} 
            disabled={isImporting}
            size="lg"
            className="flex-1 min-w-[180px] shadow-lg hover:shadow-xl"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                Importar agora
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            disabled={isImporting}
            onClick={() => {
              setImportResult(null);
              setImportMessage(null);
              setImportError(null);
              setImportProgress(0);
            }}
            size="lg"
            className="hover:bg-surface"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Limpar resultado
          </Button>
        </div>

        {/* Progresso com Design Melhorado */}
        <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border border-border">
          <ProgressBar
            value={importProgress}
            max={100}
            size="md"
            animated={isImporting}
            showPercentage={false}
            variant={importError ? 'danger' : 'success'}
          />
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-text-primary">
              {isImporting
                ? 'Processando...'
                : importProgress >= 100
                  ? '✓ Concluído'
                  : `${importProgress}%`}
            </span>
            <span
              className={
                importError
                  ? 'text-danger'
                  : importMessage
                    ? 'text-primary'
                    : 'text-text-secondary'
              }
            >
              {importError || importMessage || (isImporting ? 'Importando...' : 'Pronto')}
            </span>
          </div>
        </div>

        {/* Alert de Erro de Credenciais */}
        {importError && (importError.includes('No valid integration token') || importError.includes('Credenciais')) && (
          <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-2 border-red-300 dark:border-red-700 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-red-500/20 p-2">
                <Settings className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2">
                  Credenciais não configuradas
                </h4>
                <p className="text-sm text-red-700 dark:text-red-400 mb-4 whitespace-pre-line">
                  {importError}
                </p>
                <Button
                  onClick={() => navigate('/canalpro?modal=settings')}
                  variant="danger"
                  size="md"
                  className="shadow-lg"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Ir para Configurações de Integração
                </Button>
              </div>
            </div>
          </div>
        )}

        {importResult && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">
              Resultado da importação
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded border bg-surface text-center">
                <div className="text-xs text-text-secondary">Inseridos</div>
                <div className="text-xl font-semibold">{importResult.inserted ?? 0}</div>
              </div>
              <div className="p-3 rounded border bg-surface text-center">
                <div className="text-xs text-text-secondary">Atualizados</div>
                <div className="text-xl font-semibold">{importResult.updated ?? 0}</div>
              </div>
              <div className="p-3 rounded border bg-surface text-center">
                <div className="text-xs text-text-secondary">Pulados</div>
                <div className="text-xl font-semibold">{importResult.skipped ?? 0}</div>
              </div>
              <div className="p-3 rounded border bg-surface text-center">
                <div className="text-xs text-text-secondary">Total no portal</div>
                <div className="text-xl font-semibold">{importResult.total_listings ?? '-'}</div>
              </div>
            </div>

            {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
              <div>
                <h4 className="font-medium text-text-primary mb-2">Erros detalhados</h4>
                <div className="overflow-auto rounded border max-h-64">
                  <table className="min-w-full text-sm">
                    <thead className="bg-background text-text-secondary sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">External ID</th>
                        <th className="px-3 py-2 text-left">Mensagem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.errors.map((err: any, idx: number) => {
                        const external = err?.external_id || err?.externalId || '-';
                        const message = err?.error || err?.message || JSON.stringify(err);
                        return (
                          <tr key={idx} className="odd:bg-background even:bg-surface">
                            <td className="px-3 py-2">{external}</td>
                            <td className="px-3 py-2">
                              <pre className="whitespace-pre-wrap text-xs">{message}</pre>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importRawError && (
              <div className="mt-3">
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => setShowImportErrorDetails(s => !s)}
                >
                  {showImportErrorDetails ? 'Ocultar detalhes' : 'Ver detalhes da resposta'}
                </button>
                {showImportErrorDetails && (
                  <pre className="mt-2 p-2 bg-surface text-xs overflow-auto rounded border max-h-48">
                    {typeof importRawError === 'string'
                      ? importRawError
                      : JSON.stringify(importRawError, Object.getOwnPropertyNames(importRawError), 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportPropertiesModal;
