import React from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { useCanalProExportAndActivate } from '@/hooks/useCanalProExportAndActivate';
import Button from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface CanalProExportAndActivateButtonProps {
  propertyIds?: number[];
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

const CanalProExportAndActivateButton: React.FC<CanalProExportAndActivateButtonProps> = ({
  propertyIds,
  variant = 'primary',
  size = 'md',
  className,
  onSuccess,
  onError,
}) => {
  const {
    isExportingAndActivating,
    credentialsStatus,
    exportAndActivateProperties,
  } = useCanalProExportAndActivate();

  const handleExportAndActivate = () => {
    // Verificar credenciais antes de exportar
    if (credentialsStatus && !credentialsStatus.is_valid) {
      toast.error('Credenciais expiradas. Configure novas credenciais primeiro.');
      return;
    }

    exportAndActivateProperties(propertyIds, {
      onSuccess: (result) => {
        const exportSuccess = result.export_stats.successful || 0;
        const hasSuccess = exportSuccess > 0 || result.activation_results.some((r: any) => r.activated);
        if (hasSuccess) {
          onSuccess?.();
        }
      },
      onError: (error: any) => {
        if (error?.message?.includes('Authentication failed') ||
            error?.message?.includes('Credenciais expiradas')) {
          toast.error('Credenciais expiradas. Configure novas credenciais em Configurações.');
        } else {
          onError?.(error);
        }
      },
    });
  };

  const getButtonContent = () => {
    if (isExportingAndActivating) {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Exportando + Ativando...
        </>
      );
    }

    return (
      <>
        <Zap className="w-4 h-4" />
        Exportar + Ativar
      </>
    );
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handleExportAndActivate}
      disabled={isExportingAndActivating}
    >
      {getButtonContent()}
    </Button>
  );
};

export default CanalProExportAndActivateButton;