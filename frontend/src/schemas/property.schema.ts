import { z } from 'zod';

// Schema unificado para eliminar duplicações
export const AddressSchema = z.object({
  street: z.string().min(1, 'Endereço é obrigatório'),
  street_number: z.string().optional(),
  zip_code: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado é obrigatório'),
  complement: z.string().optional(),
});

export const PropertySchema = z.object({
  // Campos básicos
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres').max(255),
  description: z.string().optional(),
  external_id: z.string().optional(),
  
  // Tipo e categoria
  usage_type: z.enum(['RESIDENTIAL', 'COMMERCIAL'], {
    errorMap: () => ({ message: 'Selecione a finalidade' }),
  }),
  property_type: z.enum([
    'APARTMENT', 'HOUSE', 'COBERTURA', 'LOFT', 'STUDIO', 
    'CASA_CONDOMINIO', 'LOTE_TERRENO', 'SALA_COMERCIAL', 'LOJA'
  ], {
    errorMap: () => ({ message: 'Selecione o tipo de imóvel' }),
  }),
  category: z.string().optional(),
  
  // Negócio
  business_type: z.enum(['SALE', 'RENTAL', 'SALE_RENTAL'], {
    errorMap: () => ({ message: 'Selecione a modalidade' }),
  }),
  
  // Endereço (UNIFICADO)
  address: AddressSchema,
  
  // Preços
  price_sale: z.number().min(0).optional(),
  price_rent: z.number().min(0).optional(),
  condo_fee: z.number().min(0).optional(),
  condo_fee_exempt: z.boolean().optional(),
  iptu: z.number().min(0).optional(),
  iptu_exempt: z.boolean().optional(),
  iptu_period: z.enum(['MONTHLY', 'YEARLY']).optional(),
  
  // Características físicas
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  suites: z.number().int().min(0).max(20).optional(),
  parking_spaces: z.number().int().min(0).max(20).optional(),
  
  // Áreas (alinhado aos tipos)
  usable_areas: z.number().min(0).optional(),
  total_areas: z.number().min(0).optional(),
  
  // Unidade/torre
  unit: z.string().optional(),
  block: z.string().optional(),
  unit_floor: z.number().int().min(0).max(200).optional(),

  // Estrutura do condomínio/prédio
  floors: z.number().int().min(0).max(300).optional(),
  units_on_floor: z.number().int().min(0).max(50).optional(),
  buildings: z.number().int().min(0).max(50).optional(),
  construction_year: z.number().int().min(1900).max(2100).optional(),

  // Empreendimento (vínculo)
  empreendimento_id: z.number().int().positive().optional(),
  
  // Features
  features: z.array(z.string()).optional(),
  custom_features: z.string().optional(),
  // Itens inclusos no condomínio (ex.: água, gás, etc.)
  condo_includes: z.array(z.string()).optional(),
  
  // Mídia
  image_urls: z.array(z.string().url()).optional(),
  videos: z.string().url().optional(),
  virtual_tour_link: z.string().url().optional(),
  images: z.any().array().optional(),
  documents: z.any().array().optional(),
  
  // Configurações de exibição
  address_display: z.enum(['ALL', 'STREET', 'NEIGHBORHOOD']).optional(),
  publication_type: z.enum(['STANDARD', 'PREMIUM', 'SUPER_PREMIUM', 'PREMIERE_1', 'PREMIERE_2', 'TRIPLE']).optional(),

  // Step 6 (Descrição inteligente)
  accepts_financing: z.boolean().optional(),
  financing_details: z.string().optional(),
  accepts_exchange: z.boolean().optional(),
  exchange_details: z.string().optional(),
  property_standard: z.enum(['ECONOMIC', 'MEDIUM', 'MEDIUM_HIGH', 'HIGH', 'LUXURY']).optional(),
  
  // Status
  status: z.enum(['pending', 'active', 'imported', 'synced', 'exported', 'error']).optional(),
});

export type PropertyFormData = z.infer<typeof PropertySchema>;

// Validação condicional baseada em business_type e tipo de imóvel
export const validatePropertyData = (data: Partial<PropertyFormData>) => {
  const result = PropertySchema.partial().safeParse(data);
  const errors: string[] = [];
  
  if (!result.success) {
    result.error.errors.forEach(err => {
      errors.push(err.message);
    });
  }
  
  // Validações condicionais de preços
  if (data.business_type === 'SALE' || data.business_type === 'SALE_RENTAL') {
    if (!data.price_sale || data.price_sale <= 0) {
      errors.push('Preço de venda é obrigatório para modalidade de venda');
    }
  }
  
  if (data.business_type === 'RENTAL' || data.business_type === 'SALE_RENTAL') {
    if (!data.price_rent || data.price_rent <= 0) {
      errors.push('Valor do aluguel é obrigatório para modalidade de locação');
    }
  }

  // Empreendimento obrigatório para tipos em condomínio
  const typesRequiringCondo = new Set(['APARTMENT', 'FLAT', 'STUDIO', 'CASA_CONDOMINIO']);
  if (data.property_type && typesRequiringCondo.has(data.property_type as string)) {
    if (!data.empreendimento_id || data.empreendimento_id <= 0) {
      errors.push('Selecione um empreendimento para este tipo de imóvel');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: result.success ? result.data : null,
  };
};
