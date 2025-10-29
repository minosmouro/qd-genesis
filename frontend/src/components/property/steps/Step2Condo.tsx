import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { usePropertyCreate } from '@/contexts/PropertyCreateContext';
import { Settings } from 'lucide-react';
import EmpreendimentoAutocomplete from '@/components/ui/EmpreendimentoAutocomplete';
import { Empreendimento } from '@/services/empreendimentos.service';
import { CONDO_FEATURE_GROUPS } from '@/constants/condoFeatures';
import type { PropertyFormData } from '@/types';

const Step2Condo: React.FC = () => {
  const { formData, updateField, updateData } = usePropertyCreate();
  
  // Inicializar com o nome do empreendimento se já existir
  const [empreendimentoInput, setEmpreendimentoInput] = useState('');

  // Controlar qual empreendimento já teve dados aplicados automaticamente
  const lastAppliedCondoIdRef = useRef<number | null>(null);

  const parseNumeric = useCallback((value: unknown): number | undefined => {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }
    const parsed = parseInt(String(value), 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, []);

  useEffect(() => {
    const condo = (formData as any).condominium as Empreendimento | undefined;

    if (!condo?.id) {
      return;
    }

    if (!empreendimentoInput) {
      setEmpreendimentoInput(condo.nome || '');
    }

    if (lastAppliedCondoIdRef.current === condo.id) {
      return;
    }

    const info = condo.informacoes || {};
    const floorsFromCondo = parseNumeric(info.andares);
    const unitsFromCondo = parseNumeric(info.unidadesPorAndar);
    const buildingsFromCondo = parseNumeric(info.blocos);
    const rawYear = info.entregaEm ? parseInt(String(info.entregaEm).split('-')[0], 10) : NaN;
    const constructionYearFromCondo = Number.isNaN(rawYear) ? undefined : rawYear;
    const characteristicsFromCondo = Array.isArray(info.caracteristicas)
      ? info.caracteristicas.filter(Boolean)
      : [];

    const updates: Partial<PropertyFormData> = {};

    if (formData.floors == null && floorsFromCondo !== undefined) {
      updates.floors = floorsFromCondo;
    }
    if (formData.units_on_floor == null && unitsFromCondo !== undefined) {
      updates.units_on_floor = unitsFromCondo;
    }
    if (formData.buildings == null && buildingsFromCondo !== undefined) {
      updates.buildings = buildingsFromCondo;
    }
    if (!formData.construction_year && constructionYearFromCondo !== undefined) {
      updates.construction_year = constructionYearFromCondo;
    }
    if (
      (!Array.isArray(formData.empreendimento_caracteristicas) || formData.empreendimento_caracteristicas.length === 0) &&
      characteristicsFromCondo.length > 0
    ) {
      updates.empreendimento_caracteristicas = characteristicsFromCondo;
    }

    if (Object.keys(updates).length > 0) {
      updateData(updates);
    }

    lastAppliedCondoIdRef.current = condo.id;
  }, [
    (formData as any).condominium,
    formData.floors,
    formData.units_on_floor,
    formData.buildings,
    formData.construction_year,
    formData.empreendimento_caracteristicas,
    empreendimentoInput,
    updateData,
    parseNumeric
  ]);

  // Definir quais tipos/categorias precisam de informações de empreendimento/condomínio
  const needsCondoInfo = (propertyType: string, category?: string) => {
    const condoTypes = [
      'APARTMENT', // Apartamento - sempre
      'FLAT', // Flat - sempre
      'CASA_CONDOMINIO', // Casa de Condomínio - sempre
      'COBERTURA', // Cobertura - sempre
      'LOFT', // Loft - sempre
      'STUDIO', // Studio - sempre
    ];

    // Lote/Terreno só precisa se for "Lote Condomínio"
    if (propertyType === 'LOTE_TERRENO') {
      return category === 'LOTE_CONDOMINIO';
    }

    return condoTypes.includes(propertyType);
  };

  // Definir quais tipos precisam de informações de prédio (andares, blocos, etc.)
  const needsBuildingInfo = (propertyType: string) => {
    const buildingTypes = [
      'APARTMENT', // Apartamento
      'COBERTURA', // Cobertura
      'LOFT', // Loft
      'STUDIO', // Studio
      'FLAT', // Flat
      'KITNET_CONJUGADO', // Kitnet/Conjugado
      'PREDIO_EDIFICIO_INTEIRO', // Prédio/Edifício Inteiro
    ];

    return buildingTypes.includes(propertyType);
  };

  // Hook para verificar se precisa de info de condomínio
  const needsCondoStructure = needsCondoInfo(
    formData.property_type || '',
    formData.category
  );

  // Hook para verificar se precisa de info de prédio
  const needsBuildingStructure = needsBuildingInfo(formData.property_type || '');

  // Se não precisa de informações de condomínio, não renderizar este step
  if (!needsCondoStructure) {
    return null;
  }


  // Selecionar empreendimento EXISTENTE: salvar apenas o ID
  const handleEmpreendimentoSelect = (empreendimento: Empreendimento) => {
    console.log('🏢 Empreendimento EXISTENTE selecionado:', {
      id: (empreendimento as any).id,
      nome: empreendimento.nome,
      empreendimento
    });
    const info = empreendimento?.informacoes || {};
    const floors = parseNumeric(info.andares);
    const unitsPerFloor = parseNumeric(info.unidadesPorAndar);
    const buildings = parseNumeric(info.blocos);
    const rawYear = info.entregaEm ? parseInt(String(info.entregaEm).split('-')[0], 10) : NaN;
    const constructionYear = Number.isNaN(rawYear) ? undefined : rawYear;
    const characteristics = Array.isArray(info.caracteristicas)
      ? info.caracteristicas.filter(Boolean)
      : [];

  lastAppliedCondoIdRef.current = empreendimento.id;

    const updates: Partial<PropertyFormData> = {
      empreendimento_id: empreendimento.id,
      nome_empreendimento: null,
      condominium: empreendimento,
      floors,
      units_on_floor: unitsPerFloor,
      buildings,
      construction_year: constructionYear,
      empreendimento_caracteristicas: characteristics,
    };

    updateData(updates);
    setEmpreendimentoInput(empreendimento.nome || '');
    console.log('✅ empreendimento_id atualizado no formData:', empreendimento.id);
  };
  
  // Quando usuário digitar mas NÃO selecionar = Criar NOVO empreendimento
  const handleEmpreendimentoInputChange = (newValue: string) => {
    setEmpreendimentoInput(newValue);
    
    // Se digitou algo, limpar ID (será criado novo)
    if (newValue && formData.empreendimento_id) {
      updateField('empreendimento_id', null);
    }
    
    // Salvar nome para criar depois
    updateField('nome_empreendimento', newValue || null);
    console.log('📝 Nome do empreendimento NOVO digitado:', newValue);
  };

  // Auto-salvamento removido: fluxo agora depende apenas de empreendimento_id selecionado

  // Características do condomínio: salvando em campo separado para empreendimentos.caracteristicas
  // Ler características do condomínio de um campo dedicado
  const selectedCondoFeatures = useMemo(() => {
    return formData.empreendimento_caracteristicas || [];
  }, [formData.empreendimento_caracteristicas]);

  const isCondoFeatureSelected = (id: string) => selectedCondoFeatures.includes(id);
  
  const toggleCondoFeature = (id: string) => {
    const updated = selectedCondoFeatures.includes(id)
      ? selectedCondoFeatures.filter(f => f !== id)
      : [...selectedCondoFeatures, id];
    
    // Salvar em campo separado que irá para empreendimentos.caracteristicas
    updateField('empreendimento_caracteristicas', updated);
    
    console.log('🏢 Características do Condomínio (separadas de property.features):', {
      id,
      selectedCondoFeatures,
      updated,
      empreendimento_id: formData.empreendimento_id
    });
  };


  return (
    <div className="h-full flex flex-col">
      {/* Layout Principal */}
      <div className="flex-1 space-y-4 overflow-auto">
        {/* Informações Estruturais do Condomínio - Apenas para apartamentos, coberturas, etc. */}
        {needsCondoStructure && (
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="text/base font-semibold text-text-primary mb-3 flex items-center">
              <Settings className="w-4 h-4 mr-2 text-primary" />
              Informações do Empreendimento
            </h3>

            <div className="space-y-3">
              {/* Nome do Empreendimento - AUTOCOMPLETE INTELIGENTE */}
              <div>
                <div className="mb-2">
                  <label className="block text-sm font-medium text-text-primary">
                    Nome do Empreendimento
                  </label>
                </div>

                <EmpreendimentoAutocomplete
                  value={empreendimentoInput}
                  onChange={handleEmpreendimentoInputChange}
                  onSelect={handleEmpreendimentoSelect}
                  placeholder="Digite o nome do empreendimento... (ex: Residencial Bela Vista)"
                />

                {/* Indicador de Status do Vínculo */}
                {formData.empreendimento_id ? (
                  <div className="mt-2 flex items-center text-xs text-green-600 dark:text-green-400">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <strong>✅ Empreendimento EXISTENTE vinculado!</strong> (ID: {formData.empreendimento_id})
                  </div>
                ) : formData.nome_empreendimento ? (
                  <div className="mt-2 flex items-center text-xs text-blue-600 dark:text-blue-400">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    <strong>🆕 Novo empreendimento será criado:</strong> "{formData.nome_empreendimento}"
                  </div>
                ) : (
                  <div className="mt-2 flex items-center text-xs text-text-secondary">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    💡 <strong>Dica:</strong> Digite para buscar ou criar novo empreendimento
                  </div>
                )}
              </div>

              {/* Auto-save trigger quando sair do campo nome + CEP preenchido */}
              {/* Aviso de salvamento automático removido conforme solicitado */}

              {/* Informações Numéricas - Estrutura do condomínio/prédio */}
              {needsBuildingStructure ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Nº de andares
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 20"
                      value={formData.floors ?? ''}
                      onChange={e =>
                        updateField(
                          'floors',
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Nº de unidades por andar
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 4"
                      value={formData.units_on_floor ?? ''}
                      onChange={e =>
                        updateField(
                          'units_on_floor',
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Nº de torres
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 3"
                      value={formData.buildings ?? ''}
                      onChange={e =>
                        updateField(
                          'buildings',
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Ano de construção
                    </label>
                    <input
                      type="number"
                      min="1900"
                      max="2100"
                      placeholder="Ex: 2015"
                      value={formData.construction_year ?? ''}
                      onChange={e =>
                        updateField(
                          'construction_year',
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                </div>


              {/* Características do condomínio (opcional) */}
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-text-primary">
                  Características do condomínio (opcional)
                </label>
                {CONDO_FEATURE_GROUPS.map(group => (
                  <div key={group.category}>
                    <div className="text-xs font-semibold text-text-secondary mb-2">
                      {group.category}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {group.features.map(f => {
                        const selected = isCondoFeatureSelected(f.id);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => toggleCondoFeature(f.id)}
                            className={selected
                              ? 'text-xs px-2 py-1 rounded-md border transition-colors bg-secondary/10 border-secondary text-secondary'
                              : 'text-xs px-2 py-1 rounded-md border transition-colors bg-background border-border text-text-secondary hover:bg-surface hover:border-secondary/30'
                            }
                          >
                            {f.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default Step2Condo;
