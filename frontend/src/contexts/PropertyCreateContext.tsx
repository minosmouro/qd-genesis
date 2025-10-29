import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { Property, PropertyFormData } from '@/types';
import { FEATURES_MAP } from '@/constants/condoFeatures';

// 1. Definição dos Tipos
interface PropertyCreateContextType {
  currentStep: number;
  propertyData: Partial<PropertyFormData>;
  formData: Partial<PropertyFormData>; // Alias para compatibilidade
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  updateData: (data: Partial<PropertyFormData>) => void;
  updateField: (field: keyof PropertyFormData, value: any) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isEditMode: boolean;
  propertyId?: number;
  exportToCanalPro: boolean;
  setExportToCanalPro: (value: boolean) => void;
  validation: { required: string[]; warnings: string[] };
  canPublish: boolean;
}

// 2. Criação do Contexto
const PropertyCreateContext = createContext<
  PropertyCreateContextType | undefined
>(undefined);

// 3. Criação do Provedor
interface PropertyCreateProviderProps {
  children: React.ReactNode;
  totalSteps: number;
  initialData?: Partial<PropertyFormData>;
  isEditMode?: boolean;
  propertyId?: number;
}

// Função de validação dos dados do imóvel
const validatePropertyData = (data: Partial<PropertyFormData>) => {
  const required: string[] = [];
  const warnings: string[] = [];

  // Campos obrigatórios
  if (!data.title) required.push('Título');
  if (!data.usage_type) required.push('Tipo de uso');
  if (!data.property_type) required.push('Tipo de imóvel');
  if (!data.business_type) required.push('Modalidade de negócio');
  if (!data.endereco) required.push('Endereço');
  if (!data.cidade) required.push('Cidade');

  // Empreendimento obrigatório para tipos em condomínio
  const typesRequiringCondo = new Set(['APARTMENT', 'FLAT', 'STUDIO', 'CASA_CONDOMINIO', 'COBERTURA', 'LOFT']);
  if (data.property_type && typesRequiringCondo.has(String(data.property_type))) {
    const temEmpreendimentoExistente = data.empreendimento_id && data.empreendimento_id > 0;
    const temNomeParaCriarNovo = data.nome_empreendimento && data.nome_empreendimento.trim().length > 0;
    
    console.log('🔍 Validando Empreendimento:', {
      property_type: data.property_type,
      empreendimento_id: data.empreendimento_id,
      nome_empreendimento: data.nome_empreendimento,
      temEmpreendimentoExistente,
      temNomeParaCriarNovo,
      valido: temEmpreendimentoExistente || temNomeParaCriarNovo
    });
    
    if (!temEmpreendimentoExistente && !temNomeParaCriarNovo) {
      console.warn('❌ Empreendimento obrigatório não preenchido!');
      required.push('Empreendimento');
    }
  }

  // Preços obrigatórios conforme modalidade
  if (
    (data.business_type === 'SALE' || data.business_type === 'SALE_RENTAL') &&
    !data.price_sale
  ) {
    required.push('Preço de venda');
  }
  if (
    (data.business_type === 'RENTAL' || data.business_type === 'SALE_RENTAL') &&
    !data.price_rent
  ) {
    required.push('Valor do aluguel');
  }

  // Avisos/recomendações
  if (!data.description) warnings.push('Descrição detalhada');

  const imageArray = Array.isArray(data.images) ? data.images : [];
  const imageUrlArray = Array.isArray((data as any).image_urls)
    ? ((data as any).image_urls as unknown[])
    : [];
  const totalImages = [...imageArray, ...imageUrlArray].filter(Boolean).length;

  if (totalImages === 0) {
    warnings.push('Adicione fotos do imóvel');
  } else if (totalImages < 5) {
    warnings.push(`Considere incluir mais fotos (atualmente ${totalImages})`);
  }
  if (!data.bedrooms && data.usage_type === 'RESIDENTIAL') warnings.push('Número de quartos');
  if (!data.bathrooms) warnings.push('Número de banheiros');
  if (!data.usable_areas) warnings.push('Área útil');

  return { required, warnings };
};

