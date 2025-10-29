import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { loginSchema, LoginFormData } from '@/utils/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, User, Lock, ArrowRight, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import Logo from '@/components/Logo';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsSubmitting(true);
      await login(data.username, data.password);
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary animate-pulse" />
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-navy/10 dark:bg-brand-navy-light/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-yellow/10 dark:bg-brand-yellow-light/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Header with modern styling */}
        <div className="text-center mb-8 animate-fade-in-down">
          <div className="mb-6 flex justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="text-3xl font-display font-bold text-brand-navy dark:text-brand-navy-lighter mb-2">
            Bem-vindo de volta
          </h1>
          <p className="text-text-secondary">
            Acesse sua plataforma de gestão imobiliária
          </p>
        </div>

        {/* Glass morphism form card */}
        <div className="relative animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-brand-yellow dark:bg-brand-yellow-light rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000" />
          
          <div className="relative bg-surface/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {/* Username with icon */}
              <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <Input
                  id="username"
                  type="text"
                  label="Usuário"
                  placeholder="seu.usuario"
                  icon={<User className="h-5 w-5" />}
                  error={errors.username?.message}
                  {...register('username')}
                />
              </div>

              {/* Password with toggle visibility */}
              <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    label="Senha"
                    placeholder="••••••••"
                    icon={<Lock className="h-5 w-5" />}
                    error={errors.password?.message}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-[42px] text-text-secondary hover:text-text-primary transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me and forgot password */}
              <div className="flex items-center justify-between text-sm animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <span className="text-text-secondary group-hover:text-text-primary transition-colors">
                    Lembrar-me
                  </span>
                </label>
                <button
                  type="button"
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>

              {/* Submit Button with gradient */}
              <div className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  loading={isSubmitting}
                  className="w-full font-display"
                  icon={!isSubmitting && <ArrowRight className="h-5 w-5" />}
                  iconPosition="right"
                >
                  {isSubmitting ? 'Entrando...' : 'Entrar'}
                </Button>
              </div>
            </form>

            {/* Divider */}
            <div className="relative my-6 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface px-2 text-text-secondary">
                  Primeira vez aqui?
                </span>
              </div>
            </div>

            {/* Sign up link */}
            <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
              <button
                type="button"
                className="text-sm text-text-secondary hover:text-primary transition-colors"
              >
                Solicite acesso à plataforma →
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <p className="text-xs text-text-secondary flex items-center justify-center gap-2">
            <Sparkles className="h-3 w-3" />
            © 2025 QuadraDois. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;