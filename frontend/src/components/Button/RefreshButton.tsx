import { useState } from 'react';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { refreshService } from '@/services/refresh.service';
import { Loader2, RefreshCw } from 'lucide-react';

interface RefreshButtonProps {
  propertyId: number;
  onRefreshSuccess?: (data: { new_remote_id: string }) => void;
}

export function RefreshButton({ propertyId, onRefreshSuccess }: RefreshButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleRefreshClick = async () => {
    setIsLoading(true);
    try {
      const result = await refreshService.manualRefresh(propertyId);
      toast.success(`O imóvel #${propertyId} foi atualizado com sucesso.`);
      if (onRefreshSuccess) {
        onRefreshSuccess({ new_remote_id: result.new_remote_id });
      }
    } catch (error: any) {
      console.error("Falha no refresh manual:", error);
      toast.error(error?.response?.data?.error || 'Não foi possível atualizar o imóvel.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleRefreshClick}
      disabled={isLoading}
      variant="secondary"
      size="sm"
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="mr-2 h-4 w-4" />
      )}
      {isLoading ? 'Atualizando...' : 'Refresh'}
    </Button>
  );
}
