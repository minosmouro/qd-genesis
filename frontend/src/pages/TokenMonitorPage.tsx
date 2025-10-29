import React, { useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import CanalpProAutomationPanel from '../components/CanalpProAutomationPanel';
import { AlertCircle, Clock, CheckCircle, RefreshCw, Shield, Activity, X, AlertTriangle } from 'lucide-react';
import { authService } from '../services/auth.service';
import { devLog } from '../utils/logger';

// Configuração base da API - usa proxy local em desenvolvimento
const API_BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_URL || 'https://api.quadradois.com.br');

// Componentes UI simples para usar nesta página
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-surface rounded-lg shadow-soft border border-border ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-6 py-4 border-b border-border">
    {children}
  </div>
);

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-text-primary ${className}`}>
    {children}
  </h3>
);

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
);

const Badge: React.FC<{ 
  children: React.ReactNode; 
  variant?: 'default' | 'destructive' | 'secondary' | 'outline' 
}> = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-primary/10 text-primary border-primary/20',
    destructive: 'bg-danger/10 text-danger border-danger/20',
    secondary: 'bg-warning/10 text-warning border-warning/20',
    outline: 'bg-surface border-border text-text-secondary'
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${variants[variant]}`}>
      {children}
    </span>
  );
};

interface TokenStatus {
  tenant_id: number;
  provider: string;
  expires_at: string | null;
  time_to_expiry_seconds: number | null;
  expires_soon: boolean;
  is_expired: boolean;
  has_refresh_token: boolean;
  token_valid: boolean;
  last_validated_at: string | null;
  last_validated_ok: boolean;
  metadata_keys: string[];
}

interface TokensSummary {
  total_tokens: number;
  expiring_soon: number;
  expired: number;
  with_refresh_token: number;
  last_check: string;
}

interface HealthMetrics {
  status: 'healthy' | 'warning' | 'critical' | 'error';
  timestamp: string;
  metrics: {
    expiring_soon: number;
    expired: number;
    no_refresh_token: number;
    validation_failed: number;
  };
  issues: string[];
}

interface ErrorLog {
  id: string;
  timestamp: string;
  operation: string;
  error: string;
  details?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const TokenMonitorPage: React.FC = () => {
  const [tokens, setTokens] = useState<TokenStatus[]>([]);
  const [summary, setSummary] = useState<TokensSummary | null>(null);
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [showErrorPanel, setShowErrorPanel] = useState(false);
  const [lastSuccessfulLoad, setLastSuccessfulLoad] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'loading'>('loading');

  // Função centralizada para logging de erros
  const logError = (operation: string, error: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
    const errorLog: ErrorLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      operation,
      error: error?.message || error?.toString() || 'Erro desconhecido',
      details: error,
      severity
    };

    setErrorLogs(prev => [errorLog, ...prev].slice(0, 50)); // Manter apenas os últimos 50 erros
    
    // Log detalhado no console
    devLog(`🚨 ERRO ${severity.toUpperCase()}: ${operation}`);
    devLog('Mensagem:', errorLog.error);
    devLog('Timestamp:', errorLog.timestamp);
    if (error?.response) {
      devLog('Response status:', error.response.status);
      devLog('Response data:', error.response.data);
    }
    if (error?.stack) {
      devLog('Stack trace:', error.stack);
    }
    devLog('Detalhes completos:', error);
    ;

    // Auto-mostrar painel de erros para erros críticos
    if (severity === 'critical' || severity === 'high') {
      setShowErrorPanel(true);
    }
  };

  // Função para limpar logs de erro
  const clearErrorLogs = () => {
    setErrorLogs([]);
    setShowErrorPanel(false);
  };

