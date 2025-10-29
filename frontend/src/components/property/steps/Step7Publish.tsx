import React, { useState, useEffect } from 'react';
import { usePropertyCreate } from '@/contexts/PropertyCreateContext';
import { useSidebarContent } from '@/contexts/SidebarContentContext';
import FinalQualityScore from '../widgets/FinalQualityScore';
import PerformanceEstimate from '../widgets/PerformanceEstimate';
import PlatformRecommendations from '../widgets/PlatformRecommendations';
import {
  CheckCircle2,
  AlertTriangle,
  Globe,
  Clock,
  Star,
} from 'lucide-react';

const Step7Publish: React.FC = () => {
  const { formData, updateField, validation, canPublish } = usePropertyCreate();
  const { setSidebarContent } = useSidebarContent();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  // Injetar widgets no sidebar direito
  useEffect(() => {
    setSidebarContent(
      <>
        <FinalQualityScore />
        <PerformanceEstimate />
        <PlatformRecommendations />
      </>
    );

    return () => setSidebarContent(null);
  }, [setSidebarContent]);

  // Definir valor padrão para publication_type se ainda não estiver definido
  useEffect(() => {
    if (!formData.publication_type) {
      updateField('publication_type', 'STANDARD');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const platforms = [
    {
      id: 'olx',
      name: 'OLX',
      description: 'Grande público - Alto volume de acessos',
      icon: Globe,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800',
      included: false,
      badge: 'Pro',
    },
    {
      id: 'vivareal',
      name: 'VivaReal',
      description: 'Mercado Premium - Leads qualificados',
      icon: Star,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      included: false,
      badge: 'Premium',
    },
    {
      id: 'zapimoveis',
      name: 'ZapImóveis',
      description: 'Classe A/B - Imóveis de alto padrão',
      icon: Star,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      included: false,
      badge: 'Premium',
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Layout Principal */}
      <div className="flex-1 space-y-6 overflow-auto">
        {/* Status de Validação */}
        <div
          className={`border rounded-lg p-6 ${
            canPublish
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center mb-4">
            {canPublish ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 mr-3" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {canPublish
                ? '✅ Pronto para Publicar!'
                : '⚠️ Complete os campos obrigatórios'}
            </h3>
          </div>

          {!canPublish && (
            <div className="mb-4">
              <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                Campos obrigatórios faltando:
              </p>
              <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                {validation.required.map((item, index) => (
                  <li key={index} className="flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canPublish && (
            <div className="mb-4">
              <p className="text-sm text-green-700 dark:text-green-300">
                🎉 Todos os campos obrigatórios foram preenchidos! Você pode publicar seu imóvel agora.
              </p>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                💡 Recomendações para melhor divulgação:
              </p>
              <ul className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                {validation.warnings.map((item, index) => (
                  <li key={index} className="flex items-center">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Seleção de Plataformas */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2 text-primary" />
            Onde Publicar
          </h3>

          <div className="space-y-3">
            {platforms.map(platform => {
              const isSelected = selectedPlatforms.includes(platform.id);
              const Icon = platform.icon;

              return (
                <div
                  key={platform.id}
                  className={`border rounded-lg p-4 transition-all cursor-pointer ${
                    isSelected
                      ? `${platform.bgColor} ${platform.borderColor} shadow-sm`
                      : 'border-border bg-background hover:bg-surface'
                  }`}
                  onClick={() =>
                    platform.included && togglePlatform(platform.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-6 h-6 ${platform.color}`} />
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                          {platform.name}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              platform.included
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                            }`}
                          >
                            {platform.badge}
                          </span>
                        </h4>
                        <p className="text-xs text-text-secondary">
                          {platform.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!platform.included && (
                        <button className="text-xs text-primary hover:text-primary/80 px-3 py-1 border border-primary/20 rounded-md">
                          Upgrade
                        </button>
                      )}
                      {platform.included && (
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? 'bg-primary border-primary text-white'
                              : 'border-border bg-background'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              💡 Dica de Marketing:
            </h4>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Imóveis publicados em múltiplas plataformas recebem até 300% mais
              visualizações e vendem 40% mais rápido. Considere fazer upgrade
              para alcançar mais compradores!
            </p>
          </div>
        </div>

        {/* Configurações de Publicação */}
        {canPublish && (
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-secondary" />
              Configurações de Publicação
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-text-primary">
                    Publicar Imediatamente
                  </label>
                  <p className="text-xs text-text-secondary">
                    O anúncio ficará ativo assim que for processado
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-primary"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-text-primary">
                    Destaque Premium
                  </label>
                  <p className="text-xs text-text-secondary">
                    Aparecer no topo dos resultados (plano Pro)
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">
                    Pro
                  </span>
                  <input type="checkbox" className="w-4 h-4 text-primary" />
                </div>
              </div>

              {/* Tipo de Destaque no CanalPro */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-text-primary">
                    Tipo de Destaque (CanalPro)
                  </label>
                  <p className="text-xs text-text-secondary">
                    Selecione o tipo de publicação: Standard, Premium, Super Premium, Premiere ou Triplo
                  </p>
                </div>
                <select
                  value={formData.publication_type || 'STANDARD'}
                  onChange={e => updateField('publication_type', e.target.value)}
                  className="px-3 py-1.5 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="STANDARD">Padrão</option>
                  <option value="PREMIUM">Destaque</option>
                  <option value="SUPER_PREMIUM">Super Destaque</option>
                  <option value="PREMIERE_1">Premiere 1</option>
                  <option value="PREMIERE_2">Premiere 2</option>
                  <option value="TRIPLE">Triplo</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-text-primary">
                    Renovação Automática
                  </label>
                  <p className="text-xs text-text-secondary">
                    Renovar anúncio automaticamente após 30 dias
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Resumo Final - migrado para o sidebar direito */}
      </div>
    </div>
  );
};

export default Step7Publish;