// Mapeamento de labels para códigos de property_type
const PROPERTY_TYPE_LABEL_TO_CODE: Record<string, string> = {
  'Apartamento': 'APARTMENT',
  'Casa': 'HOUSE',
  'Casa de Condomínio': 'CASA_CONDOMINIO',
  'Casa de Vila': 'CASA_VILA',
  'Cobertura': 'COBERTURA',
  'Fazenda/Sítio/Chácara': 'FAZENDA_SITIO_CHACARA',
  'Flat': 'FLAT',
  'Kitnet/Conjugado': 'KITNET_CONJUGADO',
  'Loft': 'LOFT',
  'Lote/Terreno': 'LOTE_TERRENO',
  'Prédio/Edifício Inteiro': 'PREDIO_EDIFICIO_INTEIRO',
  'Studio': 'STUDIO',
};

// Nova função utilitária: normaliza dados recebidos do backend para o formato esperado pelo form
export const normalizeInitialData = (
  initial: Partial<PropertyFormData> | Partial<Property> = {}
): Partial<PropertyFormData> => {
  const normalized: Partial<PropertyFormData> = {
    ...(initial as Partial<PropertyFormData>),
  };
  const source = initial as Partial<PropertyFormData>;
  const safe = initial as Partial<PropertyFormData> & Partial<Property>;
  
  // Normalizar property_type: converter label para código se necessário
  if (safe.property_type) {
    const propertyType = safe.property_type;
    
    // 1. Se o valor for um label (texto), converter para código
    if (PROPERTY_TYPE_LABEL_TO_CODE[propertyType]) {
      normalized.property_type = PROPERTY_TYPE_LABEL_TO_CODE[propertyType];
    } 
    // 2. Se já for um código interno válido, manter como está
    // (o backend já converte aliases do CanalPro como CONDOMINIUM → CASA_CONDOMINIO)
    else {
      normalized.property_type = propertyType;
    }
  }

  const addr = source.address || ({} as any);
  const condo = (initial as any).condominium || ({} as any);

  // Mapear variantes de endereço para os campos planos do formulário
  normalized.bairro =
    source.bairro ??
    (addr.neighborhood as any) ??
  (source.address as any)?.neighborhood;
  normalized.cidade =
    source.cidade ?? (addr.city as any) ?? (source.address as any)?.city;
  normalized.cep =
    source.cep ?? (addr.zip_code as any) ?? (source.address as any)?.zip_code;
  normalized.endereco =
    source.endereco ??
    (addr.street as any) ??
  (source.address as any)?.street;
  normalized.numero =
    source.numero ??
    ((addr.street_number as any) ||
      (addr.number as any) ||
  (source.address as any)?.street_number ||
  (source.address as any)?.number);
  normalized.complemento =
    source.complemento ??
    (addr.complement as any) ??
  (source.address as any)?.complement;
  normalized.estado =
    source.estado ?? (addr.state as any) ?? (source.address as any)?.state;

  // Mapear variantes de área (usar casts para acessar possíveis aliases retornados pelo backend)
  normalized.usable_areas =
    safe.usable_areas ??
    (initial as any).area_util ??
    (initial as any).usable_areas ??
    undefined;
  normalized.total_areas =
    safe.total_areas ??
    (initial as any).area_total ??
    (initial as any).total_areas ??
    undefined;

  // Mapeamento de vagas/garagem
  normalized.parking_spaces =
    safe.parking_spaces ?? (initial as any).garage_spots ?? undefined;

  // Imagens: garantir array de URLs
  (normalized as any).image_urls =
    safe.image_urls ?? (initial as any).images ?? [];

  // --- Novos mapeamentos para Empreendimento ---
  normalized.empreendimento_id =
    (initial as any).empreendimento_id ??
    (initial as any).condominium?.id ??
    (initial as any).empreendimento?.id ??
    (normalized as any).empreendimento_id ??
    undefined;

  // 🔍 PRESERVAR o objeto condominium completo do backend
  if ((initial as any).condominium) {
    (normalized as any).condominium = (initial as any).condominium;
  }

  // Campos específicos da unidade
  normalized.unit =
    safe.unit ??
    (initial as any).unit ??
    (normalized as any).unit ?? undefined;

  normalized.block =
    safe.block ??
    (initial as any).block ??
    (normalized as any).block ?? undefined;

  normalized.unit_floor =
    safe.unit_floor ??
    (initial as any).unit_floor ??
    (normalized as any).unit_floor ?? undefined;

  // Tipo/categoria e características gerais do imóvel
  // Separar usage_type (RESIDENTIAL / COMMERCIAL) do property_type (APARTMENT / HOUSE / ...)
  normalized.usage_type =
    safe.usage_type ?? (initial as any).usage_type ??
    ((initial as any).usage_types && Array.isArray((initial as any).usage_types) ? (initial as any).usage_types[0] : undefined) ??
    (normalized as any).usage_type;

  normalized.property_type =
    safe.property_type ?? (initial as any).type ?? (initial as any).propertyType ??
    (normalized as any).property_type;
  normalized.category = safe.category ?? (initial as any).category ?? (normalized as any).category;

  const feat =
    safe.features ?? (initial as any).features ?? (initial as any).caracteristicas ?? [];
  
  
  // Sempre definir features, mesmo que seja um array vazio (permite remover todas as características)
  if (Array.isArray(feat)) {
    normalized.features = feat.map((v: any) => String(v).toLowerCase());
  } else {
    normalized.features = [];
  }

  // Mapear endereço do empreendimento/condomínio se estiver presente (usar apenas se campos planos não estiverem preenchidos)
  const condoAddr = condo.address || ({} as any);
  if (condoAddr) {
    normalized.bairro = normalized.bairro ?? condoAddr.neighborhood ?? condoAddr.bairro ?? normalized.bairro;
    normalized.cidade = normalized.cidade ?? condoAddr.city ?? condoAddr.cidade ?? normalized.cidade;
    normalized.cep = normalized.cep ?? condoAddr.zip_code ?? condoAddr.cep ?? normalized.cep;
    normalized.endereco = normalized.endereco ?? condoAddr.street ?? condoAddr.endereco ?? normalized.endereco;
    normalized.numero =
      normalized.numero ?? condoAddr.street_number ?? condoAddr.number ?? condoAddr.numero ?? normalized.numero;
    normalized.complemento = normalized.complemento ?? condoAddr.complement ?? condoAddr.complemento ?? normalized.complemento;
    normalized.estado = normalized.estado ?? condoAddr.state ?? condoAddr.estado ?? normalized.estado;
  }

  // --- Normalizações adicionais ---
  // Normaliza property_type variantes (PT/EN/lowercase) para os códigos usados no form
  const typeMap: Record<string, string> = {
    apartment: 'APARTMENT',
    apartamento: 'APARTMENT',
    'Apartamento': 'APARTMENT',
    apto: 'APARTMENT',
    house: 'HOUSE',
    casa: 'HOUSE',
    'Casa': 'HOUSE',
    cobertura: 'COBERTURA',
    'Cobertura': 'COBERTURA',
    cobertura_apto: 'COBERTURA',
    loft: 'LOFT',
    'Loft': 'LOFT',
    studio: 'STUDIO',
    'Studio': 'STUDIO',
    terreno: 'LOTE_TERRENO',
    'Terreno': 'LOTE_TERRENO',
  };

  const normalizeTypeValue = (v: any) => {
    if (!v) return undefined;
    const s = String(v).trim();
    const upper = s.toUpperCase();
    if (typeMap[s.toLowerCase()]) return typeMap[s.toLowerCase()];
    // If already in expected form (contains underscore or is uppercase), return as-is
    if (upper === s && (s.includes('_') || s.length <= 15)) return s;
    return upper;
  };

  normalized.property_type = normalizeTypeValue(normalized.property_type);
  
  // Normalizar category: remover acentos e converter para UPPERCASE
  if (normalized.category) {
    const removeAccents = (str: string): string => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const canonicalCategoryMap: Record<string, string> = {
      'PADRAO': 'Padrão',
      'DUPLEX': 'Duplex',
      'TRIPLEX': 'Triplex',
      'STUDIO': 'Studio',
      'COBERTURA': 'Cobertura',
      'TERREA': 'Térrea',
      'SOBRADO': 'Sobrado',
      'KITNET_CONJUGADO': 'Kitnet/Conjugado',
      'KITNET': 'Kitnet/Conjugado',
      'LOTE_CONDOMINIO': 'Lote Condomínio',
      'LOTE_VILA': 'Lote de Vila',
    };

    const formatted = String(normalized.category).trim();
    const key = removeAccents(formatted).toUpperCase().replace(/\s+/g, '_').replace('/', '_');
    normalized.category = canonicalCategoryMap[key] || formatted;
  }

  // Normalizar features: lowercase e mapear nomes para ids quando possível
  const reverseFeatureMap: Record<string, string> = {};
  Object.entries(FEATURES_MAP).forEach(([k, v]) => (reverseFeatureMap[v.toLowerCase()] = k));

  if (Array.isArray(normalized.features)) {
    normalized.features = normalized.features.map((v: any) => {
      if (!v) return v;
      const s = String(v).trim();
      const low = s.toLowerCase();
      if (reverseFeatureMap[low]) return reverseFeatureMap[low];
      return low;
    });
  }

  // Garantir que address exista com as chaves base (ajuda componentes que leem address diretamente)
  normalized.address = {
    zip_code: (normalized.cep as any) ?? (addr.zip_code as any) ?? '',
    street: (normalized.endereco as any) ?? (addr.street as any) ?? '',
    street_number:
      (normalized.numero as any) ??
      (addr.street_number as any) ??
      (addr.number as any) ??
      '',
    neighborhood:
      (normalized.bairro as any) ?? (addr.neighborhood as any) ?? '',
    city: (normalized.cidade as any) ?? (addr.city as any) ?? '',
    state: (normalized.estado as any) ?? (addr.state as any) ?? '',
    complement:
      (normalized.complemento as any) ?? (addr.complement as any) ?? '',
  } as any;

  // Mapear coordenadas iniciais (se presentes)
  const coords = (initial as any).coordinates || {};
  normalized.latitude = (initial as any).latitude ?? coords.latitude ?? (normalized as any).latitude;
  normalized.longitude = (initial as any).longitude ?? coords.longitude ?? (normalized as any).longitude;
  normalized.display_latitude =
    (initial as any).display_latitude ?? coords.display_latitude ?? (normalized as any).display_latitude ?? (normalized as any).latitude;
  normalized.display_longitude =
    (initial as any).display_longitude ?? coords.display_longitude ?? (normalized as any).display_longitude ?? (normalized as any).longitude;

  // ✅ NOVO: Normalizar property_standard (Classificação do Imóvel)
  normalized.property_standard =
    safe.property_standard ?? (initial as any).property_standard ?? (normalized as any).property_standard;

  // ✅ NOVO: Normalizar accepts_financing e accepts_exchange (Facilidades de Negociação)
  normalized.accepts_financing =
    safe.accepts_financing ?? (initial as any).accepts_financing ?? (normalized as any).accepts_financing;
  normalized.accepts_exchange =
    safe.accepts_exchange ?? (initial as any).accepts_exchange ?? (normalized as any).accepts_exchange;
  
  // ✅ NOVO: Normalizar detalhes de financiamento e permuta
  normalized.financing_details =
    safe.financing_details ?? (initial as any).financing_details ?? (normalized as any).financing_details;
  normalized.exchange_details =
    safe.exchange_details ?? (initial as any).exchange_details ?? (normalized as any).exchange_details;

  // ✅ NOVO: Normalizar campos de IPTU e Condomínio
  normalized.condo_fee =
    safe.condo_fee ?? (initial as any).condo_fee ?? (normalized as any).condo_fee;
  normalized.condo_fee_exempt =
    safe.condo_fee_exempt ?? (initial as any).condo_fee_exempt ?? (normalized as any).condo_fee_exempt;
  normalized.iptu =
    safe.iptu ?? (initial as any).iptu ?? (normalized as any).iptu;
  normalized.iptu_exempt =
    safe.iptu_exempt ?? (initial as any).iptu_exempt ?? (normalized as any).iptu_exempt;
  normalized.iptu_period =
    safe.iptu_period ?? (initial as any).iptu_period ?? (normalized as any).iptu_period;

  // ✅ NOVO: Normalizar business_type (Modalidade de Negócio)
  normalized.business_type =
    safe.business_type ?? (initial as any).business_type ?? (normalized as any).business_type;

  // ✅ NOVO: Normalizar preços (price_sale, price_rent)
  normalized.price_sale =
    safe.price_sale ?? (initial as any).price_sale ?? (initial as any).sale_price ?? (normalized as any).price_sale;
  normalized.price_rent =
    safe.price_rent ?? (initial as any).price_rent ?? (initial as any).rent_price ?? (normalized as any).price_rent;

  return normalized;
};

