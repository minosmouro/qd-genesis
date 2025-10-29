/**
 * Types para o sistema de Refresh CanalPro
 */

export interface RefreshSchedule {
  id: number;
  tenant_id: number;
  name: string;
  description?: string;
  schedule_type: 'one_time' | 'recurring';
  time_config: {
    times: string[]; // ['10:00', '12:00', '20:00', '21:00']
    timezone?: string;
    days_of_week?: number[]; // 0-6 (domingo-sábado)
  };
  // Campos adicionais para compatibilidade com componentes
  execution_time: string;
  days_of_week: number[];
  next_execution?: string;
  last_execution?: string;
  last_execution_status?: 'success' | 'failed';
  property_count?: number;
  total_properties?: number;
  completed_jobs?: number;
  failed_jobs?: number;
  //
  is_active: boolean;
  created_at: string;
  updated_at: string;
  properties_count?: number;
  last_run?: string;
  next_run?: string;
}

export interface RefreshScheduleProperty {
  id: number;
  schedule_id: number;
  property_id: number;
  created_at: string;
  property?: {
    id: number;
    title: string;
    status: string;
    canalpro_id?: string;
  };
}

export interface RefreshJob {
  id: number;
  schedule_id: number;
  property_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  canalpro_response?: any;
  created_at: string;
  // Campos adicionais para compatibilidade
  schedule_name?: string; 
  total_properties?: number;
  processed_properties?: number;
  result?: any;
  error?: string;
  //
  property?: {
    id: number;
    title: string;
    canalpro_id?: string;
  };
  schedule?: {
    id: number;
    name: string;
  };
}

export interface RefreshStats {
  total_schedules: number;
  active_schedules: number;
  total_properties: number;
  next_execution?: string;
  jobs_last_24h: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  schedules_by_status: {
    active: number;
    inactive: number;
  };
}

export interface CreateRefreshScheduleRequest {
  name: string;
  time_slot: string; // formato "HH:MM" - compatível com backend
  frequency_days?: number; // frequência em dias
  property_ids?: number[]; // IDs dos imóveis (opcional)
  is_active?: boolean;
}

// Aliases para compatibilidade - remove duplicates
// export type CreateRefreshScheduleData = CreateRefreshScheduleRequest;
// export type UpdateRefreshScheduleData = Partial<CreateRefreshScheduleRequest>;

// Parâmetros de paginação
export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export interface UpdateRefreshScheduleRequest {
  id: number;
  name?: string;
  time_slot?: string; // formato "HH:MM" - compatível com backend
  frequency_days?: number;
  is_active?: boolean;
}

export interface RefreshScheduleListResponse {
  data: RefreshSchedule[];
  total: number;
  page: number;
  page_size: number;
}

export interface RefreshJobListResponse {
  data: RefreshJob[];
  total: number;
  page: number;
  page_size: number;
}

export interface BulkOperationResponse {
  success: boolean;
  message: string;
  processed: number;
  errors?: string[];
}

export interface CleanupResponse {
  message: string;
  deleted: number;
  days: number;
}

// Data interfaces for forms
export interface CreateRefreshScheduleData {
  name: string;
  description?: string;
  hour: number;
  minute: number;
  days_of_week: number[];
  is_active: boolean;
}

export interface UpdateRefreshScheduleData {
  name?: string;
  description?: string;
  hour?: number;
  minute?: number;
  days_of_week?: number[];
  is_active?: boolean;
}