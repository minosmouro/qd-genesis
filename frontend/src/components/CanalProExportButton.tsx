import React from 'react';
import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useCanalProExport } from '@/hooks/useCanalProExport';
import Button from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface CanalProExportButtonProps {
  propertyIds?: number[];
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

const CanalProExportButton: React.FC<CanalProExportButtonProps> = ({
  propertyIds,
  variant = 'primary',
  size = 'md',
  className,
  onSuccess,
  onError,
}) => {
  const {
    isExporting,
    isPolling,
    exportStatus,
    exportProperties,
    credentialsStatus,
    checkCredentials,
  } = useCanalProExport();

  const handleExport = () => {
    // Verificar credenciais antes de exportar
    if (credentialsStatus && !credentialsStatus.is_valid) {
      toast.error('Credenciais expiradas. Configure novas credenciais primeiro.');
      return;
    }

    exportProperties(propertyIds, {
      onSuccess: (result) => {
        if (result.success) {
          onSuccess?.();
        } else if (result.errors && result.errors.length > 0 && result.errors[0].includes('Authentication failed')) {
          toast.error('Falha de autenticação. Verifique suas credenciais.');
          checkCredentials(); // Re-verificar credenciais
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
    if (isExporting) {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Iniciando...
        </>
      );
    }

    if (isPolling && exportStatus) {
      const progress = exportStatus.total_properties > 0
        ? Math.round((exportStatus.processed / exportStatus.total_properties) * 100)
        : 0;

      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Exportando... {progress}%
        </>
      );
    }

    if (exportStatus && !exportStatus.is_running) {
      const hasErrors = exportStatus.failed > 0;
      return (
        <>
          {hasErrors ? (
            <XCircle className="w-4 h-4 text-danger dark:text-danger" />
          ) : (
            <CheckCircle className="w-4 h-4 text-primary dark:text-primary" />
          )}
          {hasErrors ? 'Erros na exportação' : 'Exportação concluída'}
        </>
      );
    }

    return (
      <>
        <Upload className="w-4 h-4" />
        Exportar para Canal Pro
      </>
    );
  };

  const getButtonVariant = (): 'primary' | 'secondary' | 'ghost' | 'danger' => {
    if (isPolling && exportStatus) {
      return 'secondary';
    }
    if (exportStatus && !exportStatus.is_running) {
      return exportStatus.failed > 0 ? 'danger' : 'primary';
    }
    return variant;
  };

  return (
    <Button
      variant={getButtonVariant()}
      size={size}
      onClick={handleExport}
      disabled={isExporting || isPolling}
      className={cn(
        'relative',
        exportStatus && !exportStatus.is_running && exportStatus.failed > 0 && 'border-border text-danger dark:text-danger',
        className
      )}
    >
      {getButtonContent()}
    </Button>
  );
};

export default CanalProExportButton;