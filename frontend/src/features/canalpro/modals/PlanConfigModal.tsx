import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { canalproService } from '@/services/canalpro.service';
import type { CanalProContract, PublicationType } from '@/types/canalpro';
import { toast } from 'sonner';
import { Settings, Loader2, Save, RefreshCw, Trash2, AlertTriangle, FileBarChart, Sparkles } from 'lucide-react';

interface PlanConfigModalProps {
  onSuccess?: () => void;
}

const PlanConfigModal: React.FC<PlanConfigModalProps> = ({ onSuccess }) => {
  const [contractLoading, setContractLoading] = useState(false);
  const [contractMessage, setContractMessage] = useState<string | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contractNumber, setContractNumber] = useState('');
  const [maxListings, setMaxListings] = useState('');
  const [highlightLimits, setHighlightLimits] = useState<Record<PublicationType, number>>({
    STANDARD: 0,
    PREMIUM: 0,
    SUPER_PREMIUM: 0,
    PREMIERE_1: 0,
    PREMIERE_2: 0,
    TRIPLE: 0,
  });

  const contractNumberId = 'contract-number';
  const maxListingsId = 'contract-max-listings';

  const validTypes: PublicationType[] = ['STANDARD', 'PREMIUM', 'SUPER_PREMIUM', 'PREMIERE_1', 'PREMIERE_2', 'TRIPLE'];
  const typeLabels: Record<PublicationType, string> = {
    STANDARD: 'Padrão',
    PREMIUM: 'Destaque',
    SUPER_PREMIUM: 'Super Destaque',
    PREMIERE_1: 'Destaque Exclusivo+',
    PREMIERE_2: 'Destaque Superior+',
    TRIPLE: 'Destaque Triplo+',
  };

  const loadContractConfig = async () => {
    setContractLoading(true);
    setContractMessage(null);
    setContractError(null);
    try {
      const data = await canalproService.getContractConfig();
      if (data.success && data.config) {
        const contract: CanalProContract = data.config;
        setContractNumber(contract.contract_number ?? '');
        setMaxListings(contract.max_listings != null ? String(contract.max_listings) : '');
        const hl = contract.highlight_limits || {};
        setHighlightLimits({
          STANDARD: hl.STANDARD ?? 0,
          PREMIUM: hl.PREMIUM ?? 0,
          SUPER_PREMIUM: hl.SUPER_PREMIUM ?? 0,
          PREMIERE_1: hl.PREMIERE_1 ?? 0,
          PREMIERE_2: hl.PREMIERE_2 ?? 0,
          TRIPLE: hl.TRIPLE ?? 0,
        });
        setContractMessage('Configuração carregada com sucesso!');
        toast.success('Configuração carregada');
      } else {
        setContractError('Erro ao carregar configuração');
        toast.error('Erro ao carregar');
      }
    } catch (err: any) {
      setContractError(err?.message || 'Erro ao carregar configuração');
      toast.error('Erro ao carregar');
    } finally {
      setContractLoading(false);
    }
  };

  const saveContractConfig = async () => {
    setContractLoading(true);
    setContractMessage(null);
    setContractError(null);
    try {
      const payload = {
        contract_number: contractNumber || undefined,
        max_listings: maxListings ? Number(maxListings) : undefined,
        highlight_limits: highlightLimits,
      };
      const data = await canalproService.saveContractConfig(payload);
      if (data.success) {
        setContractMessage('Configuração salva com sucesso!');
        toast.success('Configuração salva!');
        onSuccess?.();
      } else {
        setContractError('Erro ao salvar configuração');
        toast.error('Erro ao salvar');
      }
    } catch (err: any) {
      setContractError(err?.message || 'Erro ao salvar configuração');
      toast.error('Erro ao salvar');
    } finally {
      setContractLoading(false);
    }
  };

  const deleteContractConfig = async () => {
    setContractLoading(true);
    setContractMessage(null);
    setContractError(null);
    try {
      const data = await canalproService.deleteContractConfig();
      if (data.success) {
        setContractMessage('Configuração removida com sucesso!');
        setContractNumber('');
        setMaxListings('');
        setHighlightLimits({
          STANDARD: 0,
          PREMIUM: 0,
          SUPER_PREMIUM: 0,
          PREMIERE_1: 0,
          PREMIERE_2: 0,
          TRIPLE: 0,
        });
        toast.success('Configuração removida');
        onSuccess?.();
      } else {
        setContractError('Erro ao remover configuração');
        toast.error('Erro ao remover');
      }
    } catch (err: any) {
      setContractError(err?.message || 'Erro ao remover configuração');
      toast.error('Erro ao remover');
    } finally {
      setContractLoading(false);
    }
  };

  useEffect(() => {
    loadContractConfig();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Visual com Gradiente */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 p-6 shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.6))]"></div>
        <div className="relative flex items-start gap-4">
          <div className="rounded-xl bg-white/20 backdrop-blur-sm p-3 ring-1 ring-white/30">
            <Settings className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">Configurar Plano CanalPro</h2>
            <p className="text-purple-100 text-sm leading-relaxed">
              Configure limites contratuais e cotas de destaques do seu plano CanalPro. 
              Ajuste os valores conforme seu contrato para acompanhar a utilização.
            </p>
          </div>
        </div>
      </div>

      {/* Card Principal com Sombra Elevada */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-surface p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-lg bg-primary/10 p-2">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">Configurações do contrato</h3>
        </div>
        
        {/* Formulário sempre visível */}
        <div className="space-y-6">
          {/* Card de Informações Gerais */}
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
              <FileBarChart className="h-4 w-4" />
              Informações do Contrato
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2 block" htmlFor={contractNumberId}>
                  Número do contrato
                </label>
                <input
                  id={contractNumberId}
                  className="p-3 text-sm rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-background w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={contractNumber}
                  onChange={e => setContractNumber(e.target.value)}
                  placeholder="Ex: CNL-2024-001"
                  disabled={contractLoading}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2 block" htmlFor={maxListingsId}>
                  Máximo de anúncios
                </label>
                <input
                  id={maxListingsId}
                  className="p-3 text-sm rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-background w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={maxListings}
                  onChange={e => setMaxListings(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Ex: 50"
                  disabled={contractLoading}
                />
              </div>
            </div>
          </div>

          {/* Card de Limites de Destaque */}
          <div className="rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 p-4">
            <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Limites de Destaque por Tipo
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {validTypes.map(t => {
                const inputId = `highlight-${t.toLowerCase()}`;
                return (
                  <div key={t} className="relative">
                    <label className="text-xs font-medium text-purple-900 dark:text-purple-300 mb-2 block" htmlFor={inputId}>
                      {typeLabels[t] ?? t}
                    </label>
                    <div className="relative">
                      <input
                        id={inputId}
                        className="p-3 text-sm rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-white dark:bg-background w-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all pr-8"
                        value={String(highlightLimits[t] ?? 0)}
                        onChange={e => {
                          const val = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
                          setHighlightLimits(prev => ({ ...prev, [t]: val }));
                        }}
                        disabled={contractLoading}
                        placeholder="0"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">
                        un
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ações com Botões Destacados */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button 
              onClick={saveContractConfig} 
              disabled={contractLoading} 
              size="lg"
              className="flex-1 min-w-[140px] shadow-lg hover:shadow-xl"
            >
              {contractLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configuração
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={loadContractConfig}
              disabled={contractLoading}
              className="hover:bg-surface"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recarregar
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={contractLoading}
              className="hover:bg-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </Button>
          </div>

          {/* Feedback Messages */}
          {(contractMessage || contractError) && (
            <div className="space-y-2">
              {contractMessage && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
                  {contractMessage}
                </div>
              )}
              {contractError && (
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                  {contractError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={async () => {
          await deleteContractConfig();
          setDeleteConfirmOpen(false);
        }}
        title="Remover configuração de plano"
        description="Esta ação remove todos os limites e configurações do contrato CanalPro. Destaques ativos permanecem, mas você perderá o controle de cotas."
        confirmText="Sim, remover"
        confirmVariant="danger"
        icon={<AlertTriangle className="h-6 w-6 text-red-500" />}
        loading={contractLoading}
      />
    </div>
  );
};

export default PlanConfigModal;
