// Tipos para integração Canal Pro
export interface CanalProCredentials {
  email: string;
  password: string;
  device_id: string;
  publisher_id?: string;
  odin_id?: string;
  contract_id?: string;
}

export interface ExportResult {
  // Nem todos os backends retornam o mesmo formato.
  // Campos opcionais para maior resiliência no frontend.
  success?: boolean;
  processed?: number;
  successful?: number;
  failed?: number;
  errors?: string[];
  // export_id pode ser uma string ou um objeto com detalhes do job
  export_id?: string | {
    export_id?: string;
    start_time?: string;
    end_time?: string;
    processed?: number;
    successful?: number;
    failed?: number;
    status?: string;
    message?: string;
  };
}

export interface ExportStatus {
  is_running: boolean;
  current_progress: number;
  total_properties: number;
  processed: number;
  successful: number;
  failed: number;
  estimated_time_remaining?: number;
  current_property?: {
    id: number;
    external_id: string;
    title: string;
  };
}

export interface ExportRecord {
  id: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  total_properties: number;
  successful: number;
  failed: number;
  errors: string[];
  created_by: {
    id: number;
    name: string;
  };
}

export interface CredentialsStatus {
  has_credentials: boolean;
  is_valid: boolean;
  last_validated?: string;
  expires_at?: string;
  user_info?: {
    email: string;
    name?: string;
  };
}

// Detalhes de erro estruturados retornados pelo backend
export interface ExportErrorDetail {
  property_id: number;
  external_id?: string;
  remote_id?: string;
  code?: string; // e.g. 'PLAN_HIGHLIGHT_NOT_ALLOWED'
  message: string;
  step?: 'export' | 'activate';
}

export interface ExportAndActivateResult {
  export_stats: {
    processed?: number;
    successful?: number;
    failed?: number;
    errors?: ExportErrorDetail[];
  };
  activation_results: Array<{
    property_id: number;
    remote_id?: string;
    activated: boolean;
    activated_at?: string;
    error?: string;
    response?: any;
  }>;
  message?: string;
}

// Configuração de contrato do CanalPro (Gandalf)
export type PublicationType = 'STANDARD' | 'PREMIUM' | 'SUPER_PREMIUM' | 'PREMIERE_1' | 'PREMIERE_2' | 'TRIPLE';

export interface CanalProContract {
  id?: number;
  tenant_id?: number;
  provider: string; // 'gandalf'
  contract_number?: string | null;
  max_listings?: number | null;
  highlight_limits?: Partial<Record<PublicationType, number>>; // limites por tipo
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// KPIs consolidados do contrato CanalPro (carteira)
export interface CanalProContractKPIResponse {
  success: boolean;
  tenant_id: number;
  total_properties: number;
  publication_counts: Record<string, number>;
  highlighted_count: number;
  non_highlight_count: number;
  contract: { max_listings?: number | null; highlight_limits?: Record<string, number> };
  usage: {
    total: { used: number; limit: number; remaining: number; over_limit: boolean } | null;
    highlights_by_type: Record<string, { used: number; limit?: number | null; remaining?: number | null; over_limit: boolean }>;
  };
}