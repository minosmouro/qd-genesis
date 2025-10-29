import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { empreendimentosService } from '@/services/empreendimentos.service';

interface PendingSuggestionsBadgeProps {
  /** Se true, mostra apenas o número sem ícone */
  compact?: boolean;
  /** Intervalo de atualização em ms (padrão: 60000 = 1 minuto) */
  refreshInterval?: number;
  /** Callback quando o badge é clicado */
  onClick?: () => void;
  /** Classes CSS adicionais */
  className?: string;
}

const PendingSuggestionsBadge: React.FC<PendingSuggestionsBadgeProps> = ({
  compact = false,
  refreshInterval = 60000,
  onClick,
  className = '',
}) => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = async () => {
    try {
      const count = await empreendimentosService.countPendingSuggestions();
      setCount(count);
    } catch (error) {
      console.error('Erro ao buscar contagem de sugestões pendentes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();

    // Auto-refresh
    const interval = setInterval(fetchCount, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Não renderiza nada se não houver sugestões pendentes
  if (!loading && count === 0) {
    return null;
  }

  if (loading) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-400 ${className}`}
      >
        {!compact && <Bell className="w-4 h-4 animate-pulse" />}
        <span className="text-sm font-medium">...</span>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all hover:scale-105 active:scale-95 ${className}`}
      title={`${count} sugestão${count !== 1 ? 'ões' : ''} pendente${count !== 1 ? 's' : ''}`}
    >
      {!compact && <Bell className="w-4 h-4 animate-pulse" />}
      <span className="text-sm font-medium">{count}</span>
      {!compact && (
        <span className="text-xs font-normal hidden sm:inline">
          Sugestão{count !== 1 ? 'ões' : ''} Pendente{count !== 1 ? 's' : ''}
        </span>
      )}
    </button>
  );
};

export default PendingSuggestionsBadge;
