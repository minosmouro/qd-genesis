import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import KPICard from '@/components/ui/KPICard';
import Button from '@/components/ui/Button';
import { propertiesService } from '@/services/properties.service';
import type { PropertyDashboardStats } from '@/services/properties.service';
import { 
  Building2, 
  TrendingUp, 
  RefreshCw, 
  Home,
  AlertCircle,
  Calendar,
  BarChart3,
  Plus,
  Sparkles,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PropertyDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardStats = async () => {
    setLoading(true);
    try {
      // Buscar estatísticas do backend
      const response = await propertiesService.getDashboardStats();
      setStats(response);
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
      toast.error('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardStats();
  }, []);

  // Labels para tipos de imóveis
  const typeLabels: Record<string, string> = {
    'apartment': 'Apartamentos',
    'house': 'Casas',
    'commercial': 'Comercial',
    'land': 'Terrenos',
    'farm': 'Sítios/Fazendas',
    'other': 'Outros'
  };

  const statusSummary = stats?.status_summary;
  const activeCount = statusSummary?.active_total ?? stats?.active_properties ?? 0;
  const inactiveCount = statusSummary?.inactive_total ?? stats?.inactive_properties ?? 0;
  const refreshCount = statusSummary?.counts_by_key?.refreshing ?? stats?.properties_in_refresh ?? 0;

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 p-3">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            Dashboard de Imóveis
          </h1>
          <p className="text-text-secondary">
            Visão geral do seu portfólio de propriedades em tempo real
          </p>
        </div>
        <Button 
          onClick={loadDashboardStats}
          variant="ghost"
          size="lg"
          disabled={loading}
        >
          <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-text-secondary">Carregando estatísticas...</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPIs Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total de Imóveis"
              value={stats?.total_properties ?? 0}
              icon={<Building2 className="h-6 w-6" />}
              color="blue"
              subtitle="Cadastrados no sistema"
            />
            <KPICard
              title="Em Atualização"
              value={refreshCount}
              icon={<RefreshCw className="h-6 w-6" />}
              color="purple"
              subtitle="No sistema de refresh"
            />
            <KPICard
              title="Imóveis Ativos"
              value={activeCount}
              icon={<TrendingUp className="h-6 w-6" />}
              color="green"
              subtitle="Publicados e visíveis"
            />
            <KPICard
              title="Com Destaque"
              value={stats?.highlighted_properties ?? 0}
              icon={<Sparkles className="h-6 w-6" />}
              color="yellow"
              subtitle="Anúncios destacados"
            />
          </div>

          {/* Cards Secundários */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição por Tipo */}
            <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-surface p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Home className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Distribuição por Tipo</h3>
                    <p className="text-xs text-text-secondary">Categorias de imóveis</p>
                  </div>
                </div>
              </div>

              {stats?.properties_by_type && Object.keys(stats.properties_by_type).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(stats.properties_by_type)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => {
                      const percentage = stats.total_properties > 0 
                        ? Math.round((count / stats.total_properties) * 100) 
                        : 0;
                      
                      return (
                        <div key={type} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-text-primary">
                              {typeLabels[type] || type}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-text-secondary">{count}</span>
                              <span className="text-xs text-text-tertiary">({percentage}%)</span>
                            </div>
                          </div>
                          <div className="h-2 bg-surface rounded-full overflow-hidden relative">
                            <div 
                              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
                              {...{ style: { width: `${percentage}%` } }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
                  <p className="text-sm text-text-secondary">Nenhum imóvel cadastrado ainda</p>
                </div>
              )}
            </div>

            {/* Informações Gerais */}
            <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-surface p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Informações Gerais</h3>
                  <p className="text-xs text-text-secondary">Status e atualizações</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Última Atualização */}
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                        Última Atualização
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        {stats?.last_update 
                          ? new Date(stats.last_update).toLocaleString('pt-BR')
                          : 'Nenhuma atualização registrada'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status dos Imóveis */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-center">
                    <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                      {activeCount}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-1">Ativos</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-300">
                      {inactiveCount}
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-400 mt-1">Inativos</p>
                  </div>
                </div>

                {/* Alerta se não houver imóveis */}
                {(!stats?.total_properties || stats.total_properties === 0) && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-300 mb-1">
                          Nenhum imóvel cadastrado
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                          Comece adicionando imóveis ao sistema
                        </p>
                        <Button
                          onClick={() => navigate('/properties/new')}
                          size="sm"
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Cadastrar Imóvel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-surface p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Ações Rápidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => navigate('/properties/new')}
                size="lg"
                className="w-full justify-start"
              >
                <Plus className="h-5 w-5 mr-3" />
                Cadastrar Novo Imóvel
              </Button>
              <Button
                onClick={() => navigate('/canalpro?modal=import')}
                variant="secondary"
                size="lg"
                className="w-full justify-start"
              >
                <RefreshCw className="h-5 w-5 mr-3" />
                Importar do CanalPro
              </Button>
              <Button
                onClick={() => navigate('/properties')}
                variant="ghost"
                size="lg"
                className="w-full justify-start"
              >
                <Building2 className="h-5 w-5 mr-3" />
                Ver Todos os Imóveis
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
