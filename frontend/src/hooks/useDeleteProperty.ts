import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiDelete, apiPost } from '@/services/api';

type DeletionType = 'soft' | 'local' | 'canalpro' | 'both';
type DeletionReason = 'SOLD' | 'RENTED' | 'OWNER_REQUEST' | 'DUPLICATE' | 'INCORRECT_INFO' | 'OTHER';

interface DeleteParams {
  propertyIds: number[];
  type: DeletionType;
  reason: DeletionReason;
  notes?: string;
}

interface DeleteResponse {
  success: boolean;
  message: string;
  deleted?: number;
  archived?: number;
  failed?: number;
  details?: any;
}

const deleteProperty = async (params: DeleteParams): Promise<DeleteResponse> => {
  const { propertyIds, type, reason, notes } = params;
  
  const body = {
    reason,
    notes,
    confirmed: true
  };
  
  // Se for um único imóvel, usa a rota individual
  if (propertyIds.length === 1) {
    const propertyId = propertyIds[0];
    
    switch (type) {
      case 'soft':
        return apiDelete(`/api/properties/${propertyId}/soft-delete`, body);
        
      case 'local':
        return apiDelete(`/api/properties/${propertyId}/delete-local`, body);
        
      case 'canalpro':
        // TODO: Implementar rota específica no backend
        return apiPost(`/api/properties/${propertyId}/delete-canalpro`, body);
        
      case 'both':
        return apiDelete(`/api/properties/${propertyId}/delete-both`, body);
        
      default:
        throw new Error('Tipo de exclusão inválido');
    }
  } else {
    // Múltiplos imóveis - usa rota bulk
  return apiPost('/api/properties/bulk/delete', {
      property_ids: propertyIds,
      deletion_type: type,
      reason,
      notes,
      confirmed: true
    });
  }
};

export const useDeleteProperty = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: deleteProperty,
    onSuccess: (data, variables) => {
      const isBulk = variables.propertyIds.length > 1;
      const count = data.deleted || data.archived || variables.propertyIds.length;
      
      // Mensagens customizadas por tipo
      const messages = {
        soft: isBulk 
          ? `${count} imóveis arquivados com sucesso!` 
          : 'Imóvel arquivado com sucesso!',
        local: isBulk
          ? `${count} imóveis removidos do Quadra Dois!`
          : 'Imóvel removido do Quadra Dois!',
        canalpro: isBulk
          ? `${count} imóveis removidos do CanalPro!`
          : 'Imóvel removido do CanalPro!',
        both: isBulk
          ? `${count} imóveis excluídos permanentemente!`
          : 'Imóvel excluído permanentemente!'
      };
      
      toast.success(messages[variables.type] || data.message);
      
      // Invalidar queries para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      
      // Fechar modal
      setIsModalOpen(false);
      
      // Recarregar página após pequeno delay para garantir que o toast seja visível
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Erro ao excluir imóvel(is)';
      toast.error(errorMessage);
    }
  });

  return {
    deleteProperty: mutation.mutate,
    isLoading: mutation.isPending,
    isModalOpen,
    openModal: () => setIsModalOpen(true),
    closeModal: () => setIsModalOpen(false),
  };
};
