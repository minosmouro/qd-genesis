// Tipos base para o CRM QuadraDois

// Re-exportar tipos específicos
export * from './refresh';
export * from './canalpro';

export interface User {
  id: number;
  username: string;
  email: string;
  tenant_id: number;
  is_admin?: boolean;
}

export interface Tenant {
  id: number;
  name: string;
}

export interface Property {
 id: number;
 title: string;
 description?: string;
 external_id: string;
 status: 'imported' | 'pending' | 'synced' | 'created' | 'exported' | 'error' | 'failed' | 'queued_failed' | 'active' | 'ACTIVE' | 'refreshing';
 image_urls?: string[];
 remote_id?: string;
 error?: string;
 property_code?: string;
 created_at: string;
 updated_at: string;
 address?: {
    zip_code: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  coordinates?: {
    latitude?: number;
    longitude?: number;
    display_latitude?: number;
    display_longitude?: number;
  };
  bedrooms?: number;
  bathrooms?: number;
  suites?: number;
  garage_spots?: number;
  parking_spaces?: number; // Nome correto
  area_total?: number;
  area_util?: number;
  total_areas?: number; // Nome correto
  usable_areas?: number; // Nome correto
  price_sale?: number;
  price_rent?: number;
  condo_fee?: number;
  iptu?: number;
  // Campo de tour virtual / vídeo vindo do backend (variações possíveis)
  virtual_tour_link?: string;
  // Estrutura opcional agrupada de informações de condomínio (alguns provedores retornam agrupado)
  condominium?: {
    name?: string;
    condo_fee?: number;
    iptu?: number;
    description?: string;
  };
  owner?: {
    owner_name: string;
    owner_contact: string;
  };
  // Tipo de destaque de publicação (CanalPro/Backend)
  publication_type?: 'STANDARD' | 'PREMIUM' | 'SUPER_PREMIUM' | 'PREMIERE_1' | 'PREMIERE_2' | 'TRIPLE';
}

export interface PropertyFormData {
  id?: number;
  title: string;
  description?: string;
  external_id?: string; // Opcional - backend gera property_code automaticamente
  property_code?: string; // Somente leitura - gerado pelo backend
  status?: 'imported' | 'pending' | 'synced' | 'created' | 'exported' | 'error' | 'failed' | 'queued_failed' | 'active' | 'ACTIVE' | 'refreshing';
  image_urls?: string[];
  address?: {
    zip_code: string;
    street: string;
    street_number?: string;
    neighborhood: string;
    city: string;
    state: string;
    complement?: string;
  };

  // Campos de localização individual (para facilitar o form)
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pontoReferencia?: string;
  zona?: string;
  observacoesLocalizacao?: string;

  // Coordenadas de localização
  latitude?: number;
  longitude?: number;
  display_latitude?: number;
  display_longitude?: number;

  // Informações básicas do imóvel
  usage_type?: 'RESIDENTIAL' | 'COMMERCIAL';
  property_type?: string;
  category?: string;
  // Características básicas
  bedrooms?: number;
  bathrooms?: number;
  suites?: number;
  parking_spaces?: number;
  usable_areas?: number;
  total_areas?: number;
  unit_floor?: number;

  // Estrutura do condomínio/prédio
  floors?: number;
  units_on_floor?: number;
  buildings?: number;
  construction_year?: number;

  // Campos específicos para apartamentos, flats e studios
  unit?: string; // Número/identificação da unidade (ex: 101, 2A, 504)
  block?: string; // Bloco/Torre (ex: A, B, Torre 1)

  // Características
  features?: string[];
  custom_features?: string;

  // Empreendimento (seleção/vínculo)
  empreendimento_id?: number;
  nome_empreendimento?: string | null; // Nome digitado para criar novo empreendimento
  condominium?: {
    id?: number;
    nome?: string;
    endereco?: {
      cep?: string;
      endereco?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      cidade?: string;
      estado?: string;
      pontoReferencia?: string;
      zona?: string;
    };
    informacoes?: {
      andares?: number | string | null;
      unidadesPorAndar?: number | string | null;
      blocos?: number | string | null;
      entregaEm?: string | null;
      caracteristicas?: string[] | null;
      caracteristicasPersonalizadas?: string | null;
    };
  };
  // Características do empreendimento (salvas separadamente em empreendimentos.caracteristicas)
  empreendimento_caracteristicas?: string[];
  // Itens inclusos no condomínio (ex.: água, gás, etc.)
  condo_includes?: string[];

  // Valores
  business_type?: 'SALE' | 'RENTAL' | 'SALE_RENTAL';
  price_sale?: number;
  price_rent?: number;
  condo_fee?: number;
  condo_fee_exempt?: boolean;
  iptu?: number;
  iptu_exempt?: boolean;
  iptu_period?: 'MONTHLY' | 'YEARLY';

  // ✨ NOVOS CAMPOS - Step 6 Descrição Inteligente
  accepts_financing?: boolean; // Aceita financiamento bancário?
  financing_details?: string; // Detalhes sobre financiamento
  accepts_exchange?: boolean; // Aceita permuta/troca?
  exchange_details?: string; // O que aceita como permuta
  property_standard?: 'ECONOMIC' | 'MEDIUM' | 'MEDIUM_HIGH' | 'HIGH' | 'LUXURY'; // Padrão do imóvel

  // Mídia
  videos?: string;
  virtual_tour_link?: string;
  images?: File[];
  documents?: File[];

  // Proprietário
  owner?: {
    owner_name: string;
    owner_contact: string;
  };

  // Configurações de exibição
  address_display?: 'ALL' | 'STREET' | 'NEIGHBORHOOD';
  // Tipo de destaque de publicação (CanalPro/Backend)
  publication_type?: 'STANDARD' | 'PREMIUM' | 'SUPER_PREMIUM' | 'PREMIERE_1' | 'PREMIERE_2' | 'TRIPLE';
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  total_listings: number;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  q?: string;
  status?: Property['status'];
  property_type?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  tenant_name?: string;
}

// Tipos para MCP (Model Context Protocol)
export interface MCPPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, any>;
}

export interface MCPSearchParams {
  tenant_id?: number;
  vector?: number[];
  top?: number;
  query?: string;
}

export interface MCPSearchResult {
  id: string;
  score: number;
  payload: Record<string, any>;
}

// Tipos para componentes UI
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  name?: string;
  id?: string;
}

export interface StatusPillProps {
  status: Property['status'];
  className?: string;
}

// Tipos para formulários
export interface PropertyFormProps {
  property?: Property;
  onSubmit: (data: PropertyFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

// Tipos para tabelas
export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  selectedIds?: (string | number)[];
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  sortKey?: keyof T;
  sortDirection?: 'asc' | 'desc';
}

// Tipos para modais
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Tipos para toasts
export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

// Tipos para filtros
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterProps {
  options: FilterOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

// Tipos para paginação
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

// Tipos para hooks
export interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UseDebouncedSearchReturn {
  searchTerm: string;
  debouncedSearchTerm: string;
  setSearchTerm: (term: string) => void;
  clearSearch: () => void;
}