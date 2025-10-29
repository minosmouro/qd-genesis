import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import KPICard from '@/components/ui/KPICard';
import ProgressBar from '@/components/ui/ProgressBar';
import { BulkHighlightManager } from '@/components/BulkHighlightManager';
import { canalproService } from '@/services/canalpro.service';
import type { PublicationType } from '@/types/canalpro';
import { toast } from 'sonner';
import { Building2, Sparkles, FileX, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

interface HighlightsManagerModalProps {
  onSuccess?: () => void;
}

const HighlightsManagerModal: React.FC<HighlightsManagerModalProps> = () => {
  const [activeTab, setActiveTab] = useState<'summary' | 'bulk'>('summary');
  const [kpisLoading, setKpisLoading] = useState(false);
  const [contractKPIs, setContractKPIs] = useState<any>(null);

  const validTypes: PublicationType[] = ['STANDARD', 'PREMIUM', 'SUPER_PREMIUM', 'PREMIERE_1', 'PREMIERE_2', 'TRIPLE'];
  const typeLabels: Record<PublicationType, string> = {
    STANDARD: 'Padrão',
    PREMIUM: 'Destaque',
    SUPER_PREMIUM: 'Super Destaque',
    PREMIERE_1: 'Destaque Exclusivo+',
    PREMIERE_2: 'Destaque Superior+',
    TRIPLE: 'Destaque Triplo+',
  };

  const loadContractKPIs = async () => {
    setKpisLoading(true);
    try {
      const data = await canalproService.getContractKPIs();
      if (data.success) {
        setContractKPIs(data);
        toast.success('KPIs atualizados!');
      } else {
        toast.error('Erro ao carregar KPIs');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar KPIs');
    } finally {
      setKpisLoading(false);
    }
  };

  useEffect(() => {
    loadContractKPIs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Visual com Gradiente Dourado */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-6 shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.6))]"></div>
        <div className="relative flex items-start gap-4">
          <div className="rounded-xl bg-white/20 backdrop-blur-sm p-3 ring-1 ring-white/30 animate-pulse">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              Gerenciar Destaques
              <span className="px-2 py-0.5 text-xs font-bold bg-white/20 rounded-full">Principal</span>
            </h2>
            <p className="text-orange-100 text-sm leading-relaxed">
              Acompanhe KPIs em tempo real, visualize a utilização da sua carteira e gerencie destaques premium em massa com total controle.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 p-1 bg-surface/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
            activeTab === 'summary'
              ? 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/20 scale-105'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface/80'
          }`}
        >
          <Building2 className="h-4 w-4 flex-shrink-0" />
          <span className="hidden sm:inline">Resumo da Carteira</span>
          <span className="sm:hidden">Resumo</span>
          {contractKPIs && (
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'summary' 
                ? 'bg-white/20' 
                : 'bg-primary/10 text-primary'
            }`}>
              {contractKPIs.total_properties ?? 0}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
            activeTab === 'bulk'
              ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 scale-105'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface/80'
          }`}
        >
          <Sparkles className="h-4 w-4 flex-shrink-0" />
          <span className="hidden sm:inline">Gestão em Massa</span>
          <span className="sm:hidden">Em Massa</span>
        </button>
      </div>

      {/* Tab: Resumo da Carteira */}
      {activeTab === 'summary' && (
      <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-surface p-6 shadow-xl animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-text-primary">Resumo da carteira</h4>
              <p className="text-xs text-text-secondary">Acompanhe a utilização em tempo real</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadContractKPIs} 
            disabled={kpisLoading}
            className="hover:bg-primary/10"
          >
            {kpisLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Atualizando
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </>
            )}
          </Button>
        </div>

        {contractKPIs ? (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <KPICard
                title="Total de imóveis"
                value={contractKPIs.total_properties ?? 0}
                icon={<Building2 className="h-6 w-6" />}
                color="blue"
                subtitle="Na carteira"
              />
              <KPICard
                title="Com destaque"
                value={contractKPIs.highlighted_count ?? 0}
                icon={<Sparkles className="h-6 w-6" />}
                color="green"
                subtitle="Anúncios destacados"
              />
              <KPICard
                title="Sem destaque"
                value={contractKPIs.non_highlight_count ?? 0}
                icon={<FileX className="h-6 w-6" />}
                color="yellow"
                subtitle="Anúncios padrão"
              />
            </div>

            {/* Limite Total */}
            {contractKPIs.usage?.total && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700">
                <h5 className="text-xs font-semibold text-text-primary mb-2">
                  Limite total de anúncios
                </h5>
                <ProgressBar
                  value={contractKPIs.usage.total.used}
                  max={contractKPIs.usage.total.limit}
                  size="md"
                  animated
                />
              </div>
            )}

            {/* Destaques por Tipo - Cards com Gradientes */}
            <div>
              <h5 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Destaques por tipo de publicação
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {validTypes.map(t => {
                  const usage = contractKPIs.usage?.highlights_by_type?.[t];
                  const used = Number(usage?.used ?? (contractKPIs.publication_counts?.[t] ?? 0));
                  const limit = usage?.limit as number | null | undefined;
                  const over = usage?.over_limit ?? (limit != null ? used > (limit as number) : false);
                  return (
                    <div
                      key={t}
                      className={`group relative overflow-hidden p-4 rounded-xl border transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                        over
                          ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-300 dark:border-red-700 shadow-red-100 dark:shadow-red-900/20'
                          : 'bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary'
                      }`}
                    >
                      {/* Badge decorativa */}
                      <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Sparkles className="h-8 w-8" />
                      </div>
                      
                      <p className="relative text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                        {typeLabels[t] ?? t}
                      </p>
                      <p className="relative text-3xl font-bold text-text-primary mb-3">
                        {used}
                        {limit != null && (
                          <span className="text-sm font-normal text-text-secondary ml-2">/ {limit}</span>
                        )}
                      </p>
                      {limit != null && (
                        <ProgressBar value={used} max={limit} size="sm" animated showPercentage={false} />
                      )}
                      {over && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-danger font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          Acima do limite
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Carregue os KPIs para visualizar o resumo da carteira.
            </p>
            <Button onClick={loadContractKPIs} disabled={kpisLoading} size="lg" className="shadow-lg">
              {kpisLoading ? 'Carregando...' : 'Carregar KPIs'}
            </Button>
          </div>
        )}
      </div>
      )}

      {/* Tab: Gestão em Massa */}
      {activeTab === 'bulk' && (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-6 shadow-xl animate-in fade-in duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-lg bg-amber-500/20 p-2 animate-pulse">
            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Gestão de destaques</h3>
            <p className="text-xs text-text-secondary">Aplique ou remova destaques em massa</p>
          </div>
        </div>
        <BulkHighlightManager
          typeLabels={typeLabels}
          validTypes={validTypes}
          onSuccess={() => void loadContractKPIs()}
        />
      </div>
      )}
    </div>
  );
};

export default HighlightsManagerModal;
