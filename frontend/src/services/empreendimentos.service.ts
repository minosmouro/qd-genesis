// Serviço para gerenciar empreendimentos/condomínios
import { errorLog } from '@/utils/logger';

export interface Empreendimento {
  id: number;
  nome: string;
  endereco: {
    cep: string;
    endereco: string;
    numero?: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    pontoReferencia?: string;
    zona?: string;
  };
  informacoes: {
    andares?: number;
    unidadesPorAndar?: number;
    blocos?: number;
    entregaEm?: string;
    caracteristicas?: string[];
    caracteristicasPersonalizadas?: string;
  };
  createdAt: string;
  updatedAt: string;
  totalImoveis: number; // Quantos imóveis cadastrados neste empreendimento
}

export interface CreateEmpreendimentoRequest {
  nome: string;
  endereco: {
    cep: string;
    endereco: string;
    numero?: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    pontoReferencia?: string;
    zona?: string;
  };
  informacoes: {
    andares?: number;
    unidadesPorAndar?: number;
    blocos?: number;
    entregaEm?: string;
    caracteristicas?: string[];
    caracteristicasPersonalizadas?: string;
  };
}

class EmpreendimentosService {
  private baseUrl = (import.meta.env.DEV
    ? ''
    : (import.meta.env.VITE_API_URL || 'https://api.quadradois.com.br')) + '/api/empreendimentos';
  private useMock = false; // ✅ API REAL ATIVADA! Altere para true se quiser usar mock

