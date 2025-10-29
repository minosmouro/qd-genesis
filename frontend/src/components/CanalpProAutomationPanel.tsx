import React, { useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import { 
  Settings, 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Play, 
  StopCircle, 
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { authService } from '../services/auth.service';

// Componentes UI reutilizados
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
    default: 'bg-success/10 text-success border-success/20',
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

interface AutomationStatus {
  enabled: boolean;
  expires_at?: string;
  device_id_available: boolean;
  credentials_stored: boolean;
  reason?: string;
}

interface AutomationHistory {
  timestamp: string;
  success: boolean;
  reason: string;
  details?: any;
}

const CanalpProAutomationPanel: React.FC = () => {
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [history, setHistory] = useState<AutomationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Estados do formulário de configuração
  const [setupForm, setSetupForm] = useState({
    email: '',
    password: '',
    ttl_hours: 168, // 7 dias por padrão
    consent: false,
    showPassword: false
  });

  const fetchStatus = async () => {
    try {
      const automationStatus = await authService.getAutomationStatus();
      setStatus(automationStatus);
    } catch (error) {
      console.error('Erro ao buscar status de automação:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const automationHistory = await authService.getAutomationHistory();
      setHistory(automationHistory);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    }
  };

  const setupAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!setupForm.consent) {
      alert('Você deve aceitar os termos para habilitar a automação');
      return;
    }

    setProcessing(true);
    try {
      await authService.setupCanalpProAutomation({
        email: setupForm.email,
        password: setupForm.password,
        ttl_hours: setupForm.ttl_hours,
        consent: setupForm.consent
      });

      // Limpar formulário
      setSetupForm({
        email: '',
        password: '',
        ttl_hours: 168,
        consent: false,
        showPassword: false
      });
      
      setShowSetup(false);
      await fetchStatus();
    } catch (error: any) {
      alert(`Erro ao configurar automação: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setProcessing(false);
    }
  };

  const disableAutomation = async () => {
    if (!confirm('Tem certeza que deseja desabilitar a automação?')) return;

    setProcessing(true);
    try {
      await authService.disableAutomation();
      await fetchStatus();
    } catch (error: any) {
      alert(`Erro ao desabilitar automação: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setProcessing(false);
    }
  };

  const triggerRenewal = async () => {
    setProcessing(true);
    try {
      await authService.triggerImmediateRenewal();
      setTimeout(() => fetchStatus(), 2000); // Aguardar processamento
    } catch (error: any) {
      alert(`Erro ao disparar renovação: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchStatus(), fetchHistory()]).finally(() => {
      setLoading(false);
    });
  }, []);

  const getStatusDisplay = () => {
    if (!status) return null;

    if (status.enabled) {
      return (
        <div className="space-y-3">
          <Badge variant="default">
            <CheckCircle className="w-3 h-3 mr-1" />
            Automação Ativa
          </Badge>
          
          {status.expires_at && (
            <div className="text-sm text-text-secondary">
              <Clock className="w-4 h-4 inline mr-1" />
              Credenciais expiram em: {new Date(status.expires_at).toLocaleString()}
            </div>
          )}
          
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={triggerRenewal}
              disabled={processing}
            >
              <Play className="w-3 h-3 mr-1" />
              Renovar Agora
            </Button>
            
            <Button
              size="sm"
              variant="secondary"
              onClick={disableAutomation}
              disabled={processing}
            >
              <StopCircle className="w-3 h-3 mr-1" />
              Desabilitar
            </Button>
          </div>
        </div>
      );
    } else {
      const reason = status.reason || 'Não configurado';
      return (
        <div className="space-y-3">
          <Badge variant="outline">
            <AlertCircle className="w-3 h-3 mr-1" />
            Automação Inativa
          </Badge>
          
          <div className="text-sm text-text-secondary">
            Motivo: {reason}
          </div>
          
          <Button
            size="sm"
            onClick={() => setShowSetup(true)}
            disabled={processing}
          >
            <Settings className="w-3 h-3 mr-1" />
            Configurar Automação
          </Button>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Shield className="w-5 h-5 mr-2 inline" />
            Automação CanalpPro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Carregando status...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <Shield className="w-5 h-5 mr-2 inline" />
            Automação CanalpPro
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getStatusDisplay()}
          

          {/* Botão para histórico */}
          {history.length > 0 && (
            <div className="mt-4">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? 'Ocultar' : 'Ver'} Histórico ({history.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Configuração */}
      {showSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Configurar Automação CanalpPro</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={setupAutomation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email CanalpPro
                  </label>
                  <input
                    type="email"
                    value={setupForm.email}
                    onChange={(e) => setSetupForm({...setupForm, email: e.target.value})}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Senha CanalpPro
                  </label>
                  <div className="relative">
                    <input
                      type={setupForm.showPassword ? 'text' : 'password'}
                      value={setupForm.password}
                      onChange={(e) => setSetupForm({...setupForm, password: e.target.value})}
                      className="w-full p-2 border border-border rounded focus:ring-2 focus:ring-primary pr-10 bg-surface text-text-primary"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setSetupForm({...setupForm, showPassword: !setupForm.showPassword})}
                      className="absolute right-2 top-2 text-text-secondary hover:text-text-primary"
                    >
                      {setupForm.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Duração (horas)
                  </label>
                  <select
                    value={setupForm.ttl_hours}
                    onChange={(e) => setSetupForm({...setupForm, ttl_hours: parseInt(e.target.value)})}
                    className="w-full p-2 border border-border rounded focus:ring-2 focus:ring-primary bg-surface text-text-primary"
                  >
                    <option value={24}>24 horas (1 dia)</option>
                    <option value={72}>72 horas (3 dias)</option>
                    <option value={168}>168 horas (7 dias)</option>
                    <option value={720}>720 horas (30 dias)</option>
                  </select>
                </div>
                
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={setupForm.consent}
                    onChange={(e) => setSetupForm({...setupForm, consent: e.target.checked})}
                    className="mt-1"
                  />
                  <label htmlFor="consent" className="text-sm text-text-primary">
                    Eu autorizo o armazenamento temporário e criptografado das minhas credenciais 
                    para automação da renovação de tokens.
                  </label>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    type="submit"
                    disabled={processing || !setupForm.consent}
                  >
                    {processing ? (
                      <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Configurando...</>
                    ) : (
                      'Configurar'
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowSetup(false)}
                    disabled={processing}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Histórico */}
      {showHistory && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Renovações Automáticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((entry, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 bg-surface-hover rounded border border-border"
                >
                  <div className="flex items-center">
                    {entry.success ? (
                      <CheckCircle className="w-4 h-4 text-success mr-2" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-danger mr-2" />
                    )}
                    <div>
                      <div className="text-sm text-text-primary">
                        {entry.success ? 'Renovação bem-sucedida' : 'Falha na renovação'}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {entry.reason}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-text-tertiary">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CanalpProAutomationPanel;
