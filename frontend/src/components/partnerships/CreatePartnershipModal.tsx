import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, TrendingUp, FileText } from 'lucide-react';
import { partnershipsService } from '@/services/partnerships.service';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';

interface CreatePartnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreatePartnershipModal: React.FC<CreatePartnershipModalProps> = ({
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    partner_tenant_id: '',
    commission_percentage: '50',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mutation para criar parceria
  const createMutation = useMutation({
    mutationFn: () =>
      partnershipsService.createPartnership({
        partner_tenant_id: parseInt(formData.partner_tenant_id),
        commission_percentage: parseFloat(formData.commission_percentage) || undefined,
        notes: formData.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Solicitação de parceria enviada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erro ao criar parceria'
      );
    },
  });

  const handleClose = () => {
    setFormData({
      partner_tenant_id: '',
      commission_percentage: '50',
      notes: '',
    });
    setErrors({});
    onClose();
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.partner_tenant_id) {
      newErrors.partner_tenant_id = 'Selecione um tenant parceiro';
    }

    const commission = parseFloat(formData.commission_percentage);
    if (formData.commission_percentage && (isNaN(commission) || commission < 0 || commission > 100)) {
      newErrors.commission_percentage = 'Comissão deve estar entre 0 e 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      createMutation.mutate();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nova Parceria">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Como funciona?</p>
              <p>
                Ao criar uma parceria, você envia uma solicitação para outro tenant. 
                Após a aprovação, vocês poderão compartilhar imóveis entre si.
              </p>
            </div>
          </div>
        </div>

        {/* Tenant Parceiro */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tenant Parceiro <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.partner_tenant_id}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                partner_tenant_id: e.target.value,
              }))
            }
            placeholder="Ex: 5"
            className={`
              w-full px-4 py-2.5 border rounded-lg 
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              transition-colors
              ${errors.partner_tenant_id ? 'border-red-300' : 'border-gray-300'}
            `}
          />
          {errors.partner_tenant_id && (
            <p className="mt-1 text-sm text-red-600">{errors.partner_tenant_id}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Digite o ID do tenant com quem deseja estabelecer parceria
          </p>
        </div>

        {/* Comissão */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Comissão Padrão (%)
          </label>
          <input
            type="number"
            value={formData.commission_percentage}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                commission_percentage: e.target.value,
              }))
            }
            placeholder="50"
            min="0"
            max="100"
            step="0.01"
            className={`
              w-full px-4 py-2.5 border rounded-lg 
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              transition-colors
              ${errors.commission_percentage ? 'border-red-300' : 'border-gray-300'}
            `}
          />
          {errors.commission_percentage && (
            <p className="mt-1 text-sm text-red-600">{errors.commission_percentage}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Percentual de comissão padrão para imóveis compartilhados (0-100)
          </p>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notas (opcional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                notes: e.target.value,
              }))
            }
            placeholder="Ex: Parceria para imóveis comerciais na região central..."
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            Adicione informações sobre o tipo de parceria ou acordos específicos
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="flex items-center gap-2"
          >
            {createMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Criando...
              </>
            ) : (
              'Criar Parceria'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreatePartnershipModal;
