import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { ApiError } from '@/types';
import { errorLog } from '@/utils/logger';

// Configuração base da API
// No desenvolvimento (via Vite dev server), usa URL relativa para aproveitar o proxy
// Em produção, usa a URL completa da API
const API_BASE_URL = import.meta.env.DEV 
  ? '' // URL relativa - usa proxy do Vite
  : (import.meta.env.VITE_API_URL || 'https://api.quadradois.com.br');

// Criação da instância do axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de respostas
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      const { status, data } = error.response;

      // Tratamento específico por status HTTP
      switch (status) {
        case 401:
          // Token expirado ou inválido
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          break;

        case 403:
          // Acesso negado
          errorLog('Acesso negado:', data);
          break;

        case 404:
          // Recurso não encontrado
          errorLog('Recurso não encontrado:', data);
          break;

        case 422:
          // Erro de validação
          errorLog('Erro de validação:', data);
          break;

        case 500:
        case 502:
        case 503:
          // Erro do servidor
          errorLog('Erro do servidor:', data);
          break;

        default:
          errorLog('Erro desconhecido:', data);
      }

      // Retorna erro padronizado
      const apiError: ApiError = {
        message: (data as any)?.message || 'Erro desconhecido',
        code: (data as any)?.code,
        details: (data as any)?.details,
      };

      return Promise.reject(apiError);
    }

    // Erro de rede
    if (error.request) {
      const networkError: ApiError = {
        message: 'Erro de conexão. Verifique sua internet e tente novamente.',
        code: 'NETWORK_ERROR',
      };
      return Promise.reject(networkError);
    }

    // Erro de configuração
    const configError: ApiError = {
      message: 'Erro de configuração da requisição.',
      code: 'CONFIG_ERROR',
    };
    return Promise.reject(configError);
  }
);

// Funções utilitárias para requisições
export const apiGet = <T>(url: string, params?: any): Promise<T> => {
  return api.get(url, { params }).then(response => response.data);
};

export const apiPost = <T>(url: string, data?: any): Promise<T> => {
  return api.post(url, data).then(response => response.data);
};

export const apiPut = <T>(url: string, data?: any): Promise<T> => {
  return api.put(url, data).then(response => response.data);
};

export const apiPatch = <T>(url: string, data?: any): Promise<T> => {
  return api.patch(url, data).then(response => response.data);
};

export const apiDelete = <T>(url: string, data?: any): Promise<T> => {
  return api.delete(url, { data }).then(response => response.data);
};

// Função para upload de arquivos
export const apiUpload = <T>(
  url: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<T> => {
  const formData = new FormData();
  formData.append('file', file);

  return api
    .post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: progressEvent => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    })
    .then(response => response.data);
};

export default api;
