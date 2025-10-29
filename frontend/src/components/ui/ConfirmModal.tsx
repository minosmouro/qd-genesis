import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import Button from './Button';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      icon: XCircle,
      iconBg: 'bg-error/20',
      iconColor: 'text-error',
      headerBg: 'bg-error/5',
      buttonVariant: 'danger' as const,
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-warning/20',
      iconColor: 'text-warning',
      headerBg: 'bg-warning/5',
      buttonVariant: 'accent' as const,
    },
    info: {
      icon: Info,
      iconBg: 'bg-info/20',
      iconColor: 'text-info',
      headerBg: 'bg-info/5',
      buttonVariant: 'primary' as const,
    },
    success: {
      icon: CheckCircle2,
      iconBg: 'bg-success/20',
      iconColor: 'text-success',
      headerBg: 'bg-success/5',
      buttonVariant: 'primary' as const,
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    console.log('🔥 ConfirmModal: handleConfirm chamado!');
    onConfirm();
    if (!isLoading) {
      onClose();
    }
  };

  console.log('🎯 ConfirmModal renderizado:', { isOpen, title, variant });

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Backdrop com blur */}
      <div 
        className="absolute inset-0 bg-black/70 modal-backdrop-blur"
        style={{ pointerEvents: 'auto' }}
        onClick={() => {
          console.log('🖱️ Backdrop clicado!');
          onClose();
        }}
      />
      
      {/* Modal Box */}
      <div 
        className="relative bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in"
        style={{ pointerEvents: 'auto', zIndex: 10 }}
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header */}
          <div className={`flex items-center gap-3 px-6 py-4 border-b border-border ${config.headerBg}`}>
            <div className={`w-10 h-10 rounded-full ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <h2 className="text-xl font-bold text-text-primary flex-1">
              {title}
            </h2>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <p className="text-text-secondary leading-relaxed">
              {message}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-surface/50 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => {
                console.log('❌ Botão Cancelar clicado!');
                onClose();
              }}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              variant={config.buttonVariant}
              onClick={() => {
                console.log('✅ Botão Confirmar clicado!');
                handleConfirm();
              }}
              loading={isLoading}
            >
              {confirmText}
            </Button>
          </div>
      </div>
    </div>
  );

  // Renderiza usando Portal direto no body (fora do Dialog do Headless UI)
  return createPortal(modalContent, document.body);
};

export default ConfirmModal;
