import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import KPICard from '@/components/ui/KPICard';
import ProgressBar from '@/components/ui/ProgressBar';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import StepIndicator from '@/components/ui/StepIndicator';
import OTPInput from '@/components/ui/OTPInput';
import { BulkHighlightManager } from '@/components/BulkHighlightManager';
import { useConfirm } from '@/hooks/useConfirm';
import { authService } from '@/services/auth.service';
import { canalproService } from '@/services/canalpro.service';
import type { CanalProContract, PublicationType } from '@/types/canalpro';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileBarChart,
  FileX,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Save,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react';

const friendlyIntegrationCredsMessage =
  'Credenciais CanalPro inválidas ou expiradas. Refaça a vinculação com email e senha válidos.';

const sectionLabels: Record<CanalProSection, { title: string; description: string; icon: React.ReactNode }> = {
  plan: {
    title: 'Plano & Destaques',
    description: 'Configure limites contratuais, acompanhe KPIs e gerencie destaques premium.',
    icon: <FileBarChart className="h-5 w-5" />, 
  },
  import: {
    title: 'Importar Imóveis',
    description: 'Traga os imóveis do CanalPro para a sua base com opções avançadas.',
    icon: <Download className="h-5 w-5" />, 
  },
  integration: {
    title: 'Configurações',
    description: 'Vincule conta CanalPro e gerencie credenciais de integração.',
    icon: <Settings className="h-5 w-5" />, 
  },
};

type CanalProSection = 'plan' | 'import' | 'integration';

interface CanalProManagementPageProps {
  initialSection?: CanalProSection;
}

