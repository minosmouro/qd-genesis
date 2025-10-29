import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePropertyCreate } from '@/contexts/PropertyCreateContext';
import { useSidebarContent } from '@/contexts/SidebarContentContext';
import { Home, Settings } from 'lucide-react';
import PropertyBasicSummary from '../widgets/PropertyBasicSummary';
import StepChecklistWidget from '../widgets/StepChecklistWidget';
import TipsWidget from '../widgets/TipsWidget';

// Constantes extraídas para evitar recriação em cada render
const PROPERTY_FEATURES = [
  { id: 'pets_allowed', name: 'Aceita animais', icon: '🐾' },
  { id: 'air_conditioning', name: 'Ar-condicionado', icon: '❄️' },
  { id: 'closet', name: 'Closet', icon: '👔' },
  { id: 'american_kitchen', name: 'Cozinha americana', icon: '🍳' },
  { id: 'fireplace', name: 'Lareira', icon: '🔥' },
  { id: 'furnished', name: 'Mobiliado', icon: '🛋️' },
  { id: 'gourmet_balcony', name: 'Varanda gourmet', icon: '🍷' },
];

const PRIMARY_FEATURE_IDS = new Set(PROPERTY_FEATURES.map(feature => feature.id));

const FEATURE_LABEL_MAP: Record<string, string> = {
  office: 'Escritório',
  balcony: 'Varanda',
  service_area: 'Área de serviço',
  maid_room: 'Dependência de empregados',
  barbecue_grill: 'Churrasqueira',
  garden: 'Jardim',
  terrace: 'Terraço',
  pets_allowed: 'Aceita animais',
  air_conditioning: 'Ar-condicionado',
  closet: 'Closet',
  american_kitchen: 'Cozinha americana',
  fireplace: 'Lareira',
  furnished: 'Mobiliado',
  gourmet_balcony: 'Varanda gourmet',
};

const PROPERTY_TYPES = [
  { value: 'APARTMENT', label: 'Apartamento' },
  { value: 'HOUSE', label: 'Casa' },
  { value: 'CASA_CONDOMINIO', label: 'Casa de Condomínio' },
  { value: 'CASA_VILA', label: 'Casa de Vila' },
  { value: 'COBERTURA', label: 'Cobertura' },
  { value: 'FAZENDA_SITIO_CHACARA', label: 'Fazenda/Sítio/Chácara' },
  { value: 'FLAT', label: 'Flat' },
  { value: 'KITNET_CONJUGADO', label: 'Kitnet/Conjugado' },
  { value: 'LOFT', label: 'Loft' },
  { value: 'LOTE_TERRENO', label: 'Lote/Terreno' },
  { value: 'PREDIO_EDIFICIO_INTEIRO', label: 'Prédio/Edifício Inteiro' },
  { value: 'STUDIO', label: 'Studio' },
];

const CUSTOM_FEATURE_OPTIONS = [
  'Conexão à internet',
  'Ambientes integrados',
  'Andar inteiro',
  'Aquário',
  'Área de serviço',
  'Armário embutido',
  'Armário embutido no quarto',
  'Armário na cozinha',
  'Armário no banheiro',
  'Banheira',
  'Banheiro de serviço',
  'Bar',
  'Box blindex',
  'Carpete',
  'Casa de caseiro',
  'Casa de fundo',
  'Casa sede',
  'Churrasqueira na varanda',
  'Chuveiro a gás',
  'Cimento queimado',
  'Copa',
  'Cozinha gourmet',
  'Cozinha grande',
  'Dependência de empregados',
  'Depósito',
  'Despensa',
  'Drywall',
  'Edícula',
  'Escada',
  'Escritório',
  'Fogão',
  'Forno de pizza',
  'Freezer',
  'Geminada',
  'Gesso - Sanca - Teto Rebaixado',
  'Hidromassagem',
  'Imóvel de esquina',
  'Interfone',
  'Isolamento acústico',
  'Isolamento térmico',
  'Janela de alumínio',
  'Janela grande',
  'Laje',
  'Lavabo',
  'Meio andar',
  'Mezanino',
  'Móvel planejado',
  'Muro de vidro',
  'Muro e grade',
  'Ofurô',
  'Pé direito alto',
  'Piscina privativa',
  'Piso de madeira',
  'Piso elevado',
  'Piso frio',
  'Piso laminado',
  'Piso vinílico',
  'Platibanda',
  'Porcelanato',
  'Possui divisória',
  'Quarto de serviço',
  'Quarto extra reversível',
  'Quintal',
  'Sala de almoço',
  'Sala de jantar',
  'Sala grande',
  'Sala pequena',
  'TV a cabo',
  'Varanda',
  'Varanda fechada com vidro',
  'Ventilação natural',
  'Vista para o mar',
  'Vista panorâmica',
  'Vista para a montanha',
  'Vista para lago',
];