export const PropertyCreateProvider: React.FC<PropertyCreateProviderProps> = ({
  children,
  totalSteps,
  initialData,
  isEditMode = false,
  propertyId,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  // Inicializa o state com dados normalizados para evitar campos vazios na edição
  const [propertyData, setPropertyData] = useState<Partial<PropertyFormData>>(
    normalizeInitialData(initialData || {})
  );
  const [exportToCanalPro, setExportToCanalPro] = useState(false);

  // Calcular validação baseada nos dados atuais
  const validation = validatePropertyData(propertyData);
  const canPublish = validation.required.length === 0;

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  const updateData = useCallback((data: Partial<PropertyFormData>) => {
    setPropertyData(prev => ({ ...prev, ...data }));
  }, []);

  // updateField agora sincroniza automaticamente campos planos de endereço com o objeto `address`
  const updateField = useCallback(
    (
      field: keyof PropertyFormData,
      value: any | ((prevValue: any) => any)
    ) => {
      setPropertyData(prev => {
        const nextValue =
          typeof value === 'function'
            ? value(prev[field as keyof PropertyFormData])
            : value;
        const next = { ...prev, [field]: nextValue } as Partial<PropertyFormData>;

        // Sincronizar campos de endereço planos para o objeto address
        const addressFieldsMap: Record<string, string> = {
          bairro: 'neighborhood',
          cidade: 'city',
          cep: 'zip_code',
          endereco: 'street',
          numero: 'street_number',
          complemento: 'complement',
          estado: 'state',
        };

        if (field in addressFieldsMap) {
          const addr = { ...(prev.address || {}) } as any;
          const mappedKey = addressFieldsMap[field as string];
          addr[mappedKey] = nextValue;
          next.address = addr;
        }

        // Sincronizar áreas (se o usuário editar usable_areas, garantir area_util para compatibilidade)
        if (field === 'usable_areas') {
          (next as any).area_util = nextValue;
        }

        // Sincronizar image_urls se for atualizado
        if (field === 'image_urls') {
          (next as any).image_urls = nextValue;
        }

        return next;
      });
    },
    []
  );

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  const value = useMemo(
    () => ({
      currentStep,
      propertyData,
      formData: propertyData, // Alias para compatibilidade
      nextStep,
      prevStep,
      goToStep,
      updateData,
      updateField,
      isFirstStep,
      isLastStep,
      isEditMode,
      propertyId,
      exportToCanalPro,
      setExportToCanalPro,
      validation,
      canPublish,
    }),
    [
      currentStep,
      propertyData,
      isFirstStep,
      isLastStep,
      isEditMode,
      propertyId,
      exportToCanalPro,
      setExportToCanalPro,
      validation,
      canPublish,
      nextStep,
      prevStep,
      goToStep,
      updateData,
      updateField,
    ]
  );

  return (
    <PropertyCreateContext.Provider value={value}>
      {children}
    </PropertyCreateContext.Provider>
  );
};

// 4. Hook Customizado
export const usePropertyCreate = () => {
  const context = useContext(PropertyCreateContext);
  if (!context) {
    throw new Error('usePropertyCreate must be used within a PropertyCreateProvider');
  }
  return context;
};

export const useOptionalPropertyCreate = () => {
  return useContext(PropertyCreateContext);
};
