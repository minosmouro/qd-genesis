import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload } from './api';
import {
  Property,
  PropertyFormData,
  ImportResult,
  PaginationParams,
  PaginatedResponse,
  MCPPoint,
  MCPSearchParams,
  MCPSearchResult,
} from '@/types';
import { generateExternalId } from '@/utils/id';

export interface PropertyStatusSummarySource {
  status: string | null;
  count: number;
}

export interface PropertyStatusSummaryItem {
  key: string;
  label: string;
  description: string;
  category: string;
  category_label: string;
  category_order: number;
  is_active: boolean;
  order: number;
  count: number;
  sources?: PropertyStatusSummarySource[];
}

export interface PropertyStatusCategorySummary {
  key: string;
  label: string;
  order: number;
  count: number;
}

export interface PropertyStatusSummary {
  total: number;
  active_total: number;
  inactive_total: number;
  by_status: PropertyStatusSummaryItem[];
  by_category: PropertyStatusCategorySummary[];
  counts_by_key: Record<string, number>;
  raw_statuses?: Record<string, PropertyStatusSummarySource[]>;
}

export interface PropertyDashboardStats {
  total_properties: number;
  properties_in_refresh: number;
  last_update: string | null;
  properties_by_type: Record<string, number>;
  active_properties: number;
  inactive_properties: number;
  highlighted_properties: number;
  status_summary: PropertyStatusSummary;
}

