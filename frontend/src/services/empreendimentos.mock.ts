// Mock temporário para demonstrar o sistema de autocomplete
// Substitui as chamadas da API até o backend estar implementado

import { devLog, errorLog } from '@/utils/logger';
import {
  Empreendimento,
  CreateEmpreendimentoRequest,
} from './empreendimentos.service';

class MockEmpreendimentosService {
  private empreendimentos: Empreendimento[] = [
    {
      id: 1,
      nome: 'Residencial Bela Vista',
      endereco: {
        cep: '01234-567',
        endereco: 'Rua das Flores',
        numero: '123',
        bairro: 'Jardim Primavera',
        cidade: 'São Paulo',
        estado: 'SP',
        pontoReferencia: 'Próximo ao Shopping Center',
      },
      informacoes: {
        andares: 12,
        unidadesPorAndar: 4,
        blocos: 2,
        entregaEm: '2023-12',
        caracteristicas: ['pool', 'gym', 'playground', 'security_24h'],
        caracteristicasPersonalizadas: 'Piscina aquecida, Academia completa',
      },
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      totalImoveis: 15,
    },
    {
      id: 2,
      nome: 'Condomínio Solar do Atlântico',
      endereco: {
        cep: '23456-789',
        endereco: 'Avenida Beira Mar',
        numero: '500',
        bairro: 'Barra da Tijuca',
        cidade: 'Rio de Janeiro',
        estado: 'RJ',
      },
      informacoes: {
        andares: 20,
        unidadesPorAndar: 6,
        blocos: 3,
        caracteristicas: [
          'pool',
          'gym',
          'party_hall',
          'sports_court',
          'security_24h',
          'sauna',
        ],
        caracteristicasPersonalizadas: 'Vista para o mar, Spa completo',
      },
      createdAt: '2024-02-10T14:30:00Z',
      updatedAt: '2024-02-10T14:30:00Z',
      totalImoveis: 28,
    },
    {
      id: 3,
      nome: 'Edifício Green Park',
      endereco: {
        cep: '34567-890',
        endereco: 'Rua dos Eucaliptos',
        numero: '789',
        bairro: 'Vila Madalena',
        cidade: 'São Paulo',
        estado: 'SP',
      },
      informacoes: {
        andares: 8,
        unidadesPorAndar: 2,
        blocos: 1,
        caracteristicas: ['pool', 'gym', 'coworking', 'bike_rack', 'elevator'],
        caracteristicasPersonalizadas: 'Conceito sustentável, Jardim vertical',
      },
      createdAt: '2024-03-05T09:15:00Z',
      updatedAt: '2024-03-05T09:15:00Z',
      totalImoveis: 8,
    },
    {
      id: 4,
      nome: 'Residencial Monte Verde',
      endereco: {
        cep: '45678-901',
        endereco: 'Estrada da Montanha',
        numero: '200',
        bairro: 'Tijuca',
        cidade: 'Rio de Janeiro',
        estado: 'RJ',
      },
      informacoes: {
        andares: 6,
        unidadesPorAndar: 3,
        blocos: 4,
        caracteristicas: [
          'pool',
          'playground',
          'security_24h',
          'gourmet_space',
        ],
        caracteristicasPersonalizadas:
          'Área verde preservada, Trilha ecológica',
      },
      createdAt: '2024-04-12T16:45:00Z',
      updatedAt: '2024-04-12T16:45:00Z',
      totalImoveis: 12,
    },
    {
      id: 5,
      nome: 'Torre Empresarial Sucesso',
      endereco: {
        cep: '56789-012',
        endereco: 'Avenida Faria Lima',
        numero: '1500',
        bairro: 'Itaim Bibi',
        cidade: 'São Paulo',
        estado: 'SP',
      },
      informacoes: {
        andares: 30,
        unidadesPorAndar: 8,
        blocos: 1,
        caracteristicas: ['security_24h', 'coworking', 'elevator'],
        caracteristicasPersonalizadas: 'Lajes corporativas, Heliporto',
      },
      createdAt: '2024-05-20T11:20:00Z',
      updatedAt: '2024-05-20T11:20:00Z',
      totalImoveis: 45,
    },
  ];

  private nextId = 6;

  // Simular delay de rede
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async searchByName(query: string): Promise<Empreendimento[]> {
    await this.delay(300);

    const searchTerm = query.toLowerCase().trim();
    return this.empreendimentos
      .filter(
        emp =>
          emp.nome.toLowerCase().includes(searchTerm) ||
          emp.endereco.bairro.toLowerCase().includes(searchTerm) ||
          emp.endereco.cidade.toLowerCase().includes(searchTerm)
      )
      .slice(0, 10);
  }

  async getById(id: number): Promise<Empreendimento | null> {
    await this.delay(200);

    const empreendimento = this.empreendimentos.find(emp => emp.id === id);
    return empreendimento || null;
  }

  async create(data: CreateEmpreendimentoRequest): Promise<Empreendimento> {
    await this.delay(500);

    const newEmpreendimento: Empreendimento = {
      id: this.nextId++,
      nome: data.nome,
      endereco: { ...data.endereco },
      informacoes: { ...data.informacoes },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalImoveis: 1,
    };

    this.empreendimentos.push(newEmpreendimento);

    // Simular salvamento no localStorage para persistir durante a sessão
    localStorage.setItem(
      'mock_empreendimentos',
      JSON.stringify(this.empreendimentos)
    );

    devLog('📂 Empreendimento criado automaticamente:', newEmpreendimento);

    return newEmpreendimento;
  }

  async update(
    id: number,
    data: Partial<CreateEmpreendimentoRequest>
  ): Promise<Empreendimento> {
    await this.delay(400);

    const index = this.empreendimentos.findIndex(emp => emp.id === id);
    if (index === -1) {
      throw new Error('Empreendimento não encontrado');
    }

    const existing = this.empreendimentos[index];
    const updated: Empreendimento = {
      ...existing,
      nome: data.nome || existing.nome,
      endereco: { ...existing.endereco, ...data.endereco },
      informacoes: { ...existing.informacoes, ...data.informacoes },
      updatedAt: new Date().toISOString(),
    };

    this.empreendimentos[index] = updated;
    localStorage.setItem(
      'mock_empreendimentos',
      JSON.stringify(this.empreendimentos)
    );

    return updated;
  }

  async getMostUsed(limit: number = 10): Promise<Empreendimento[]> {
    await this.delay(250);

    return this.empreendimentos
      .sort((a, b) => b.totalImoveis - a.totalImoveis)
      .slice(0, limit);
  }

  async checkDuplicate(
    nome: string,
    cep: string
  ): Promise<Empreendimento | null> {
    await this.delay(300);

    const existing = this.empreendimentos.find(
      emp =>
        emp.nome.toLowerCase().trim() === nome.toLowerCase().trim() &&
        emp.endereco.cep === cep
    );

    return existing || null;
  }

  // Carregar dados do localStorage se disponível
  constructor() {
    const stored = localStorage.getItem('mock_empreendimentos');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.empreendimentos = parsed;
          this.nextId = Math.max(...parsed.map(emp => emp.id), 0) + 1;
        }
      } catch (error) {
        errorLog('Erro ao carregar dados mockados do localStorage:', error);
      }
    }
  }
}

// Exportar como singleton
export const mockEmpreendimentosService = new MockEmpreendimentosService();
