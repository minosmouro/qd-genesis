import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import StepIndicator from '@/components/ui/StepIndicator';
import OTPInput from '@/components/ui/OTPInput';
import { authService } from '@/services/auth.service';
import { toast } from 'sonner';
import { Mail, Lock, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';

interface IntegrationSettingsModalProps {
  onSuccess?: () => void;
  onNavigateToImport?: () => void;
}

const IntegrationSettingsModal: React.FC<IntegrationSettingsModalProps> = ({ 
  onSuccess,
  onNavigateToImport 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vinculacaoStep, setVinculacaoStep] = useState<1 | 2 | 3>(1);
  const [otpError, setOtpError] = useState(false);

  const emailInputId = 'canalpro-email';
  const passwordInputId = 'canalpro-password';

  const resetIntegrationFlow = () => {
    setVinculacaoStep(1);
    setEmail('');
    setPassword('');
    setSessionId(null);
    setOtp('');
    setOtpError(false);
    setMessage(null);
    setError(null);
  };

  const startLink = async (): Promise<boolean> => {
    if (!email || !password) {
      toast.error('Preencha email e senha');
      return false;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      console.log('🚀 Iniciando vinculação CanalPro...', { email });
      const data = await authService.startGandalfLogin({ email, password });
      console.log('✅ Resposta do servidor:', data);
      
      // Caso 1: Precisa OTP
      if (data.needs_otp || data.sessionId || data.session_id) {
        const sessionIdValue = data.sessionId || data.session_id;
        setSessionId(sessionIdValue);
        setMessage('Código OTP enviado para o email!');
        toast.success('Código enviado!');
        return true;
      } 
      
      // Caso 2: Login direto sem OTP (device já validado) ou credenciais salvas
      if (data.success || data.message === 'Credentials saved successfully') {
        setMessage('Vinculação concluída com sucesso!');
        toast.success('Vinculação concluída!');
        setVinculacaoStep(3);
        onSuccess?.();
        return true;
      } 
      
      // Caso 3: Erro na resposta
      console.error('❌ Erro na resposta:', data);
      const errorMsg = data.error || data.message || 'Falha ao iniciar vinculação';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } catch (err: any) {
      console.error('❌ Exceção ao iniciar vinculação:', err);
      
      // Extrair mensagem de erro detalhada
      let errorMsg = 'Erro ao conectar com CanalPro';
      
      if (err?.message) {
        errorMsg = err.message;
      } else if (err?.error) {
        errorMsg = err.error;
      } else if (err?.details) {
        errorMsg = err.details;
      } else if (typeof err === 'string') {
        errorMsg = err;
      }
      
      // Adicionar detalhes técnicos se disponíveis
      if (err?.code) {
        errorMsg += ` (Código: ${err.code})`;
      }
      
      setError(errorMsg);
      toast.error(errorMsg, { duration: 5000 });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const validateOtp = async (): Promise<boolean> => {
    if (!sessionId || otp.length !== 6) {
      toast.error('Código OTP inválido');
      return false;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const data = await authService.validateGandalfLogin({ 
        session_id: sessionId, 
        otp, 
        email 
      });
      if (data.success) {
        setMessage('Vinculação concluída com sucesso!');
        toast.success('Vinculação concluída!');
        onSuccess?.();
        return true;
      } else {
        setError(data.error || 'Código OTP inválido');
        toast.error('Código incorreto');
        return false;
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Erro ao validar OTP';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Visual com Gradiente Indigo */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.6))]"></div>
        <div className="relative flex items-start gap-4">
          <div className="rounded-xl bg-white/20 backdrop-blur-sm p-3 ring-1 ring-white/30">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">Configurações da Integração</h2>
            <p className="text-purple-100 text-sm leading-relaxed">
              Vincule ou atualize as credenciais de acesso ao CanalPro. Processo seguro em 3 etapas com verificação por OTP.
            </p>
          </div>
        </div>
      </div>

      {/* Card Principal */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-background to-surface p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Vinculação segura</h3>
              <p className="text-xs text-text-secondary">Processo verificado com OTP</p>
            </div>
          </div>
          {vinculacaoStep !== 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetIntegrationFlow}
              disabled={loading}
              className="hover:bg-surface"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reiniciar
            </Button>
          )}
        </div>
        {/* Step Indicator com Design Melhorado */}
        <div className="flex items-center justify-between mb-8 px-4">
          <StepIndicator
            active={vinculacaoStep === 1}
            completed={vinculacaoStep > 1}
            number={1}
            label="Credenciais"
          />
          <div className="flex-1 h-1 bg-gradient-to-r from-border to-border mx-4 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r from-primary to-primary transition-all duration-500 ${
                vinculacaoStep > 1 ? 'w-full' : 'w-0'
              }`}
            ></div>
          </div>
          <StepIndicator
            active={vinculacaoStep === 2}
            completed={vinculacaoStep > 2}
            number={2}
            label="Verificação"
          />
          <div className="flex-1 h-1 bg-gradient-to-r from-border to-border mx-4 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r from-primary to-primary transition-all duration-500 ${
                vinculacaoStep > 2 ? 'w-full' : 'w-0'
              }`}
            ></div>
          </div>
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
                Use as credenciais do CanalPro para conectar o sistema. Após concluir a vinculação você poderá importar imóveis e gerir o plano.
              </p>
              <div>
                <label className="text-sm font-medium mb-2 block" htmlFor={emailInputId}>
                  Email <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <input
                    id={emailInputId}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 transition-all ${
                      error && !email 
                        ? 'border-danger focus:ring-danger/20' 
                        : 'focus:ring-primary/20'
                    }`}
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (error) setError(null); // Limpa erro ao digitar
                    }}
                    placeholder="seu@email.com"
                    type="email"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" htmlFor={passwordInputId}>
                  Senha <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <input
                    id={passwordInputId}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 transition-all ${
                      error && !password 
                        ? 'border-danger focus:ring-danger/20' 
                        : 'focus:ring-primary/20'
                    }`}
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      if (error) setError(null); // Limpa erro ao digitar
                    }}
                    placeholder="••••••••"
                    type="password"
                    disabled={loading}
                    required
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
                  if (success) setVinculacaoStep(2);
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
                Agora você pode importar imóveis e gerenciar o plano CanalPro.
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
              {onNavigateToImport && (
                <Button
                  variant="secondary"
                  size="lg"
                  className="min-w-[200px]"
                  onClick={onNavigateToImport}
                >
                  Importar imóveis agora
                </Button>
              )}
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
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                <p className="font-semibold mb-1">❌ Erro ao iniciar vinculação</p>
                <p className="whitespace-pre-line">{error}</p>
              </div>
              
              {/* Card de Ajuda */}
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
                <p className="font-semibold text-blue-900 dark:text-blue-300 mb-2">💡 Dicas para resolver:</p>
                <ul className="space-y-1 text-blue-700 dark:text-blue-400 list-disc list-inside">
                  <li>Verifique se o email e senha do CanalPro estão corretos</li>
                  <li>Certifique-se de ter acesso ao email para receber o código OTP</li>
                  <li>Aguarde alguns segundos e tente novamente</li>
                  <li>Se o erro persistir, verifique com o suporte do CanalPro</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IntegrationSettingsModal;