  // Headers para autenticação
  private getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  // Buscar empreendimentos por nome (autocomplete)
  async searchByName(query: string): Promise<Empreendimento[]> {
    if (this.useMock) {
      const { mockEmpreendimentosService } = await import(
        './empreendimentos.mock'
      );
      return mockEmpreendimentosService.searchByName(query);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=10`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) throw new Error('Erro ao buscar empreendimentos');

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Erro na busca');

      return result.empreendimentos || [];
    } catch (error) {
      errorLog('Erro na busca de empreendimentos:', error);
      return [];
    }
  }

  // Buscar empreendimento por ID completo
  async getById(id: number): Promise<Empreendimento | null> {
    if (this.useMock) {
      const { mockEmpreendimentosService } = await import(
        './empreendimentos.mock'
      );
      return mockEmpreendimentosService.getById(id);
    }

    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Erro ao carregar empreendimento');
      }

      const result = await response.json();
      if (!result.success) return null;

      return result.data;
    } catch (error) {
      errorLog('Erro ao carregar empreendimento:', error);
      return null;
    }
  }

  // Criar novo empreendimento
  async create(
    data: CreateEmpreendimentoRequest,
    idempotencyKey?: string
  ): Promise<Empreendimento> {
    if (this.useMock) {
      const { mockEmpreendimentosService } = await import(
        './empreendimentos.mock'
      );
      return mockEmpreendimentosService.create(data);
    }

    // Gerar Idempotency-Key se não fornecido
    const key = idempotencyKey || crypto.randomUUID();

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Idempotency-Key': key,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao criar empreendimento');
      }

      const result = await response.json();
      if (!result.success)
        throw new Error(result.error || 'Erro ao criar empreendimento');

      return result.data;
    } catch (error) {
      errorLog('Erro ao criar empreendimento:', error);
      throw error;
    }
  }

  // Atualizar empreendimento existente
  async update(
    id: number,
    data: Partial<CreateEmpreendimentoRequest>
  ): Promise<Empreendimento> {
    if (this.useMock) {
      const { mockEmpreendimentosService } = await import(
        './empreendimentos.mock'
      );
      return mockEmpreendimentosService.update(id, data);
    }

    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao atualizar empreendimento');
      }

      const result = await response.json();
      if (!result.success)
        throw new Error(result.error || 'Erro ao atualizar empreendimento');

      return result.data;
    } catch (error) {
      errorLog('Erro ao atualizar empreendimento:', error);
      throw error;
    }
  }

  // Listar empreendimentos mais utilizados
  async getMostUsed(limit: number = 10): Promise<Empreendimento[]> {
    if (this.useMock) {
      const { mockEmpreendimentosService } = await import(
        './empreendimentos.mock'
      );
      return mockEmpreendimentosService.getMostUsed(limit);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/mais-usados?limit=${limit}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) throw new Error('Erro ao carregar empreendimentos');

      const result = await response.json();
      if (!result.success)
        throw new Error(result.error || 'Erro ao carregar empreendimentos');

      return result.empreendimentos || [];
    } catch (error) {
      errorLog('Erro ao carregar empreendimentos mais usados:', error);
      return [];
    }
  }

  // Buscar empreendimentos próximos por localização
  async buscarProximos(
    cep?: string,
    bairro?: string,
    cidade?: string
  ): Promise<Empreendimento[]> {
    if (this.useMock) {
      const { mockEmpreendimentosService } = await import(
        './empreendimentos.mock'
      );
      return mockEmpreendimentosService.searchByName(bairro || cep || '');
    }

    try {
      const params = new URLSearchParams();
      if (cep) params.append('cep', cep);
      if (bairro) params.append('bairro', bairro);
      if (cidade) params.append('cidade', cidade);

      const response = await fetch(
        `${this.baseUrl}/buscar-proximos?${params.toString()}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) throw new Error('Erro ao buscar empreendimentos próximos');

      const result = await response.json();
      
      if (result.success) {
        return result.empreendimentos || [];
      }
      
      throw new Error(result.error || 'Erro ao buscar empreendimentos');
    } catch (error) {
      errorLog('Erro ao buscar empreendimentos próximos:', error);
      return [];
    }
  }

  // Verificar se empreendimento já existe por nome e endereço
  async checkDuplicate(
    nome: string,
    cep: string,
    bairro: string = ''
  ): Promise<Empreendimento | null> {
    if (this.useMock) {
      const { mockEmpreendimentosService } = await import(
        './empreendimentos.mock'
      );
      return mockEmpreendimentosService.checkDuplicate(nome, cep);
    }

    try {
      const response = await fetch(`${this.baseUrl}/duplicata`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          nome,
          endereco: { cep, bairro },
        }),
      });

      if (!response.ok) throw new Error('Erro ao verificar duplicata');

      const result = await response.json();
      if (!result.success) return null;

      return result.exists ? result.data : null;
    } catch (error) {
      errorLog('Erro ao verificar duplicata:', error);
      return null;
    }
  }

  // ===== SISTEMA DE SUGESTÕES DE EDIÇÃO =====

  /**
   * Sugere uma edição para um empreendimento
   */
  async suggestEdit(
    empreendimentoId: number,
    suggestedChanges: Partial<CreateEmpreendimentoRequest>,
    reason: string
  ): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${empreendimentoId}/suggestions`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            suggested_changes: suggestedChanges,
            reason,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao enviar sugestão');
      }

      const result = await response.json();
      if (!result.success)
        throw new Error(result.error || 'Erro ao enviar sugestão');

      return result.data;
    } catch (error) {
      errorLog('Erro ao sugerir edição:', error);
      throw error;
    }
  }

  /**
   * Lista sugestões de edição (apenas admin)
   */
  async listSuggestions(
    status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
    page: number = 1,
    perPage: number = 20
  ): Promise<{ data: any[]; pagination: any }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/suggestions?status=${status}&page=${page}&per_page=${perPage}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Acesso negado. Apenas administradores.');
        }
        throw new Error('Erro ao listar sugestões');
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Erro ao listar');

      return {
        data: result.data || [],
        pagination: result.pagination || {},
      };
    } catch (error) {
      errorLog('Erro ao listar sugestões:', error);
      throw error;
    }
  }

  /**
   * Aprova uma sugestão de edição (apenas admin)
   */
  async approveSuggestion(
    suggestionId: number,
    reviewNotes?: string
  ): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/suggestions/${suggestionId}/approve`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            review_notes: reviewNotes || 'Aprovado',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao aprovar sugestão');
      }

      const result = await response.json();
      if (!result.success)
        throw new Error(result.error || 'Erro ao aprovar sugestão');

      return result;
    } catch (error) {
      errorLog('Erro ao aprovar sugestão:', error);
      throw error;
    }
  }

  /**
   * Rejeita uma sugestão de edição (apenas admin)
   */
  async rejectSuggestion(
    suggestionId: number,
    reviewNotes: string
  ): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/suggestions/${suggestionId}/reject`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            review_notes: reviewNotes,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao rejeitar sugestão');
      }

      const result = await response.json();
      if (!result.success)
        throw new Error(result.error || 'Erro ao rejeitar sugestão');

      return result;
    } catch (error) {
      errorLog('Erro ao rejeitar sugestão:', error);
      throw error;
    }
  }

  /**
   * Conta sugestões pendentes (para badge de notificação)
   */
  async countPendingSuggestions(): Promise<number> {
    try {
      const result = await this.listSuggestions('pending', 1, 1);
      return result.pagination.total || 0;
    } catch (error) {
      errorLog('Erro ao contar sugestões:', error);
      return 0;
    }
  }
}

export const empreendimentosService = new EmpreendimentosService();

