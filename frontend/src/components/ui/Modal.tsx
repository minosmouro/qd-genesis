import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { cn } from '@/utils/cn';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-background/80 modal-backdrop-blur" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={cn(
                  'w-full transform rounded-2xl bg-surface/95 backdrop-blur-xl border border-border/50 text-left align-middle shadow-2xl transition-all',
                  sizeClasses[size]
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-center p-4 sm:p-6 border-b border-border/50 relative">
                  {title && (
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-text-primary text-center flex-1"
                    >
                      {title}
                    </Dialog.Title>
                  )}
                  <button
                    onClick={onClose}
                    className="absolute right-4 sm:right-6 p-2 rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 hover:rotate-90"
                    aria-label="Fechar modal"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 text-text-secondary max-h-[calc(100vh-12rem)] overflow-y-auto">
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default Modal;
