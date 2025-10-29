// Utilitários para busca de endereço por CEP
import { errorLog } from './logger';

export interface AddressData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

export interface FormattedAddress {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
}

/**
 * Busca endereço por CEP usando a API ViaCEP
 * @param cep CEP no formato 12345678 ou 12345-678
 * @returns Promise com os dados do endereço ou null se não encontrado
 */
export async function fetchAddressByCep(cep: string): Promise<FormattedAddress | null> {
  try {
    // Remover formatação do CEP
    const cleanCep = cep.replace(/\D/g, '');
    
    // Validar CEP (deve ter 8 dígitos)
    if (cleanCep.length !== 8) {
      throw new Error('CEP deve ter 8 dígitos');
    }
    
    // Fazer requisição para ViaCEP
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    
    if (!response.ok) {
      throw new Error('Erro na consulta do CEP');
    }
    
    const data: AddressData = await response.json();
    
    // Verificar se CEP foi encontrado
    if (data.erro) {
      return null;
    }
    
    // Formatar resposta
    return {
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
      country: 'Brasil'
    };
    
  } catch (error) {
    errorLog('Erro ao buscar CEP:', error);
    return null;
  }
}

/**
 * Formata CEP para exibição
 * @param cep CEP sem formatação
 * @returns CEP formatado (12345-678)
 */
export function formatCep(cep: string): string {
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }
  return cleaned;
}

/**
 * Valida se CEP está no formato correto
 * @param cep CEP para validar
 * @returns true se válido
 */
export function isValidCep(cep: string): boolean {
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.length === 8;
}

/**
 * Estados brasileiros para select
 */
export const BRAZILIAN_STATES = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' }
];