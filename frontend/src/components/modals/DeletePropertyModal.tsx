import React, { useState, useEffect } from 'react';
import { Property } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  X, 
  AlertTriangle, 
  Archive, 
  Home, 
  Globe, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { cn } from '@/utils/cn';

type DeletionType = 'soft' | 'local' | 'canalpro' | 'both';
type DeletionReason = 'SOLD' | 'RENTED' | 'OWNER_REQUEST' | 'DUPLICATE' | 'INCORRECT_INFO' | 'OTHER';

interface DeletePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  onConfirm: (type: DeletionType, reason: DeletionReason, notes: string) => void;
  isLoading?: boolean;
}

const REASON_OPTIONS: { value: DeletionReason; label: string }[] = [
  { value: 'SOLD', label: 'Vendido' },
  { value: 'RENTED', label: 'Locado' },
  { value: 'OWNER_REQUEST', label: 'Retirado pelo proprietário' },
  { value: 'DUPLICATE', label: 'Duplicado' },
  { value: 'INCORRECT_INFO', label: 'Informações incorretas' },
  { value: 'OTHER', label: 'Outro motivo' },
];

const DeletePropertyModal: React.FC<DeletePropertyModalProps> = ({
  isOpen,
  onClose,
  properties,
  onConfirm,
  isLoading = false,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [deletionType, setDeletionType] = useState<DeletionType | null>(null);
  const [reason, setReason] = useState<DeletionReason>('SOLD');
  const [notes, setNotes] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const isBulk = properties.length > 1;
  const property = properties[0]; // Para exibição no modo single

  // Reset estados quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setDeletionType(null);
      setReason('SOLD');
      setNotes('');
      setConfirmation('');
    }
  }, [isOpen]);

  // Reset ao fechar
  const handleClose = () => {
    setStep(1);
    setDeletionType(null);
    setReason('SOLD');
    setNotes('');
    setConfirmation('');
    onClose();
  };

  const handleNext = () => {
    if (step === 1) setStep(2);
    else if (step === 2 && deletionType) setStep(3);
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleConfirm = () => {
    if (confirmation.toLowerCase() === 'excluir' && deletionType) {
      onConfirm(deletionType, reason, notes);
    }
  };

  const canProceedStep2 = deletionType !== null;
  const canProceedStep3 = confirmation.toLowerCase() === 'excluir';

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop com blur */}
      <div 
        className="fixed inset-0 z-50 bg-black/50 modal-backdrop-blur animate-fade-in"
        onClick={handleClose}
      />
      
      {/* Container do Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-danger/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-danger/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-danger" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                {isBulk ? 'Excluir Múltiplos Imóveis' : 'Excluir Imóvel'}
              </h2>
              <p className="text-sm text-text-secondary">
                Etapa {step} de 3
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-2 hover:bg-border/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-border">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          
          {/* STEP 1: Informações do Imóvel */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              {isBulk ? (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-text-primary">
                      Você selecionou {properties.length} imóveis
                    </h3>
                  </div>
                  
                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-4">
                    <p className="text-sm text-text-secondary">
                      <strong className="text-warning">Atenção:</strong> A ação escolhida será aplicada a todos os {properties.length} imóveis selecionados.
                    </p>
                  </div>

                  <div className="bg-surface-hover rounded-lg p-4 max-h-[200px] overflow-y-auto">
                    <div className="space-y-2">
                      {properties.slice(0, 10).map((prop) => (
                        <div key={prop.id} className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-primary">#{prop.external_id || prop.id}</span>
                          <span className="text-text-secondary truncate">
                            {prop.title || prop.address?.street || 'Sem título'}
                          </span>
                        </div>
                      ))}
                      {properties.length > 10 && (
                        <p className="text-xs text-text-tertiary pt-2">
                          ... e mais {properties.length - 10} imóveis
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">
                    Informações do Imóvel
                  </h3>
                  
                  <div className="flex gap-4 bg-surface-hover rounded-lg p-4">
                    {/* Thumbnail */}
                    {property.image_urls?.[0] && (
                      <img
                        src={property.image_urls[0]}
                        alt={property.title || 'Imóvel'}
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="inline-flex items-center gap-2 px-2 py-1 rounded bg-primary/10 text-primary text-sm font-semibold mb-2">
                        #{property.external_id || property.id}
                      </div>
                      <p className="font-semibold text-text-primary mb-1 truncate">
                        {property.title || 'Sem título'}
                      </p>
                      <p className="text-sm text-text-secondary truncate">
                        {property.address?.street}, {property.address?.number} - {property.address?.neighborhood}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-1 bg-border/50 rounded">
                          {property.status === 'imported' && 'Importado'}
                          {property.status === 'pending' && 'Pendente'}
                          {property.status === 'synced' && 'Sincronizado'}
                          {property.status === 'error' && 'Erro'}
                        </span>
                        {property.remote_id && (
                          <span className="text-xs px-2 py-1 bg-success/10 text-success rounded">
                            No CanalPro
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-danger/10 border border-danger/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-text-secondary">
                    <p className="font-semibold text-danger mb-1">Importante!</p>
                    <p>Esta ação pode ser irreversível dependendo da opção escolhida. Na próxima etapa, você poderá escolher onde deseja excluir.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Escolher Local de Exclusão */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Onde deseja excluir?
              </h3>

              <div className="space-y-3">
                {/* Opção: Arquivar (Soft Delete) */}
                <label
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all',
                    deletionType === 'soft'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-surface-hover'
                  )}
                >
                  <input
                    type="radio"
                    name="deletionType"
                    value="soft"
                    checked={deletionType === 'soft'}
                    onChange={() => setDeletionType('soft')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Archive className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-text-primary">Arquivar</span>
                      <span className="text-xs px-2 py-0.5 bg-success/20 text-success rounded">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">
                      Marca como arquivado em ambos os sistemas. Pode ser restaurado posteriormente.
                      {!isBulk && property.remote_id && ' Mantém no CanalPro como inativo.'}
                    </p>
                  </div>
                </label>

                {/* Opção: Apenas Quadra Dois */}
                <label
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all',
                    deletionType === 'local'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-surface-hover'
                  )}
                >
                  <input
                    type="radio"
                    name="deletionType"
                    value="local"
                    checked={deletionType === 'local'}
                    onChange={() => setDeletionType('local')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Home className="w-5 h-5 text-warning" />
                      <span className="font-semibold text-text-primary">Apenas Quadra Dois</span>
                    </div>
                    <p className="text-sm text-text-secondary">
                      Remove apenas do sistema local. {!isBulk && property.remote_id ? 'Mantém no CanalPro e portais.' : 'Não afeta o CanalPro.'}
                    </p>
                  </div>
                </label>

                {/* Opção: Apenas CanalPro */}
                <label
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all',
                    deletionType === 'canalpro'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-surface-hover'
                  )}
                >
                  <input
                    type="radio"
                    name="deletionType"
                    value="canalpro"
                    checked={deletionType === 'canalpro'}
                    onChange={() => setDeletionType('canalpro')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-5 h-5 text-info" />
                      <span className="font-semibold text-text-primary">Apenas CanalPro</span>
                    </div>
                    <p className="text-sm text-text-secondary">
                      Remove dos portais, mas mantém no sistema local para histórico.
                    </p>
                  </div>
                </label>

                {/* Opção: Ambos (Permanente) */}
                <label
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all',
                    deletionType === 'both'
                      ? 'border-danger bg-danger/10'
                      : 'border-border hover:border-danger/50 bg-surface-hover'
                  )}
                >
                  <input
                    type="radio"
                    name="deletionType"
                    value="both"
                    checked={deletionType === 'both'}
                    onChange={() => setDeletionType('both')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Trash2 className="w-5 h-5 text-danger" />
                      <span className="font-semibold text-text-primary">Ambos (Permanente)</span>
                      <span className="text-xs px-2 py-0.5 bg-danger/20 text-danger rounded">
                        Irreversível
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">
                      Remove completamente de todos os sistemas. Esta ação não pode ser desfeita.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: Motivo e Confirmação */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Confirmar Exclusão
              </h3>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Motivo da exclusão <span className="text-danger">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as DeletionReason)}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  {REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Observações adicionais (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione informações que possam ser úteis no futuro..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-surface text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
              </div>

              {/* Confirmação Final */}
              <div className="bg-danger/10 border border-danger/30 rounded-lg p-4">
                <label className="block text-sm font-medium text-danger mb-2">
                  ⚠️ Para confirmar, digite: <strong>excluir</strong>
                </label>
                <Input
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="Digite 'excluir' para confirmar"
                  className={cn(
                    'font-mono',
                    confirmation && confirmation.toLowerCase() !== 'excluir' && 'border-danger'
                  )}
                  autoComplete="off"
                />
                {confirmation && confirmation.toLowerCase() !== 'excluir' && (
                  <p className="text-xs text-danger mt-1">
                    Digite exatamente "excluir" (sem aspas)
                  </p>
                )}
              </div>

              {/* Resumo */}
              <div className="bg-surface-hover rounded-lg p-4 space-y-2 text-sm">
                <p className="font-semibold text-text-primary">Resumo da ação:</p>
                <div className="space-y-1 text-text-secondary">
                  <p>• <strong>Imóveis:</strong> {isBulk ? `${properties.length} selecionados` : `#${property.external_id || property.id}`}</p>
                  <p>• <strong>Ação:</strong> {
                    deletionType === 'soft' ? 'Arquivar' :
                    deletionType === 'local' ? 'Excluir apenas Quadra Dois' :
                    deletionType === 'canalpro' ? 'Excluir apenas CanalPro' :
                    'Excluir de ambos (permanente)'
                  }</p>
                  <p>• <strong>Motivo:</strong> {REASON_OPTIONS.find(o => o.value === reason)?.label}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-hover">
          <Button
            variant="ghost"
            onClick={step === 1 ? handleClose : handleBack}
            disabled={isLoading}
            icon={step === 1 ? <X className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          >
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </Button>

          {step < 3 ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={(step === 2 && !canProceedStep2) || isLoading}
              icon={<ChevronRight className="w-4 h-4" />}
              iconPosition="right"
            >
              Continuar
            </Button>
          ) : (
            <Button
              variant="danger"
              onClick={handleConfirm}
              disabled={!canProceedStep3}
              loading={isLoading}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Confirmar Exclusão
            </Button>
          )}
        </div>
        </div>
      </div>
    </>
  );
};

export default DeletePropertyModal;