const CanalProManagementPage: React.FC<CanalProManagementPageProps> = ({ initialSection: propInitialSection }) => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSection = useMemo<CanalProSection>(() => {
    // Prioridade: prop > searchParams > default
    if (propInitialSection) return propInitialSection;
    const section = searchParams.get('section');
    if (section === 'import' || section === 'integration') return section;
    return 'plan'; // Abre direto em Plano & Destaques (uso diário)
  }, [propInitialSection, searchParams]);
  const [activeSection, setActiveSection] = useState<CanalProSection>(initialSection);

  // Vinculação CanalPro (Gandalf)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vinculacaoStep, setVinculacaoStep] = useState<1 | 2 | 3>(1);
  const [otpError, setOtpError] = useState(false);

  // Importação
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importOnlyActive, setImportOnlyActive] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('importOnlyActive');
      return v === null ? true : v === 'true';
    } catch {
      return true;
    }
  });
  const [importResult, setImportResult] = useState<any>(null);
  const [importRawError, setImportRawError] = useState<any>(null);
  const [showImportErrorDetails, setShowImportErrorDetails] = useState(false);

  // Plano CanalPro
  const [contractLoading, setContractLoading] = useState(false);
  const [contractMessage, setContractMessage] = useState<string | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [kpisLoading, setKpisLoading] = useState(false);
  const [contractKPIs, setContractKPIs] = useState<any>(null);
  const [contractNumber, setContractNumber] = useState('');
  const [maxListings, setMaxListings] = useState('');
  const [highlightLimits, setHighlightLimits] = useState<Record<PublicationType, number>>({
    STANDARD: 0,
    PREMIUM: 0,
    SUPER_PREMIUM: 0,
    PREMIERE_1: 0,
    PREMIERE_2: 0,
    TRIPLE: 0,
  });
  const [contractTab, setContractTab] = useState<'config' | 'highlights'>('config');
  const [isEditingConfig, setIsEditingConfig] = useState(false);

  const validTypes: PublicationType[] = ['STANDARD', 'PREMIUM', 'SUPER_PREMIUM', 'PREMIERE_1', 'PREMIERE_2', 'TRIPLE'];
  const typeLabels: Record<PublicationType, string> = {
    STANDARD: 'Padrão',
    PREMIUM: 'Destaque',
    SUPER_PREMIUM: 'Super destaque',
    PREMIERE_1: 'Destaque Exclusivo*',
    PREMIERE_2: 'Destaque Superior*',
    TRIPLE: 'Destaque Triplo*',
  };

  // --- Effects ----------------------------------------------------------------
  useEffect(() => {
    void loadContractConfig();
  }, []);

  useEffect(() => {
    if (activeSection === 'plan' && contractTab === 'config') {
      void loadContractKPIs();
    }
  }, [activeSection, contractTab]);

  useEffect(() => {
    // sincroniza querystring com aba ativa
    setSearchParams(params => {
      const next = new URLSearchParams(params);
      next.set('section', activeSection);
      return next;
    }, { replace: true });
  }, [activeSection, setSearchParams]);

  useEffect(() => {
    try {
      localStorage.setItem('importOnlyActive', String(importOnlyActive));
    } catch {
      /* noop */
    }
  }, [importOnlyActive]);

  // --- Helpers -----------------------------------------------------------------
  const resetIntegrationFlow = () => {
    setVinculacaoStep(1);
    setEmail('');
    setPassword('');
    setOtp('');
    setSessionId(null);
    setMessage(null);
    setError(null);
  };

  const animateProgressWhilePending = () => {
    let progress = 0;
    setImportProgress(0);
    const iv = setInterval(() => {
      progress = Math.min(95, progress + Math.floor(Math.random() * 7) + 3);
      setImportProgress(progress);
    }, 350);
    return iv;
  };

  const loadContractConfig = async () => {
    setContractLoading(true);
    setContractMessage(null);
    setContractError(null);
    try {
      const resp = await canalproService.getContractConfig();
      const cfg = resp?.config as CanalProContract | null;
      if (cfg) {
        setContractNumber(cfg.contract_number || '');
        setMaxListings(cfg.max_listings != null ? String(cfg.max_listings) : '');
        const limits = cfg.highlight_limits || {};
        const mapped: Record<PublicationType, number> = {
          STANDARD: Number(limits.STANDARD || 0),
          PREMIUM: Number(limits.PREMIUM || 0),
          SUPER_PREMIUM: Number(limits.SUPER_PREMIUM || 0),
          PREMIERE_1: Number(limits.PREMIERE_1 || 0),
          PREMIERE_2: Number(limits.PREMIERE_2 || 0),
          TRIPLE: Number(limits.TRIPLE || 0),
        };
        setHighlightLimits(mapped);
        setContractMessage('Configuração carregada.');
      } else {
        setContractNumber('');
        setMaxListings('');
        setHighlightLimits({
          STANDARD: 0,
          PREMIUM: 0,
          SUPER_PREMIUM: 0,
          PREMIERE_1: 0,
          PREMIERE_2: 0,
          TRIPLE: 0,
        });
        setContractMessage('Nenhuma configuração encontrada.');
      }
    } catch (err: any) {
      setContractError(err?.message || 'Erro ao carregar configuração do contrato');
    } finally {
      setContractLoading(false);
    }
  };

  const loadContractKPIs = async () => {
    setKpisLoading(true);
    try {
      const resp = await canalproService.getContractKPIs();
      setContractKPIs(resp);
    } catch (e) {
      setContractKPIs(null);
    } finally {
      setKpisLoading(false);
    }
  };

  const saveContractConfig = async () => {
    const toastId = toast.loading('Salvando configuração...');
    setContractLoading(true);
    setContractMessage(null);
    setContractError(null);
    try {
      const payload: Partial<CanalProContract> = {
        contract_number: contractNumber || null,
        max_listings: maxListings ? Number(maxListings) : null,
        highlight_limits: Object.fromEntries(
          validTypes.map(t => [t, Number(highlightLimits[t] || 0)])
        ),
      };
      const resp = await canalproService.saveContractConfig(payload);
      toast.success('Configuração salva com sucesso! 🎉', {
        id: toastId,
        description: 'Seus limites foram atualizados.',
        duration: 4000,
      });
      setContractMessage(resp?.message || 'Configuração salva com sucesso.');
      void loadContractKPIs();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Erro ao salvar configuração';
      toast.error('Erro ao salvar configuração', {
        id: toastId,
        description: msg,
        duration: 6000,
      });
      setContractError(msg);
    } finally {
      setContractLoading(false);
    }
  };

  const deleteContractConfig = async () => {
    setContractLoading(true);
    setContractMessage(null);
    setContractError(null);
    try {
      const resp = await canalproService.deleteContractConfig();
      toast.success('Configuração removida com sucesso!', {
        description: 'Os limites foram resetados.',
        duration: 4000,
      });
      setContractMessage(resp?.message || 'Configuração removida.');
      setContractNumber('');
      setMaxListings('');
      setHighlightLimits({
        STANDARD: 0,
        PREMIUM: 0,
        SUPER_PREMIUM: 0,
        PREMIERE_1: 0,
        PREMIERE_2: 0,
        TRIPLE: 0,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Erro ao remover configuração';
      toast.error('Erro ao remover configuração', {
        description: msg,
        duration: 6000,
      });
      setContractError(msg);
    } finally {
      setContractLoading(false);
    }
  };

  const startLink = async (): Promise<boolean> => {
    setLoading(true);
    setMessage(null);
    setError(null);
    setSessionId(null);
    try {
      const resp = await authService.startGandalfLogin({
        email,
        password,
      });
      if (resp?.needs_otp) {
        setSessionId(resp.session_id || null);
        if (resp.otp_sent) {
          toast.success('Código enviado!', {
            description: 'Verifique seu email e digite o código de 6 dígitos.',
          });
          return true;
        }
        toast.warning('Erro ao enviar código', {
          description: 'Use o botão "Enviar novamente" se necessário.',
        });
        return true;
      }
      toast.success('Vinculação concluída!');
      return true;
    } catch (err: any) {
      toast.error('Erro na vinculação', {
        description: err?.message || String(err),
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const validateOtp = async (): Promise<boolean> => {
    if (!sessionId) {
      toast.error('Sessão inválida', {
        description: 'Inicie o fluxo novamente.',
      });
      return false;
    }
    setLoading(true);
    try {
      await authService.validateGandalfLogin({
        session_id: sessionId,
        otp,
        email,
      });
      setSessionId(null);
      setOtp('');
      setPassword('');
      return true;
    } catch (err: any) {
      toast.error('Código inválido', {
        description: err?.message || 'Verifique o código e tente novamente.',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getFriendlyErrorMessage = (err: any): string => {
    const serverMsg = extractServerMessage(err);
    if (serverMsg) {
      if (
        serverMsg.includes('Failed to fetch listings') ||
        serverMsg.includes('Failed to fetch') ||
        serverMsg.includes('NoneType')
      ) {
        return `Erro ao buscar imóveis no Gandalf. ${serverMsg}. Verifique credenciais e configuração da integração.`;
      }
      if (isIntegrationCredsError(serverMsg)) {
        return friendlyIntegrationCredsMessage;
      }
    }
    if (isGandalf502Error(err)) {
      return 'Erro de conexão com Gandalf (502). Verifique suas credenciais e tente novamente.';
    }
    return serverMsg || (err && err.message) || String(err);
  };

  const extractServerMessage = (err: any): string | null => {
    if (!err) return null;
    if (!err.response && typeof err.message === 'string') {
      let msg = err.message || null;
      if (err.details) {
        try {
          const details =
            typeof err.details === 'string'
              ? err.details
              : JSON.stringify(err.details);
          msg = msg ? `${msg} — ${details}` : details;
        } catch {
          msg = msg || null;
        }
      }
      if (err.error) {
        try {
          const extra =
            typeof err.error === 'string'
              ? err.error
              : JSON.stringify(err.error);
          msg = msg ? `${msg} — ${extra}` : extra;
        } catch {
          /* noop */
        }
      }
      return msg;
    }
    if (err.response && err.response.data) {
      const data = err.response.data;
      if (typeof data === 'string') return data;
      if (data.message) {
        let composed = data.message;
        const extra = data.error || data.details || data.errors;
        if (extra) {
          try {
            const extraStr =
              typeof extra === 'string' ? extra : JSON.stringify(extra);
            composed = `${composed} — ${extraStr}`;
          } catch {
            /* noop */
          }
        }
        return composed;
      }
    }
    if (err.message) return err.message;
    try {
      return String(err);
    } catch {
      return null;
    }
  };

  const isIntegrationCredsError = (msg: string | null) => {
    return (
      msg === 'No valid integration credentials found or failed to refresh' ||
      (msg || '').includes('No valid integration credentials')
    );
  };

  const isGandalf502Error = (err: any): boolean => {
    try {
      if (err?.response?.status === 502) return true;
      const m = (err?.message || err) as string;
      if (typeof m === 'string' && m.includes('502')) return true;
    } catch {
      /* noop */
    }
    return false;
  };

  const startImportAll = async (onlyActive: boolean) => {
    const confirmed = await confirm.showConfirm({
      title: 'Iniciar Importação?',
      message:
        'Deseja realmente iniciar a importação agora? Isso pode demorar e atualizar imóveis existentes.',
      confirmText: 'Sim, importar',
      cancelText: 'Cancelar',
      variant: 'warning',
    });
    if (!confirmed) return;

    setIsImporting(true);
    setImportMessage(null);
    setImportError(null);
    setImportRawError(null);
    setShowImportErrorDetails(false);
    const iv = animateProgressWhilePending();

    try {
      const isValid = await authService.validateGandalfCredentials();
      if (!isValid) {
        clearInterval(iv);
        setImportError(friendlyIntegrationCredsMessage);
        setImportProgress(100);
        setIsImporting(false);
        return;
      }
      const resp = await authService.importGandalfListings({
        only_active: onlyActive,
      });
      setImportResult(resp || null);
      clearInterval(iv);
      setImportProgress(100);
      setImportMessage(resp?.message || 'Importação finalizada com sucesso.');
      setTimeout(() => {
        navigate('/properties');
      }, 2000);
    } catch (err: any) {
      clearInterval(iv);
      setImportRawError(err);
      setImportError(getFriendlyErrorMessage(err));
      setImportProgress(100);
    } finally {
      setIsImporting(false);
    }
  };

  // --- Rendering helpers ------------------------------------------------------
  const renderIntegration = () => {
    const emailInputId = 'canalpro-email';
    const passwordInputId = 'canalpro-password';

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              Configurações da Integração
            </h2>
            <p className="text-sm text-text-secondary">
              Vincule ou atualize as credenciais de acesso ao CanalPro do cliente.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetIntegrationFlow}
              disabled={loading}
            >
              Reiniciar
            </Button>
          </div>
        </div>      <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <StepIndicator
            active={vinculacaoStep === 1}
            completed={vinculacaoStep > 1}
            number={1}
            label="Credenciais"
          />
          <div className="flex-1 h-0.5 bg-border mx-4" />
          <StepIndicator
            active={vinculacaoStep === 2}
            completed={vinculacaoStep > 2}
            number={2}
            label="Verificação"
          />
          <div className="flex-1 h-0.5 bg-border mx-4" />
          <StepIndicator
            active={vinculacaoStep === 3}
            completed={vinculacaoStep > 3}
            number={3}
            label="Concluído"
          />
        </div>

        {vinculacaoStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="max-w-xl space-y-4">
              <p className="text-sm text-text-secondary">
                Use as credenciais do CanalPro do cliente para conectar o sistema. Após concluir a vinculação você poderá importar imóveis e gerir o plano.
              </p>
              <div>
                <label className="text-sm font-medium mb-2 block" htmlFor={emailInputId}>
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <input
                    id={emailInputId}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    type="email"
                    disabled={loading}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" htmlFor={passwordInputId}>
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <input
                    id={passwordInputId}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    type="password"
                    disabled={loading}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && email && password) {
                        void startLink().then(success => {
                          if (success) setVinculacaoStep(2);
                        });
                      }
                    }}
                  />
                </div>
              </div>
              <Button
                onClick={async () => {
                  const success = await startLink();
                  if (success) {
                    setVinculacaoStep(2);
                  }
                }}
                disabled={loading || !email || !password}
                className="w-full max-w-xs"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  'Continuar'
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {vinculacaoStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-lg font-semibold">Verifique seu email</h4>
              <p className="text-sm text-text-secondary">
                Enviamos um código de 6 dígitos para <strong>{email}</strong>
              </p>
            </div>
            <div className="max-w-sm mx-auto space-y-4">
              <OTPInput
                length={6}
                value={otp}
                onChange={value => {
                  setOtp(value);
                  setOtpError(false);
                }}
                onComplete={async value => {
                  setOtp(value);
                  const success = await validateOtp();
                  if (success) {
                    setVinculacaoStep(3);
                  } else {
                    setOtpError(true);
                  }
                }}
                error={otpError}
                disabled={loading}
              />
              {otpError && (
                <p className="text-sm text-danger text-center">
                  Código inválido. Tente novamente.
                </p>
              )}
              <div className="flex justify-between text-sm">
                <button
                  className="text-text-secondary hover:text-text-primary"
                  onClick={() => {
                    setVinculacaoStep(1);
                    setOtp('');
                    setOtpError(false);
                    setSessionId(null);
                  }}
                >
                  Voltar
                </button>
                <button
                  className="text-text-secondary hover:text-text-primary"
                  onClick={() => void startLink()}
                  disabled={loading}
                >
                  Enviar novamente
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {vinculacaoStep === 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-bold text-success">Vinculação concluída!</h4>
              <p className="text-text-secondary">
                Agora você pode importar imóveis e gerenciar o plano CanalPro deste cliente.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={resetIntegrationFlow}
                size="lg"
                className="min-w-[200px]"
              >
                Reiniciar fluxo
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="min-w-[200px]"
                onClick={() => {
                  resetIntegrationFlow();
                  setActiveSection('import');
                }}
              >
                Importar imóveis agora
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {(message || error) && (
        <div className="space-y-2">
          {message && (
            <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
  };

  const renderImport = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Importar Imóveis</h2>
        <p className="text-sm text-text-secondary">
          Execute a importação em massa ou acompanhe o resultado das últimas execuções.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background p-6 shadow-sm space-y-4">
        <div className="p-3 border rounded bg-surface text-sm">
          <span className="font-semibold text-blue-600">Importante:</span>
          <span className="ml-2 text-blue-700">
            Certifique-se de que a vinculação CanalPro esteja ativa antes de importar.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={importOnlyActive}
              onChange={e => setImportOnlyActive(e.target.checked)}
              disabled={isImporting}
            />
            Importar apenas imóveis ativos
          </label>
          <span className="text-xs text-text-tertiary">
            Preferência salva automaticamente neste navegador.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => startImportAll(importOnlyActive)} disabled={isImporting}>
            Importar agora
          </Button>
          <Button
            variant="ghost"
            disabled={isImporting}
            onClick={() => {
              setImportResult(null);
              setImportMessage(null);
              setImportError(null);
              setImportProgress(0);
            }}
          >
            Limpar resultado
          </Button>
        </div>

        <div className="space-y-3">
          <ProgressBar
            value={importProgress}
            max={100}
            size="md"
            animated={isImporting}
            showPercentage={false}
            variant={importError ? 'danger' : 'success'}
          />
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {isImporting
                ? 'Processando...'
                : importProgress >= 100
                  ? 'Concluído'
                  : `${importProgress}%`}
            </span>
            <span
              className={
                importError
                  ? 'text-danger'
                  : importMessage
                    ? 'text-primary'
                    : 'text-text-secondary'
              }
            >
              {importError
                ? importError
                : importMessage
                  ? importMessage
                  : isImporting
                    ? 'Importando...'
                    : 'Pronto'}
            </span>
          </div>
        </div>

        {importResult && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">
              Resultado da importação
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded border bg-surface text-center">
                <div className="text-xs text-text-secondary">Inseridos</div>
                <div className="text-xl font-semibold">{importResult.inserted ?? 0}</div>
              </div>
              <div className="p-3 rounded border bg-surface text-center">
                <div className="text-xs text-text-secondary">Atualizados</div>
                <div className="text-xl font-semibold">{importResult.updated ?? 0}</div>
              </div>
              <div className="p-3 rounded border bg-surface text-center">
                <div className="text-xs text-text-secondary">Pulados</div>
                <div className="text-xl font-semibold">{importResult.skipped ?? 0}</div>
              </div>
              <div className="p-3 rounded border bg-surface text-center">
                <div className="text-xs text-text-secondary">Total no portal</div>
                <div className="text-xl font-semibold">{importResult.total_listings ?? '-'}</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-text-primary mb-2">
                Erros detalhados
              </h4>
              {Array.isArray(importResult.errors) && importResult.errors.length > 0 ? (
                <div className="overflow-auto rounded border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-background text-text-secondary">
                      <tr>
                        <th className="px-3 py-2 text-left">External ID</th>
                        <th className="px-3 py-2 text-left">Mensagem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.errors.map((err: any, idx: number) => {
                        const external =
                          err && typeof err === 'object'
                            ? err.external_id || err.externalId || err.externalId
                            : null;
                        const message =
                          err && typeof err === 'object'
                            ? err.error || err.message || JSON.stringify(err)
                            : typeof err === 'string'
                              ? err
                              : JSON.stringify(err);
                        return (
                          <tr
                            key={idx}
                            className="odd:bg-background even:bg-surface"
                          >
                            <td className="px-3 py-2 align-top">
                              {external || <span className="text-text-secondary">-</span>}
                            </td>
                            <td className="px-3 py-2 align-top">
                              <pre className="whitespace-pre-wrap text-xs m-0">{message}</pre>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 text-sm text-text-secondary">
                  Nenhum erro reportado durante a importação.
                </div>
              )}

              {importRawError && (
                <div className="mt-3">
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => setShowImportErrorDetails(s => !s)}
                  >
                    {showImportErrorDetails
                      ? 'Ocultar detalhes da resposta'
                      : 'Ver detalhes da resposta'}
                  </button>
                  {showImportErrorDetails && (
                    <pre className="mt-2 p-2 bg-surface text-xs overflow-auto rounded border max-h-48">
                      {typeof importRawError === 'string'
                        ? importRawError
                        : JSON.stringify(
                            importRawError,
                            Object.getOwnPropertyNames(importRawError),
                            2
                          )}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderPlan = () => {
    const contractNumberId = 'contract-number';
    const maxListingsId = 'contract-max-listings';

    return (
      <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Plano CanalPro & Destaques</h2>
          <p className="text-sm text-text-secondary">
            Configure limites contratuais, acompanhe KPIs e gerencie destaques premium.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => setContractTab('config')}>
            Configuração
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setContractTab('highlights')}>
            Destaques
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-text-primary">Resumo da carteira</h4>
            <p className="text-xs text-text-secondary">Acompanhe a utilização do contrato em tempo real.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={loadContractKPIs} disabled={kpisLoading}>
            {kpisLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Atualizando
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Atualizar
              </>
            )}
          </Button>
        </div>

        {contractKPIs ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <KPICard
                title="Total de imóveis"
                value={contractKPIs.total_properties ?? 0}
                icon={<Building2 className="h-6 w-6" />}
                color="blue"
                subtitle="Na carteira"
              />
              <KPICard
                title="Com destaque"
                value={contractKPIs.highlighted_count ?? 0}
                icon={<Sparkles className="h-6 w-6" />}
                color="green"
                subtitle="Anúncios destacados"
              />
              <KPICard
                title="Sem destaque"
                value={contractKPIs.non_highlight_count ?? 0}
                icon={<FileX className="h-6 w-6" />}
                color="yellow"
                subtitle="Anúncios padrão"
              />
            </div>

            {contractKPIs.usage?.total && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
                <h5 className="text-xs font-semibold text-text-primary mb-2">
                  Limite total de anúncios
                </h5>
                <ProgressBar
                  value={contractKPIs.usage.total.used}
                  max={contractKPIs.usage.total.limit}
                  size="md"
                  animated
                />
              </div>
            )}

            <div>
              <h5 className="text-sm font-semibold text-text-primary mb-3">
                Destaques por tipo de publicação
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {validTypes.map(t => {
                  const usage = contractKPIs.usage?.highlights_by_type?.[t];
                  const used = Number(usage?.used ?? (contractKPIs.publication_counts?.[t] ?? 0));
                  const limit = usage?.limit as number | null | undefined;
                  const over = usage?.over_limit ?? (limit != null ? used > (limit as number) : false);
                  return (
                    <div
                      key={t}
                      className={`p-4 rounded-xl border bg-gradient-to-br ${
                        over
                          ? 'from-red-50 to-red-100 border-red-300'
                          : 'from-gray-50 to-gray-100 border-gray-200'
                      }`}
                    >
                      <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                        {typeLabels[t] ?? t}
                      </p>
                      <p className="text-2xl font-bold text-text-primary mb-3">
                        {used}
                        {limit != null && (
                          <span className="text-sm font-normal text-text-secondary ml-1">/ {limit}</span>
                        )}
                      </p>
                      {limit != null && (
                        <ProgressBar value={used} max={limit} size="sm" animated showPercentage={false} />
                      )}
                      {over && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-danger font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          Acima do limite
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-text-secondary mb-4">
              Carregue os KPIs para visualizar o resumo da carteira.
            </p>
            <Button onClick={loadContractKPIs} disabled={kpisLoading}>
              {kpisLoading ? 'Carregando...' : 'Carregar KPIs'}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-text-primary">Configurações do contrato</h3>
        </div>
        <div className="space-y-6">
          <Button
            variant="secondary"
            onClick={() => setIsEditingConfig(prev => !prev)}
            className="w-full"
          >
            <Settings className="h-4 w-4 mr-2" />
            {isEditingConfig ? 'Ocultar configurações' : 'Editar configurações do plano'}
            {isEditingConfig ? (
              <ChevronUp className="h-4 w-4 ml-auto" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-auto" />
            )}
          </Button>

          {isEditingConfig && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-secondary mb-1 block" htmlFor={contractNumberId}>
                    Número do contrato
                  </label>
                  <input
                    id={contractNumberId}
                    className="p-2 text-sm rounded border bg-background w-full focus:ring-2 focus:ring-primary/20 transition-all"
                    value={contractNumber}
                    onChange={e => setContractNumber(e.target.value)}
                    placeholder="Opcional"
                    disabled={contractLoading}
                  />
                </div>
                <div>
                  <label className="text-xs text-text-secondary mb-1 block" htmlFor={maxListingsId}>
                    Máx. anúncios
                  </label>
                  <input
                    id={maxListingsId}
                    className="p-2 text-sm rounded border bg-background w-full focus:ring-2 focus:ring-primary/20 transition-all"
                    value={maxListings}
                    onChange={e => setMaxListings(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Ex: 50"
                    disabled={contractLoading}
                  />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-text-primary mb-2">
                  Limites de destaque por tipo
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {validTypes.map(t => {
                    const inputId = `highlight-${t.toLowerCase()}`;
                    return (
                      <div key={t} className="flex flex-col">
                        <label className="text-xs text-text-secondary mb-1" htmlFor={inputId}>
                          {typeLabels[t] ?? t}
                        </label>
                        <input
                          id={inputId}
                        className="p-2 text-sm rounded border bg-background w-full focus:ring-2 focus:ring-primary/20 transition-all"
                        value={String(highlightLimits[t] ?? 0)}
                        onChange={e => {
                          const val = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
                          setHighlightLimits(prev => ({ ...prev, [t]: val }));
                        }}
                        disabled={contractLoading}
                      />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={saveContractConfig} disabled={contractLoading} size="sm">
                  {contractLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Salvando
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3 mr-1" />
                      Salvar
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadContractConfig}
                  disabled={contractLoading}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Recarregar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={contractLoading}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remover
                </Button>
              </div>

              {(contractMessage || contractError) && (
                <div className="space-y-2">
                  {contractMessage && (
                    <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
                      {contractMessage}
                    </div>
                  )}
                  {contractError && (
                    <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                      {contractError}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-text-primary">Gestão de destaques</h3>
        </div>
        <BulkHighlightManager
          typeLabels={typeLabels}
          validTypes={validTypes}
          onSuccess={() => void loadContractKPIs()}
        />
      </div>
    </div>
  );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-text-primary">Gestão CanalPro</h1>
        <p className="text-sm text-text-secondary max-w-2xl">
          Gerencie seus destaques premium, acompanhe limites do plano e mantenha sua integração ativa.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {/* Ordem otimizada por frequência de uso */}
        {(['plan', 'import', 'integration'] as CanalProSection[]).map(section => {
          const info = sectionLabels[section];
          const isActive = activeSection === section;
          const isPrimary = section === 'plan'; // Destaca a aba principal
          return (
            <Button
              key={section}
              variant={isActive ? 'primary' : 'ghost'}
              onClick={() => setActiveSection(section)}
              size="sm"
              className={`flex items-center gap-2 ${
                isPrimary && !isActive ? 'border border-primary/30' : ''
              }`}
            >
              {info.icon}
              {info.title}
              {isPrimary && !isActive && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded">
                  Principal
                </span>
              )}
            </Button>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
        {activeSection === 'plan' && renderPlan()}
        {activeSection === 'import' && renderImport()}
        {activeSection === 'integration' && renderIntegration()}
      </div>

      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={async () => {
          await deleteContractConfig();
          setDeleteConfirmOpen(false);
        }}
        title="Remover configuração de plano"
        description="Esta ação remove todos os limites e configurações do contrato CanalPro. Destaques ativos permanecem, mas você perderá o controle de cotas."
        confirmText="Sim, remover"
        confirmVariant="danger"
        icon={<AlertTriangle className="h-6 w-6 text-red-500" />}
        loading={contractLoading}
      />

      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={confirm.handleClose}
        onConfirm={confirm.handleConfirm}
        title={confirm.options.title}
        message={confirm.options.message}
        confirmText={confirm.options.confirmText}
        cancelText={confirm.options.cancelText}
        variant={confirm.options.variant}
      />
    </div>
  );
};

export default CanalProManagementPage;