export const propertiesService = {
  // ==================== PUBLIC ROUTES (for public portal) ====================
  
  /**
   * Lista propriedades públicas (sem autenticação)
   * Usado apenas para portal público de anúncios
   */
  async listPublic(params?: PaginationParams): Promise<PaginatedResponse<Property>> {
    return apiGet<PaginatedResponse<Property>>('/api/properties/public', params);
  },

  // ==================== PRIVATE ROUTES (for tenant dashboard) ====================
  
  /**
   * Lista propriedades do tenant (com autenticação)
   * Inclui propriedades próprias + propriedades compartilhadas via parcerias
   * @param params - Parâmetros de paginação e filtros
   * @param includeShared - Se true, inclui propriedades compartilhadas com o tenant
   */
  async list(params?: PaginationParams & { include_shared?: boolean }): Promise<PaginatedResponse<Property>> {
    const { include_shared = true, ...restParams } = params || {};
    const queryParams = {
      ...restParams,
      include_shared: include_shared.toString(),
    };
    return apiGet<PaginatedResponse<Property>>('/api/properties', queryParams);
  },

  /**
   * Obtém uma propriedade específica (pública - sem autenticação)
   * Usado apenas para portal público
   */
  async getByIdPublic(id: number): Promise<Property> {
    return apiGet<Property>(`/api/properties/public/${id}`);
  },

  /**
   * Obtém propriedade completa (autenticada)
   * Valida se o tenant tem acesso (próprio ou compartilhado)
   * Inclui dados detalhados para edição
   */
  async getById(id: number): Promise<Property> {
    return apiGet<Property>(`/api/properties/${id}`);
  },

  // Cria uma nova propriedade
  async create(data: PropertyFormData): Promise<Property> {
    // Garantir external_id sempre presente conforme validação do backend
    const payload: PropertyFormData = {
      ...data,
      external_id: data.external_id || generateExternalId(),
    } as PropertyFormData;

    const res = await apiPost<any>('/api/properties', payload);
    // Backend retorna { message, property_id, property }
    return res && res.property ? res.property : res;
  },

  // Atualiza uma propriedade
  async update(id: number, data: Partial<PropertyFormData>): Promise<Property> {
    return apiPut<Property>(`/api/properties/${id}`, data);
  },

  // Atualiza parcialmente uma propriedade
  async patch(id: number, data: Partial<PropertyFormData>): Promise<Property> {
    return apiPatch<Property>(`/api/properties/${id}`, data);
  },

  // Remove uma propriedade
  async delete(id: number): Promise<void> {
    return apiDelete<void>(`/api/properties/${id}`);
  },

  // Duplica uma propriedade
  async duplicate(id: number): Promise<Property> {
    const response = await apiPost<any>(`/api/properties/${id}/duplicate`);
    return response && response.property ? response.property : response;
  },

  // Importa propriedades do Canal Pro (Gandalf)
  async importFromGandalf(body: { filter?: any } = {}): Promise<ImportResult> {
    // Envia o filtro no corpo para que o backend importe somente os registros correspondentes
  return apiPost<ImportResult>('/api/properties/import/gandalf', body);
  },

  // Sincroniza uma propriedade específica com o Gandalf
  async syncWithGandalf(id: number): Promise<{ message: string }> {
    return apiPost<{ message: string }>(`/api/properties/${id}/sync_gandalf`);
  },

  // Upload de imagem para uma propriedade
  async uploadImage(
    propertyId: number,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ imageUrl: string }> {
    return apiUpload<{ imageUrl: string }>(
      `/api/properties/${propertyId}/images/upload`,
      file,
      onProgress
    );
  },

  // Busca propriedades por texto
  async search(
    query: string,
    params?: Omit<PaginationParams, 'q'>
  ): Promise<PaginatedResponse<Property>> {
    return apiGet<PaginatedResponse<Property>>('/api/properties', {
      ...params,
      q: query,
    });
  },

  // Filtra propriedades por status
  async filterByStatus(
    status: Property['status'],
    params?: Omit<PaginationParams, 'status'>
  ): Promise<PaginatedResponse<Property>> {
    return apiGet<PaginatedResponse<Property>>('/api/properties', {
      ...params,
      status,
    });
  },

  // Ações em lote
  async bulkSync(
    ids: number[]
  ): Promise<{ message: string; synced: number; errors: string[] }> {
    return apiPost<{ message: string; synced: number; errors: string[] }>(
  '/api/properties/bulk/sync_gandalf',
      { ids }
    );
  },

  async bulkDelete(
    ids: number[]
  ): Promise<{ message: string; deleted: number; errors: string[] }> {
    return apiPost<{ message: string; deleted: number; errors: string[] }>(
  '/api/properties/bulk/delete',
      { ids }
    );
  },

  // MCP (Model Context Protocol) - Upsert de pontos
  async mcpUpsert(
    points: MCPPoint[],
    tenantId?: number
  ): Promise<{ message: string }> {
    return apiPost<{ message: string }>('/api/mcp/upsert', {
      tenant_id: tenantId,
      points,
    });
  },

  // MCP - Busca de pontos
  async mcpSearch(
    params: MCPSearchParams
  ): Promise<{ results: MCPSearchResult[] }> {
    return apiPost<{ results: MCPSearchResult[] }>('/api/mcp/search', params);
  },

  // Estatísticas das propriedades
  async getStats(): Promise<{
    total: number;
    imported: number;
    pending: number;
    synced: number;
    error: number;
  }> {
    return apiGet<{
      total: number;
      imported: number;
      pending: number;
      synced: number;
      error: number;
  }>('/api/properties/stats');
  },

  // Verifica status de sincronização
  async checkSyncStatus(
    id: number
  ): Promise<{
    status: Property['status'];
    lastSync?: string;
    error?: string;
  }> {
    return apiGet<{
      status: Property['status'];
      lastSync?: string;
      error?: string;
    }>(`/api/properties/${id}/sync_status`);
  },

  // Retry de sincronização com erro
  async retrySync(id: number): Promise<{ message: string }> {
    return apiPost<{ message: string }>(`/api/properties/${id}/retry_sync`);
  },

  // DEBUG: retorna token mascarado do provider 'gandalf' para o tenant autenticado
  async debugGandalfToken(): Promise<{ token_masked: string }> {
    return apiGet<{ token_masked: string }>(`/api/properties/debug/gandalf_token`);
  },

  // Dashboard: estatísticas gerais dos imóveis
  async getDashboardStats(): Promise<PropertyDashboardStats> {
    return apiGet<PropertyDashboardStats>('/api/properties/dashboard/stats');
  },
};
