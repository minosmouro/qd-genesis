import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { Property } from '@/types';
import StatusPill from '@/components/ui/StatusPill';
import Button from '@/components/ui/Button';
import { useImageLoader } from '@/hooks/useImageLoader';
import {
  Eye,
  Edit,
  Zap,
  MoreHorizontal,
  Copy,
  ExternalLink,
  FilePlus,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PropertyCardProps {
  property: Property;
  onView?: (property: Property) => void;
  onEdit?: (property: Property) => void;
  onSync?: (property: Property) => void;
  className?: string;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onView,
  onEdit,
  onSync,
  className,
}) => {
  const { title, description, external_id, status, image_urls } = property;

  const imageUrl = image_urls?.[0] || '';
  const { imageSrc, isLoading: imageLoading } = useImageLoader({
    src: imageUrl,
    fallbackSrc: '/placeholder-property.jpg',
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(String(external_id));
      toast.success('ID copiado para a área de transferência');
      setMenuOpen(false);
    } catch (err) {
      toast.error('Não foi possível copiar o ID');
    }
  };

  const handleDuplicate = () => {
    // placeholder action — backend duplication can be wired later
    toast.success('Ação de duplicar iniciada (simulada).');
    setMenuOpen(false);
  };

  const handleOpenPortal = () => {
    const url =
      (property as any)?.provider_raw?.external_url ||
      (property as any)?.external_url;
    if (url) {
      window.open(url, '_blank');
    } else {
      toast('URL do portal não disponível', { icon: 'ℹ️' });
    }
    setMenuOpen(false);
  };

  const getHighlightBadge = () => {
    const pub = property.publication_type;
    if (!pub || pub === 'STANDARD') return null; // Sem etiqueta
    const LABELS: Record<string, string> = {
      PREMIUM: 'Destaque',
      SUPER_PREMIUM: 'Super destaque',
      PREMIERE_1: 'Destaque Exclusivo',
      PREMIERE_2: 'Destaque Superior',
      TRIPLE: 'Destaque Triplo',
    };
    const STYLES: Record<string, string> = {
      PREMIUM: 'bg-primary text-white',
      SUPER_PREMIUM: 'bg-success text-white',
      PREMIERE_1: 'bg-warning text-white',
      PREMIERE_2: 'bg-warning text-white',
      TRIPLE: 'bg-accent text-white',
    };
    const label = LABELS[pub] || 'Destaque';
    const style = STYLES[pub] || 'bg-primary text-white';
    return (
      <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm', style)}>
        <Sparkles className="w-3 h-3" />
        <span>{label}</span>
      </div>
    );
  };

  return (
    <div
      role={onView ? 'button' : undefined}
      tabIndex={onView ? 0 : -1}
      onClick={() => onView && onView(property)}
      onKeyDown={e => {
        if (!onView) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onView(property);
        }
      }}
      className={cn(
        'group bg-surface rounded-xl border border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-soft-lg hover:-translate-y-1 cursor-pointer overflow-hidden',
        className
      )}
    >
      {/* Image with overlay */}
      <div className="aspect-video bg-background overflow-hidden relative">
        {imageLoading && (
          <div className="absolute inset-0 bg-border/50 animate-pulse"></div>
        )}
        <img
          src={imageSrc}
          alt={title}
          loading="lazy"
          decoding="async"
          className={cn(
            'w-full h-full object-cover transition-all duration-500 group-hover:scale-110 transform-gpu absolute inset-0',
            !imageLoading ? 'opacity-100' : 'opacity-0'
          )}
          style={{ willChange: 'transform, opacity' }}
        />
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Status badge floating on image */}
        <div className="absolute top-3 right-3 z-10">
          <StatusPill status={status} />
        </div>
        {/* Highlight badge floating on image */}
        <div className="absolute top-3 left-3 z-10">
          {getHighlightBadge()}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="mb-3">
          <h3 className="font-display font-semibold text-text-primary text-lg leading-tight group-hover:text-primary transition-colors antialiased line-clamp-1">
            {title}
          </h3>
        </div>

        <p className="text-sm text-text-secondary mt-2 line-clamp-2 h-[40px] leading-relaxed">
          {description || 'Sem descrição disponível.'}
        </p>

        <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between relative">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
            <span className="text-xs text-text-secondary font-medium">
              ID: {external_id}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation();
                  onView(property);
                }}
                className="p-2 h-auto"
                title="Ver detalhes"
              >
                <Eye className="h-4 w-4" />
                <span className="sr-only">Ver detalhes</span>
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation();
                  onEdit(property);
                }}
                className="p-2 h-auto"
                title="Editar"
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">Editar</span>
              </Button>
            )}
            {onSync && status !== 'synced' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation();
                  onSync(property);
                }}
                className="p-2 h-auto text-primary hover:text-primary"
                title="Sincronizar"
              >
                <Zap className="h-4 w-4" />
                <span className="sr-only">Sincronizar</span>
              </Button>
            )}

            {/* Refresh Manual movido para Cockpit (/refresh) */}

            {/* More menu */}
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation();
                  setMenuOpen(s => !s);
                }}
                className="p-2 h-auto"
                title="Mais ações"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Mais ações</span>
              </Button>

              {menuOpen && (
                <div
                  className="absolute right-0 bottom-full mb-2 w-44 bg-background border border-border rounded shadow-lg z-50 py-1"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={handleCopyId}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" /> Copiar ID
                  </button>
                  <button
                    onClick={handleDuplicate}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface flex items-center gap-2"
                  >
                    <FilePlus className="h-4 w-4" /> Duplicar
                  </button>
                  <button
                    onClick={handleOpenPortal}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" /> Abrir no portal
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {status === 'error' && property.error && (
          <p className="text-xs text-danger mt-2 p-2 bg-danger/10 rounded-md">
            {property.error}
          </p>
        )}
      </div>
    </div>
  );
};

export default PropertyCard;