const Step1PropertyInfo: React.FC = () => {
  const { formData, updateField } = usePropertyCreate();
  const { setSidebarContent } = useSidebarContent();

  // Injetar conteúdo no sidebar direito
  useEffect(() => {
    setSidebarContent(
      <>
        <PropertyBasicSummary />
        <StepChecklistWidget />
        <TipsWidget />
      </>
    );

    // Limpar ao desmontar
    return () => setSidebarContent(null);
  }, [setSidebarContent]);

  // usar constantes memoizadas
  const propertyFeatures = PROPERTY_FEATURES;
  const propertyTypes = PROPERTY_TYPES;

  // Categorias disponíveis baseadas no tipo selecionado (memo para performance)
  // IMPORTANTE: Valores devem corresponder exatamente ao backend (property_mapper.py)
  const availableCategories = useMemo(() => {
    const getCategoriesForType = (propertyType: string) => {
      const categoryMapping: Record<string, Array<{ value: string; label: string }>> = {
        APARTMENT: [
          { value: 'Padrão', label: 'Padrão' },
          { value: 'Duplex', label: 'Duplex' },
          { value: 'Triplex', label: 'Triplex' },
          { value: 'Studio', label: 'Studio' },
          { value: 'Cobertura', label: 'Cobertura' },
        ],
        HOUSE: [
          { value: 'Térrea', label: 'Térrea' },
          { value: 'Sobrado', label: 'Sobrado' },
          { value: 'Kitnet/Conjugado', label: 'Kitnet/Conjugado' },
          { value: 'Padrão', label: 'Padrão' },
        ],
        CASA_CONDOMINIO: [
          { value: 'Térrea', label: 'Térrea' },
          { value: 'Sobrado', label: 'Sobrado' },
          { value: 'Kitnet/Conjugado', label: 'Kitnet/Conjugado' },
          { value: 'Padrão', label: 'Padrão' },
        ],
        CONDOMINIUM: [ // Alias do CanalPro - MESMOS valores do backend
          { value: 'Térrea', label: 'Térrea' },
          { value: 'Sobrado', label: 'Sobrado' },
          { value: 'Kitnet/Conjugado', label: 'Kitnet/Conjugado' },
          { value: 'Padrão', label: 'Padrão' },
        ],
        CASA_VILA: [
          { value: 'Térrea', label: 'Térrea' },
          { value: 'Sobrado', label: 'Sobrado' },
          { value: 'Padrão', label: 'Padrão' },
        ],
        COBERTURA: [
          { value: 'Padrão', label: 'Padrão' },
          { value: 'Duplex', label: 'Duplex' },
          { value: 'Triplex', label: 'Triplex' },
        ],
        LOFT: [
          { value: 'Padrão', label: 'Padrão' },
          { value: 'Cobertura', label: 'Cobertura' },
          { value: 'Duplex', label: 'Duplex' },
          { value: 'Triplex', label: 'Triplex' },
        ],
        LOTE_TERRENO: [
          { value: 'Padrão', label: 'Padrão' },
          { value: 'Lote Condomínio', label: 'Lote Condomínio' },
          { value: 'Lote de Vila', label: 'Lote de Vila' },
        ],
      };

      return categoryMapping[propertyType] || [{ value: 'Padrão', label: 'Padrão' }];
    };

    return formData.property_type ? getCategoriesForType(formData.property_type) : [];
  }, [formData.property_type]);

  // handlers memoizados
  const toggleFeature = useCallback((featureId: string) => {
    const currentFeatures = formData.features || [];

    if (currentFeatures.includes(featureId)) {
      updateField('features', currentFeatures.filter(id => id !== featureId));
    } else {
      updateField('features', [...currentFeatures, featureId]);
    }
  }, [formData.features, updateField]);

  const isFeatureSelected = useCallback((featureId: string) => {
    const currentFeatures = formData.features || [];
    return currentFeatures.includes(featureId);
  }, [formData.features]);

  const handlePropertyTypeChange = useCallback((newType: string) => {
    updateField('property_type', newType);
    // Se o novo tipo não suporta a categoria atual, resetá-la
    const currentCategory = formData.category;
    const newCategories = ((): Array<{ value: string; label: string }> => {
      // IMPORTANTE: Valores devem corresponder exatamente ao backend (property_mapper.py)
      const mapping: Record<string, Array<{ value: string; label: string }>> = {
        APARTMENT: [
          { value: 'Padrão', label: 'Padrão' },
          { value: 'Duplex', label: 'Duplex' },
          { value: 'Triplex', label: 'Triplex' },
          { value: 'Studio', label: 'Studio' },
          { value: 'Cobertura', label: 'Cobertura' },
        ],
        HOUSE: [
          { value: 'Térrea', label: 'Térrea' },
          { value: 'Sobrado', label: 'Sobrado' },
          { value: 'Kitnet/Conjugado', label: 'Kitnet/Conjugado' },
          { value: 'Padrão', label: 'Padrão' },
        ],
        CASA_CONDOMINIO: [
          { value: 'Térrea', label: 'Térrea' },
          { value: 'Sobrado', label: 'Sobrado' },
          { value: 'Kitnet/Conjugado', label: 'Kitnet/Conjugado' },
          { value: 'Padrão', label: 'Padrão' },
        ],
        CONDOMINIUM: [ // Alias do CanalPro - MESMOS valores do backend
          { value: 'Térrea', label: 'Térrea' },
          { value: 'Sobrado', label: 'Sobrado' },
          { value: 'Kitnet/Conjugado', label: 'Kitnet/Conjugado' },
          { value: 'Padrão', label: 'Padrão' },
        ],
        CASA_VILA: [
          { value: 'Térrea', label: 'Térrea' },
          { value: 'Sobrado', label: 'Sobrado' },
          { value: 'Padrão', label: 'Padrão' },
        ],
        COBERTURA: [
          { value: 'Padrão', label: 'Padrão' },
          { value: 'Duplex', label: 'Duplex' },
          { value: 'Triplex', label: 'Triplex' },
        ],
        LOFT: [
          { value: 'Padrão', label: 'Padrão' },
          { value: 'Cobertura', label: 'Cobertura' },
          { value: 'Duplex', label: 'Duplex' },
          { value: 'Triplex', label: 'Triplex' },
        ],
        LOTE_TERRENO: [
          { value: 'Padrão', label: 'Padrão' },
          { value: 'Lote Condomínio', label: 'Lote Condomínio' },
          { value: 'Lote de Vila', label: 'Lote de Vila' },
        ],
      };
      return mapping[newType] || [{ value: 'Padrão', label: 'Padrão' }];
    })();

    if (currentCategory && !newCategories.find(cat => cat.value === currentCategory)) {
      updateField('category', '');
    }
  }, [formData.category, updateField]);

  // === Autocomplete / multi-select para 'Outras características' ===
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomFeatures, setSelectedCustomFeatures] = useState<string[]>(() =>
    formData.custom_features
      ? formData.custom_features.split(',').map(s => s.trim()).filter(Boolean)
      : []
  );
  // controlar exibição das sugestões (permitir abrir sem digitar)
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sincronizar selectedCustomFeatures → formData.custom_features
  // APENAS quando o usuário fizer uma mudança manual (não em loops)
  const updateCustomFeatures = useCallback((features: string[]) => {
    setSelectedCustomFeatures(features);
    updateField('custom_features', features.join(', '));
  }, [updateField]);

  // Sincronizar formData.custom_features → selectedCustomFeatures
  // APENAS na inicialização ou mudanças externas
  useEffect(() => {
    const ctx = formData.custom_features || '';
    const fromCtx = ctx.split(',').map(s => s.trim()).filter(Boolean);
    
    // Comparar arrays diretamente, não strings
    const isDifferent = 
      fromCtx.length !== selectedCustomFeatures.length ||
      fromCtx.some((item, index) => item !== selectedCustomFeatures[index]);
    
    // Só atualizar se realmente diferente (evitar loop)
    if (isDifferent && ctx) {
      setSelectedCustomFeatures(fromCtx);
    }
  }, [formData.custom_features]); // ✅ Correto: não incluir selectedCustomFeatures

  useEffect(() => {
    const featureIds = formData.features || [];
    if (!featureIds || featureIds.length === 0) {
      return;
    }

    const primaryFeatures = featureIds.filter(id => PRIMARY_FEATURE_IDS.has(id));
    const extraFeatures = featureIds.filter(id => !PRIMARY_FEATURE_IDS.has(id));

    if (extraFeatures.length === 0) {
      return;
    }

    const translatedExtra = extraFeatures
      .map(id => FEATURE_LABEL_MAP[id] || id)
      .filter(Boolean);

    if (translatedExtra.length > 0) {
      // Atualizar o estado local diretamente sem usar updateCustomFeatures
      // para evitar loop infinito
      setSelectedCustomFeatures(prev => {
        const merged = new Set(prev);
        translatedExtra.forEach(label => merged.add(label));
        const newFeatures = Array.from(merged);
        
        // Só atualizar se realmente mudou
        const newFeaturesStr = newFeatures.join(', ');
        const currentFeaturesStr = prev.join(', ');
        if (newFeaturesStr !== currentFeaturesStr) {
          // Atualizar o campo no contexto também
          updateField('custom_features', newFeaturesStr);
          return newFeatures;
        }
        return prev;
      });
    }

    if (primaryFeatures.length !== featureIds.length) {
      updateField('features', primaryFeatures);
    }
  }, [formData.features, updateField]); // ← Correto: não incluir selectedCustomFeatures

  const addOption = useCallback((opt: string) => {
    if (!opt) return;
    if (selectedCustomFeatures.includes(opt)) return;
    updateCustomFeatures([...selectedCustomFeatures, opt]);
    setSearchTerm('');
    setShowSuggestions(false);
  }, [selectedCustomFeatures, updateCustomFeatures]);

  const removeOption = useCallback((opt: string) => {
    updateCustomFeatures(selectedCustomFeatures.filter(x => x !== opt));
  }, [selectedCustomFeatures, updateCustomFeatures]);

  const filtered = useMemo(() => {
    return CUSTOM_FEATURE_OPTIONS.filter(o => {
      if (selectedCustomFeatures.includes(o)) return false;
      if (!searchTerm.trim()) return true; // mostrar todas quando não digitado
      return o.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [searchTerm, selectedCustomFeatures]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const exact = CUSTOM_FEATURE_OPTIONS.find(
        o => o.toLowerCase() === searchTerm.trim().toLowerCase()
      );
      addOption((exact as string) || searchTerm.trim());
    }
  }, [searchTerm, addOption]);

  // --- Melhor controle para inputs numéricos: usar estado local e atualizar contexto no onBlur ---
  const [usableAreasInput, setUsableAreasInput] = useState<string | number>(formData.usable_areas ?? '');
  const [totalAreasInput, setTotalAreasInput] = useState<string | number>(formData.total_areas ?? '');

  useEffect(() => {
    setUsableAreasInput(formData.usable_areas ?? '');
  }, [formData.usable_areas]);

  useEffect(() => {
    setTotalAreasInput(formData.total_areas ?? '');
  }, [formData.total_areas]);

  return (
    <div className="h-full flex flex-col">
      {/* Layout Principal com espaçamento padronizado */}
      <div className="flex-1 space-y-6 overflow-visible">
        {/* Informações Básicas */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="text-base font-semibold text-text-primary mb-2 flex items-center">
            <Home className="w-4 h-4 mr-2 text-primary" />
            Informações Básicas
          </h3>

          <div className="space-y-4">
            {/* Identificação - somente leitura */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Código do Imóvel
                </label>
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-xs font-semibold">
                  {formData.property_code || '—'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  ID Externo
                </label>
                <div className="text-sm text-text-secondary">
                  {formData.external_id || '—'}
                </div>
              </div>
            </div>

            {/* Tipo de Uso */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Finalidade de Uso *
              </label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    value: 'RESIDENTIAL',
                    label: 'Residencial',
                    emoji: '🏠',
                    desc: 'Para moradia',
                  },
                  {
                    value: 'COMMERCIAL',
                    label: 'Comercial',
                    emoji: '🏢',
                    desc: 'Para negócios',
                  },
                ].map(option => {
                  const isSelected = formData.usage_type === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => updateField('usage_type', option.value)}
                      className={`
												p-2 rounded-lg border transition-all duration-200 text-left
												${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-background border-border text-text-primary hover:bg-surface hover:border-primary/30'
                        }
											`}
                    >
                      <div className="flex items-center mb-1">
                        <span className="text-lg mr-2">{option.emoji}</span>
                        <span className="font-medium">{option.label}</span>
                      </div>
                      <p className="text-xs opacity-70">{option.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tipo de Imóvel e Categoria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Tipo de Imóvel *
                </label>
                <select
                  value={formData.property_type || ''}
                  onChange={e => handlePropertyTypeChange(e.target.value)}
                  className="w-full px-3 py-1.5 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Selecione o tipo</option>
                  {propertyTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Categoria *
                </label>
                <select
                  value={formData.category || ''}
                  onChange={e => updateField('category', e.target.value)}
                  disabled={!formData.property_type}
                  className="w-full px-3 py-1.5 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {formData.property_type
                      ? 'Selecione a categoria'
                      : 'Primeiro selecione o tipo'}
                  </option>
                  {availableCategories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-text-secondary -mt-2">
              Categoria: especificação adicional do tipo de imóvel (Padrão para
              imóveis convencionais)
            </p>

            {/* Informações Numéricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Quartos
                </label>
                <input
                  type="number"
                  placeholder="3"
                  min="0"
                  value={formData.bedrooms || ''}
                  onChange={e =>
                    updateField(
                      'bedrooms',
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  className="w-full px-3 py-1.5 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Banheiros
                </label>
                <input
                  type="number"
                  placeholder="2"
                  min="0"
                  value={formData.bathrooms || ''}
                  onChange={e =>
                    updateField(
                      'bathrooms',
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  className="w-full px-3 py-1.5 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Suítes
                </label>
                <input
                  type="number"
                  placeholder="1"
                  min="0"
                  value={formData.suites || ''}
                  onChange={e =>
                    updateField(
                      'suites',
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  className="w-full px-3 py-1.5 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Vagas
                </label>
                <input
                  type="number"
                  placeholder="2"
                  min="0"
                  value={formData.parking_spaces || ''}
                  onChange={e =>
                    updateField(
                      'parking_spaces',
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  className="w-full px-3 py-1.5 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Áreas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="usable_areas" className="block text-sm font-medium text-text-primary mb-1">
                  Área Útil (m²)
                </label>
                <input
                  id="usable_areas"
                  type="number"
                  placeholder="80"
                  min="0"
                  step="0.01"
                  value={usableAreasInput ?? ''}
                  onChange={e => setUsableAreasInput(e.target.value)}
                  onBlur={() => updateField('usable_areas', usableAreasInput ? parseFloat(String(usableAreasInput)) : undefined)}
                  className="w-full px-3 py-1.5 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label htmlFor="total_areas" className="block text-sm font-medium text-text-primary mb-1">
                  Área Total (m²)
                </label>
                <input
                  id="total_areas"
                  type="number"
                  placeholder="100"
                  min="0"
                  step="0.01"
                  value={totalAreasInput ?? ''}
                  onChange={e => setTotalAreasInput(e.target.value)}
                  onBlur={() => updateField('total_areas', totalAreasInput ? parseFloat(String(totalAreasInput)) : undefined)}
                  className="w-full px-3 py-1.5 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Campos específicos para Apartamento, Flat e Studio */}
            {(formData.property_type === 'APARTMENT' ||
              formData.property_type === 'FLAT' ||
              formData.property_type === 'STUDIO') && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-primary/5 p-3 rounded-lg border border-primary/20">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Unidade
                  </label>
                  <input
                    type="text"
                    placeholder="101, 2A, 504..."
                    value={formData.unit || ''}
                    onChange={e => updateField('unit', e.target.value)}
                    className="w-full px-3 py-1.5 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Bloco
                  </label>
                  <input
                    type="text"
                    placeholder="A, B, Torre 1..."
                    value={formData.block || ''}
                    onChange={e => updateField('block', e.target.value)}
                    className="w-full px-3 py-1.5 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Andar da Unidade
                  </label>
                  <input
                    type="number"
                    placeholder="5"
                    min="0"
                    value={formData.unit_floor || ''}
                    onChange={e => 
                      updateField(
                        'unit_floor', 
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    className="w-full px-3 py-1.5 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Características do Imóvel */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="text-base font-semibold text-text-primary mb-2 flex items-center">
            <Settings className="w-4 h-4 mr-2 text-secondary" />
            Características do Imóvel
          </h3>

          {/* Mostrar características em duas linhas com 6 cards por linha */}
          <div className="grid grid-cols-6 gap-1 mb-3 grid-rows-2">
            {propertyFeatures.map(feature => {
              const isSelected = isFeatureSelected(feature.id);
              return (
                <button
                  key={feature.id}
                  onClick={() => toggleFeature(feature.id)}
                  title={feature.name}
                  className={`flex items-center gap-2 h-8 px-2 rounded-md border transition-colors text-xs truncate select-none
                    ${
                      isSelected
                        ? 'bg-secondary/10 border-secondary text-secondary'
                        : 'bg-background border-border text-text-secondary hover:bg-surface hover:border-secondary/30'
                    }
                  `}
                >
                  <span className="text-sm">{feature.icon}</span>
                  <span className="truncate">{feature.name}</span>
                </button>
              );
            })}
          </div>

          {/* Campo para características personalizadas */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Outras características (opcional)
            </label>

            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedCustomFeatures.map((f, i) => (
                  <span key={f + i} className="flex items-center text-xs px-2 py-1 bg-surface border border-border rounded-full">
                    <span className="mr-2">{f}</span>
                    <button type="button" onClick={() => removeOption(f)} className="text-xs text-text-secondary hover:text-red-600">×</button>
                  </span>
                ))}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowSuggestions(true)}
                  onClick={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                  placeholder="Buscar ou adicionar (pressione Enter para adicionar)"
                  className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />

                {showSuggestions && (
                  <div className="absolute left-0 right-0 mt-1 bg-surface border border-border rounded-md max-h-48 overflow-auto z-20">
                    {filtered.length > 0 ? (
                      filtered.map(opt => (
                        <div
                          key={opt}
                          onMouseDown={() => addOption(opt)}
                          className="px-3 py-2 cursor-pointer hover:bg-primary/10"
                        >
                          {opt}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-text-secondary">Nenhuma opção. Pressione Enter para adicionar.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Resumo migrado para o sidebar direito */}
      </div>
    </div>
  );
};

export default Step1PropertyInfo;