  // Função para exportar logs
  const exportErrorLogs = () => {
    const dataStr = JSON.stringify({
      exportDate: new Date().toISOString(),
      totalErrors: errorLogs.length,
      errors: errorLogs
    }, null, 2);
    
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `error-logs-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    devLog('📥 Logs de erro exportados:', exportFileDefaultName);
  };

  const fetchTokensStatus = async () => {
    try {
      const headers = await authService.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/tokens/status`, { headers });
      
      devLog('🔍 Response status:', response.status);
      devLog('🔍 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        devLog('❌ Error response text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const responseText = await response.text();
      devLog('📄 Response body (first 500 chars):', responseText.substring(0, 500));
      
      const data = JSON.parse(responseText);
      setTokens(data.tokens);
      setSummary(data.summary);
      setConnectionStatus('connected');
      setLastSuccessfulLoad(new Date().toISOString());
      
      // Log de sucesso
      devLog('✅ Status dos tokens carregado com sucesso:', {
        totalTokens: data.tokens?.length || 0,
        summary: data.summary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setConnectionStatus('error');
      logError('Buscar Status dos Tokens', error, 'high');
    }
  };

  const fetchHealth = async () => {
    try {
      const headers = await authService.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/tokens/health`, { headers });
      
      devLog('🔍 Health Response status:', response.status);
      devLog('🔍 Health Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        devLog('❌ Health Error response text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const responseText = await response.text();
      devLog('📄 Health Response body (first 500 chars):', responseText.substring(0, 500));
      
      const data = JSON.parse(responseText);
      setHealth(data);
      
      // Log de sucesso
      devLog('✅ Health dos tokens carregado com sucesso:', data);
    } catch (error) {
      logError('Buscar Health dos Tokens', error, 'medium');
    }
  };

  const forceRenewal = async (tenantId: number, provider: string) => {
    try {
      setRefreshing(true);
      const headers = await authService.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/tokens/force-renewal/${tenantId}/${provider}`, {
        method: 'POST',
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`✅ Renovação forçada iniciada para ${provider}:`, result);
      
      // Aguardar um pouco e recarregar os dados
      setTimeout(() => {
        fetchTokensStatus();
        fetchHealth();
      }, 2000);
      
    } catch (error) {
      logError(`Forçar Renovação (${provider})`, error, 'high');
    } finally {
      setRefreshing(false);
    }
  };

  const forceCheck = async () => {
    try {
      setRefreshing(true);
      const headers = await authService.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/tokens/force-check`, {
        method: 'POST',
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      devLog('✅ Verificação forçada iniciada:', result);
      
      setTimeout(() => {
        fetchTokensStatus();
        fetchHealth();
      }, 1000);
      
    } catch (error) {
      logError('Forçar Verificação', error, 'medium');
    } finally {
      setRefreshing(false);
    }
  };

  const formatTimeToExpiry = (seconds: number | null): string => {
    if (seconds === null) return 'N/A';
    
    if (seconds <= 0) return 'Expirado';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  const getStatusBadge = (token: TokenStatus) => {
    if (token.is_expired) {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Expirado</Badge>;
    }
    
    if (token.expires_soon) {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Expirando</Badge>;
    }
    
    if (!token.token_valid) {
      return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Inválido</Badge>;
    }
    
    return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Válido</Badge>;
  };

  const getHealthBadge = (status: string) => {
    const badges = {
      healthy: <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Saudável</Badge>,
      warning: <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Atenção</Badge>,
      critical: <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Crítico</Badge>,
      error: <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Erro</Badge>
    };
    
    return badges[status as keyof typeof badges] || badges.error;
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-blue-50 border-blue-200 text-blue-800',
      medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      high: 'bg-orange-50 border-orange-200 text-orange-800',
      critical: 'bg-red-50 border-red-200 text-red-800'
    };
    return colors[severity as keyof typeof colors] || colors.medium;
  };

  const getSeverityIcon = (severity: string) => {
    const icons = {
      low: <AlertCircle className="w-4 h-4" />,
      medium: <AlertTriangle className="w-4 h-4" />,
      high: <AlertTriangle className="w-4 h-4" />,
      critical: <AlertCircle className="w-4 h-4" />
    };
    return icons[severity as keyof typeof icons] || icons.medium;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        devLog('🔄 Iniciando carregamento dos dados de token...');
        await Promise.all([fetchTokensStatus(), fetchHealth()]);
        devLog('✅ Carregamento inicial completo');
      } catch (error) {
        logError('Carregamento Inicial', error, 'critical');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(() => {
      devLog('🔄 Atualizando dados automaticamente...');
      loadData();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mb-4"></div>
        <div className="text-center">
          <p className="text-lg font-medium text-text-primary mb-2">Carregando Monitor de Tokens...</p>
          {errorLogs.length > 0 && (
            <div className="mt-4 p-4 bg-danger/10 border border-danger/20 rounded-lg max-w-md">
              <p className="text-danger font-medium flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {errorLogs.length} erro(s) detectado(s)
              </p>
              <p className="text-danger text-sm mt-1">
                Último erro: {errorLogs[0]?.operation}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header fixo */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-text-primary">Monitor de Tokens de Integração</h1>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-success' :
                connectionStatus === 'error' ? 'bg-danger' : 'bg-warning'
              }`}></div>
              <span className="text-sm text-text-secondary">
                {connectionStatus === 'connected' ? 'Conectado' :
                 connectionStatus === 'error' ? 'Erro de Conexão' : 'Carregando...'}
              </span>
              {lastSuccessfulLoad && connectionStatus === 'connected' && (
                <span className="text-xs text-text-tertiary">
                  Última atualização: {new Date(lastSuccessfulLoad).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={forceCheck} disabled={refreshing} variant="secondary" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Verificar Agora
            </Button>
            <Button onClick={() => { fetchTokensStatus(); fetchHealth(); }} variant="secondary" size="sm">
              <Activity className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button 
              onClick={() => setShowErrorPanel(!showErrorPanel)} 
              variant={errorLogs.length > 0 ? "danger" : "secondary"}
              size="sm"
              className="relative"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Logs de Erro
              {errorLogs.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-danger text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {errorLogs.length > 9 ? '9+' : errorLogs.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo scrollável */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Error Logs Panel */}
      {showErrorPanel && (
        <Card className="mb-6 border-danger/20">
          <CardHeader>
            <div className="bg-danger/10 -mx-6 -my-4 px-6 py-4">
              <CardTitle className="flex items-center justify-between text-danger">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Logs de Erro ({errorLogs.length})
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="secondary" onClick={exportErrorLogs}>
                    Exportar
                  </Button>
                  <Button size="sm" variant="secondary" onClick={clearErrorLogs}>
                    Limpar Logs
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setShowErrorPanel(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {errorLogs.length === 0 ? (
              <div className="text-center py-4 text-text-secondary">
                Nenhum erro registrado
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {errorLogs.map((errorLog) => (
                  <div 
                    key={errorLog.id} 
                    className={`p-4 rounded-lg border ${getSeverityColor(errorLog.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {getSeverityIcon(errorLog.severity)}
                        <span className="font-semibold">{errorLog.operation}</span>
                        <Badge variant="outline">
                          <span className="uppercase text-xs">{errorLog.severity}</span>
                        </Badge>
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {new Date(errorLog.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-2 text-sm">
                      <strong>Erro:</strong> {errorLog.error}
                    </div>
                    {errorLog.details && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer hover:text-gray-700">
                          Ver detalhes técnicos
                        </summary>
                        <pre className="mt-2 p-2 bg-surface text-xs rounded overflow-x-auto text-text-primary">
                          {JSON.stringify(errorLog.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

        {/* Health Overview */}
        {health && (
          <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Status Geral do Sistema
              {getHealthBadge(health.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="text-2xl font-bold text-primary">{health.metrics.expiring_soon}</div>
                <div className="text-sm text-text-secondary">Expirando em breve</div>
              </div>
              <div className="text-center p-3 bg-danger/10 rounded-lg border border-danger/20">
                <div className="text-2xl font-bold text-danger">{health.metrics.expired}</div>
                <div className="text-sm text-text-secondary">Expirados</div>
              </div>
              <div className="text-center p-3 bg-warning/10 rounded-lg border border-warning/20">
                <div className="text-2xl font-bold text-warning">{health.metrics.no_refresh_token}</div>
                <div className="text-sm text-text-secondary">Sem refresh token</div>
              </div>
              <div className="text-center p-3 bg-warning/10 rounded-lg border border-warning/20">
                <div className="text-2xl font-bold text-warning">{health.metrics.validation_failed}</div>
                <div className="text-sm text-text-secondary">Validação falhando</div>
              </div>
            </div>
            
            {health.issues.length > 0 && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <h4 className="font-semibold text-warning mb-2">Problemas Identificados:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {health.issues.map((issue, index) => (
                    <li key={index} className="text-warning">{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
          </Card>
        )}

        {/* CanalpPro Automation Panel */}
        <div className="mb-4">
          <CanalpProAutomationPanel />
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{summary.total_tokens}</div>
              <div className="text-sm text-text-secondary">Total de Tokens</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-warning">{summary.expiring_soon}</div>
              <div className="text-sm text-text-secondary">Expirando em Breve</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-danger">{summary.expired}</div>
              <div className="text-sm text-text-secondary">Expirados</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{summary.with_refresh_token}</div>
              <div className="text-sm text-text-secondary">Com Refresh Token</div>
            </CardContent>
          </Card>
          </div>
        )}

        {/* Tokens Table */}
        <Card className="mb-4">
        <CardHeader>
          <CardTitle>Tokens de Integração</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-text-primary">Tenant</th>
                  <th className="text-left p-3 text-text-primary">Provider</th>
                  <th className="text-left p-3 text-text-primary">Status</th>
                  <th className="text-left p-3 text-text-primary">Expira em</th>
                  <th className="text-left p-3 text-text-primary">Refresh Token</th>
                  <th className="text-left p-3 text-text-primary">Última Validação</th>
                  <th className="text-left p-3 text-text-primary">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={`${token.tenant_id}-${token.provider}`} className="border-b border-border hover:bg-surface-hover">
                    <td className="p-3 font-medium text-text-primary">{token.tenant_id}</td>
                    <td className="p-3 text-text-primary">{token.provider}</td>
                    <td className="p-3">{getStatusBadge(token)}</td>
                    <td className="p-3">
                      <div className="text-sm text-text-primary">
                        {token.expires_at ? (
                          <>
                            <div>{formatTimeToExpiry(token.time_to_expiry_seconds)}</div>
                            <div className="text-text-tertiary">{new Date(token.expires_at).toLocaleString()}</div>
                          </>
                        ) : (
                          'Sem expiração'
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {token.has_refresh_token ? (
                        <Badge variant="default">Disponível</Badge>
                      ) : (
                        <Badge variant="outline">Não disponível</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        {token.last_validated_at ? (
                          <>
                            <div className={token.last_validated_ok ? 'text-success' : 'text-danger'}>
                              {token.last_validated_ok ? 'Sucesso' : 'Falha'}
                            </div>
                            <div className="text-text-tertiary">
                              {new Date(token.last_validated_at).toLocaleString()}
                            </div>
                          </>
                        ) : (
                          <span className="text-text-secondary">Nunca validado</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {token.has_refresh_token && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => forceRenewal(token.tenant_id, token.provider)}
                          disabled={refreshing}
                        >
                          <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                          Renovar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {tokens.length === 0 && (
            <div className="text-center py-8 text-text-secondary">
              Nenhum token de integração encontrado
            </div>
          )}
        </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TokenMonitorPage;
