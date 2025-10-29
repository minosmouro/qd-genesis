import { apiPost, apiGet } from './api';
import { AuthResponse, LoginCredentials, RegisterData, User } from '@/types';
import { errorLog } from '@/utils/logger';

export const authService = {
  // Login do usuário
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Removido log de credenciais e da resposta para não vazar informações sensíveis
      const response = await apiPost<AuthResponse>('/auth/login', credentials);

      // Salva token e dados do usuário no localStorage
      if (response.access_token) {
        localStorage.setItem('access_token', response.access_token);
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      }

      return response;
    } catch (error) {
      errorLog('Erro no login:', error);
      throw error;
    }
  },

  // Registro de novo usuário
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiPost<AuthResponse>('/auth/register', data);

    // Salva token e dados do usuário no localStorage
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('user', JSON.stringify(response.user));

    return response;
  },

  // Logout do usuário
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // Verifica se o usuário está autenticado
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    return !!token;
  },

  // Obtém o token atual
  getToken(): string | null {
    return localStorage.getItem('access_token');
  },

  // Obtém headers de autenticação para requisições
  async getAuthHeaders(): Promise<{ [key: string]: string }> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  },

  // Obtém dados do usuário atual
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  // Atualiza dados do usuário no localStorage
  updateCurrentUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Verifica se o token ainda é válido
  async validateToken(): Promise<boolean> {
    try {
      await apiGet<User>('/auth/me');
      return true;
    } catch {
      this.logout();
      return false;
    }
  },

  // Renova o token (se implementado no backend)
  async refreshToken(): Promise<AuthResponse> {
    const response = await apiPost<AuthResponse>('/auth/refresh');

    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('user', JSON.stringify(response.user));

    return response;
  },

  // Vincular conta CanalPro (Gandalf) programaticamente (wrapper de conveniência)
  // body: { email, password, device_id, otp?, session_id? }
  async linkGandalfCredentials(body: {
    email: string;
    password?: string;
    device_id?: string;
    otp?: string;
    session_id?: string;
  }): Promise<any> {
    // Se forneceu otp, precisa também de session_id para validar
    if (body.otp) {
      if (!body.session_id) {
        throw new Error('session_id is required when validating OTP');
      }

      return this.validateGandalfLogin({
        session_id: body.session_id,
        otp: body.otp,
        email: body.email,
        device_id: body.device_id,
      });
    }

    // Caso contrário inicia a sessão (requer password)
    if (!body.password) {
      throw new Error('password is required to start Gandalf login');
    }

    return this.startGandalfLogin({
      email: body.email,
      password: body.password,
      device_id: body.device_id,
    });
  },

  // Salva dados do token Gandalf no localStorage quando a API retornar informações de token/expiry
  saveGandalfTokenInfo(resp: any) {
    try {
      if (!resp) return;

      // tenta obter expires_in em várias formas possíveis
      const expiresIn =
        resp.expires_in ??
        resp.token?.expires_in ??
        resp.expires ??
        resp.expire_seconds;
      if (typeof expiresIn === 'number') {
        const expiryTs = Date.now() + expiresIn * 1000;
        localStorage.setItem('gandalf_token_expiry', String(expiryTs));
      } else if (
        resp.expiry_ts &&
        (typeof resp.expiry_ts === 'number' ||
          typeof resp.expiry_ts === 'string')
      ) {
        const ts = Number(resp.expiry_ts);
        if (!Number.isNaN(ts))
          localStorage.setItem('gandalf_token_expiry', String(ts));
      }

      // salva token se houver (nomes comuns)
      const token =
        resp.access_token ??
        resp.token ??
        resp.gandalf_token ??
        resp.token_string;
      if (token) {
        localStorage.setItem('gandalf_token', String(token));
      }
    } catch (e) {
      // não bloqueia fluxo, apenas loga
      errorLog('saveGandalfTokenInfo failed', e);
    }
  },

  // Inicia o fluxo de login Gandalf: POST /integrations/gandalf/start
  async startGandalfLogin(body: {
    email: string;
    password: string;
    device_id?: string;
  }): Promise<any> {
    // Retorna { needs_otp: true, session_id } ou salva credenciais diretamente (200)
    const resp = await apiPost<any>('/integrations/gandalf/start', body);
    // salva info do token se o backend fornecer
    try {
      this.saveGandalfTokenInfo(resp);
    } catch {
      /* noop */
    }
    return resp;
  },

  // Valida OTP usando session_id: POST /integrations/gandalf/validate
  async validateGandalfLogin(body: {
    session_id: string;
    otp: string;
    email: string;
    device_id?: string;
  }): Promise<any> {
    const resp = await apiPost<any>('/integrations/gandalf/validate', body);
    try {
      this.saveGandalfTokenInfo(resp);
    } catch {
      /* noop */
    }
    return resp;
  },

  // Solicita o envio do código OTP por email: POST /integrations/gandalf/request-otp
  async requestGandalfOtp(body: {
    session_id: string;
    email: string;
    device_id?: string;
  }): Promise<any> {
    const resp = await apiPost<any>('/integrations/gandalf/request-otp', body);
    return resp;
  },

  // Importar listagens do Gandalf (bulk) - POST /integrations/gandalf/import
  // body: { filter?: any } - opcionalmente enviar um filtro (por ex. campos, data, status)
  async importGandalfListings(
    body: { filter?: any; only_active?: boolean } = {}
  ): Promise<any> {
    const resp = await apiPost<any>('/integrations/gandalf/import', body);
    return resp;
  },

  // Importar um imóvel específico por external_id - POST /integrations/gandalf/import_one
  async importGandalfOne(external_id: string): Promise<any> {
    const resp = await apiPost<any>('/integrations/gandalf/import_one', {
      external_id,
    });
    return resp;
  },

  // Valida credenciais Gandalf antes da importação
  async validateGandalfCredentials(): Promise<boolean> {
    try {
      const resp = await apiGet<any>('/admin/integrations/gandalf/validate');
      return resp.validated || false;
    } catch (error) {
      errorLog('Erro ao validar credenciais Gandalf:', error);
      return false;
    }
  },

  // Tenta renovação automática do CanalpPro usando device_id persistente
  async autoRenewCanalpro(): Promise<any> {
    try {
      const resp = await apiPost<any>('/integrations/canalpro/auto-renew');
      return resp;
    } catch (error) {
      errorLog('Erro na renovação automática:', error);
      throw error;
    }
  },

  // Agenda renovação automática baseada no TTL do token
  async scheduleCanalpproRenewal(hoursBeforeExpiry: number = 4): Promise<any> {
    try {
      const resp = await apiPost<any>('/integrations/canalpro/schedule-renewal', {
        hours_before_expiry: hoursBeforeExpiry
      });
      return resp;
    } catch (error) {
      errorLog('Erro ao agendar renovação:', error);
      throw error;
    }
  },

  // Verifica status de automação do CanalpPro
  async getCanalpproAutomationStatus(): Promise<{
    device_id_available: boolean;
    automation_feasible: boolean;
    requires_implementation: string[];
    next_steps: any;
  }> {
    try {
      const resp = await this.autoRenewCanalpro();
      return {
        device_id_available: !!resp.device_id,
        automation_feasible: resp.automation_feasible || false,
        requires_implementation: resp.requires_implementation || [],
        next_steps: resp.next_steps || {}
      };
    } catch (error) {
      return {
        device_id_available: false,
        automation_feasible: false,
        requires_implementation: ['Integration setup required'],
        next_steps: {}
      };
    }
  },

  // ================================
  // NOVA FUNCIONALIDADE: Sistema de Automação CanalpPro
  // ================================
  
  // Configurar automação com credenciais de usuário
  async setupCanalpProAutomation(config: {
    email: string;
    password: string;
    ttl_hours?: number;
    consent: boolean;
    // NOVO: Agendamento manual
    scheduleMode?: 'automatic' | 'manual_once' | 'manual_recurring';
    scheduleHour?: string;
    scheduleMinute?: string;
  }): Promise<any> {
    try {
      const resp = await apiPost<any>('/canalpro/automation/setup', config);
      return resp;
    } catch (error) {
      errorLog('Erro ao configurar automação CanalpPro:', error);
      throw error;
    }
  },

  // Verificar status detalhado da automação
  async getAutomationStatus(): Promise<{
    enabled: boolean;
    expires_at?: string;
    device_id_available: boolean;
    credentials_stored: boolean;
    reason?: string;
  }> {
    try {
      const resp = await apiGet<any>('/canalpro/automation/status');
      return resp;
    } catch (error) {
      errorLog('Erro ao verificar status de automação:', error);
      throw error;
    }
  },

  // Desabilitar automação
  async disableAutomation(): Promise<any> {
    try {
      const resp = await apiPost<any>('/canalpro/automation/disable');
      return resp;
    } catch (error) {
      errorLog('Erro ao desabilitar automação:', error);
      throw error;
    }
  },

  // Trigger renovação automática imediata
  async triggerImmediateRenewal(): Promise<any> {
    try {
      const resp = await apiPost<any>('/canalpro/automation/trigger');
      return resp;
    } catch (error) {
      errorLog('Erro ao disparar renovação imediata:', error);
      throw error;
    }
  },

  // Verificar histórico de renovações automáticas
  async getAutomationHistory(): Promise<Array<{
    timestamp: string;
    success: boolean;
    reason: string;
    details?: any;
  }>> {
    try {
      const resp = await apiGet<any>('/canalpro/automation/history');
      return resp.history || [];
    } catch (error) {
      errorLog('Erro ao buscar histórico de automação:', error);
      return [];
    }
  },
};
