import { apiGet, apiPost, apiDelete } from './api';
import {
  ExportResult,
  ExportStatus,
  ExportRecord,
  CanalProCredentials,
  CredentialsStatus,
  ExportAndActivateResult,
  CanalProContract,
  CanalProContractKPIResponse
} from '@/types/canalpro';
import type { PaginationParams, PaginatedResponse } from '@/types';

export const canalproService = {
  // Listar propriedades com informações resumidas para gestão de destaques
  async getProperties(): Promise<{ properties: Array<{ id: number; code?: string; external_id?: string; title?: string; address?: string; highlight_type?: string }> }>{
    // Buscar uma página grande o suficiente para uso na UI
    const resp = await apiGet<{ data: any[]; total: number; page: number; page_size: number }>(
  '/api/properties',
      { page: 1, page_size: 200 }
    );

    const properties = (resp?.data || []).map((p: any) => {
      const addr = p?.address;
      const addrStr = addr
        ? [addr.street, addr.number, addr.neighborhood, addr.city, addr.state]
            .filter(Boolean)
            .join(', ')
        : '';
      return {
        id: p.id,
        // Preencher código com fallback robusto: property_code -> external_id -> remote_id -> code
        code: p.property_code || p.external_id || p.remote_id || p.code,
        external_id: p.external_id,
        title: p.title,
        address: addrStr,
        highlight_type: p.publication_type
      };
    });

    return { properties };
  },
  // Iniciar exportação para Canal Pro
  async exportProperties(propertyIds?: number[]): Promise<ExportResult> {
    return apiPost<ExportResult>('/integrations/canalpro/export', {
      property_ids: propertyIds
    });
  },

  // Iniciar exportação + ativação para Canal Pro
  async exportAndActivateProperties(propertyIds?: number[]): Promise<ExportAndActivateResult> {
    return apiPost<ExportAndActivateResult>('/integrations/canalpro/export_and_activate', {
      propertyIds: propertyIds
    });
  },

  // Atualiza publication_type em lote
  async bulkUpdatePublicationType(propertyIds: number[], publicationType: string): Promise<{ updated: number; publication_type: string; message: string }>{
  return apiPost('/api/properties/bulk/update_publication_type', {
      property_ids: propertyIds,
      publication_type: publicationType
    });
  },

  // Remover destaques em lote (seta para STANDARD e reativa no CanalPro)
  async removeHighlights(payload: { property_ids: number[] }): Promise<void> {
    const ids = payload.property_ids || [];
    if (!ids.length) return;
    await canalproService.bulkUpdatePublicationType(ids, 'STANDARD');
    // Propagar para o CanalPro
    await canalproService.exportAndActivateProperties(ids);
  },

  // Verificar status da exportação
  async getExportStatus(): Promise<ExportStatus> {
    return apiGet<ExportStatus>('/integrations/canalpro/export/status');
  },

  // Obter histórico de exportações
  async getExportHistory(params?: PaginationParams): Promise<PaginatedResponse<ExportRecord>> {
    return apiGet<PaginatedResponse<ExportRecord>>('/integrations/canalpro/export/history', params);
  },

  // Configurar credenciais do Canal Pro
  async setupCredentials(credentials: CanalProCredentials): Promise<void> {
    return apiPost<void>('/integrations/canalpro/setup', credentials);
  },

  // Verificar status das credenciais
  async checkCredentials(): Promise<CredentialsStatus> {
    return apiGet<CredentialsStatus>('/integrations/canalpro/credentials/check');
  },

  // Renovar credenciais
  async renewCredentials(email: string, password: string): Promise<any> {
    return apiPost('/integrations/canalpro/credentials/renew', {
      email,
      password
    });
  },

  // Obter configuração do contrato CanalPro
  async getContractConfig(): Promise<{ success: boolean; config: CanalProContract | null }> {
    return apiGet<{ success: boolean; config: CanalProContract | null }>('/api/canalpro-contract/config');
  },

  // Salvar configuração do contrato CanalPro
  async saveContractConfig(config: Partial<CanalProContract>): Promise<{ success: boolean; config: CanalProContract | null; message?: string }> {
    return apiPost<{ success: boolean; config: CanalProContract | null; message?: string }>('/api/canalpro-contract/config', config);
  },

  // Remover configuração do contrato CanalPro
  async deleteContractConfig(): Promise<{ success: boolean; message?: string }> {
    return apiDelete<{ success: boolean; message?: string }>('/api/canalpro-contract/config');
  },

  // Obter KPIs do contrato CanalPro (carteira)
  getContractKPIs: async (): Promise<CanalProContractKPIResponse> => {
    return apiGet<CanalProContractKPIResponse>('/api/canalpro-contract/kpis');
  },

  // Importar imóveis do CanalPro (Gandalf)
  async importProperties(onlyActive: boolean = true): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await apiPost<any>('/integrations/gandalf/import', { only_active: onlyActive });
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao importar imóveis' };
    }
  }
};