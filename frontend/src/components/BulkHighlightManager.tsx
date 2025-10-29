import React, { useState, useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Search, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { PublicationType } from '@/types/canalpro';
import { canalproService } from '@/services/canalpro.service';
import { toast } from 'sonner';

interface BulkHighlightManagerProps {
  typeLabels: Record<string, string>;
  validTypes: PublicationType[];
  onSuccess?: () => void;
}

export const BulkHighlightManager: React.FC<BulkHighlightManagerProps> = ({
  typeLabels,
  validTypes,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<PublicationType>('STANDARD');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'highlighted' | 'not_highlighted'>('all');
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const selectAllRef = useRef<HTMLInputElement>(null);

  // Carregar lista de imóveis
  const loadProperties = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const resp = await canalproService.getProperties();
      setProperties(resp?.properties || []);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar imóveis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProperties();
  }, []);

  // Atualiza estado indeterminado do checkbox "Selecionar todos"
  useEffect(() => {
    if (!selectAllRef.current) return;
    const indeterminate =
      selectedProperties.length > 0 &&
      selectedProperties.length < filteredProperties.length;
    selectAllRef.current.indeterminate = indeterminate;
  }, [selectedProperties, properties]);

  // Filtrar imóveis baseado no termo de busca e tipo de filtro
  const filteredProperties = properties.filter(prop => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = q
      ? (prop.title?.toLowerCase().includes(q) ||
         (prop.code ? String(prop.code).toLowerCase().includes(q) : false) ||
         (prop.external_id ? String(prop.external_id).toLowerCase().includes(q) : false) ||
         prop.address?.toLowerCase().includes(q))
      : true;

  const highlightValue = String(prop.highlight_type || '').trim().toUpperCase();
  const noHighlightValues = new Set(['', 'STANDARD', 'PADRAO', 'DEFAULT', 'NONE', 'SEM DESTAQUE']);
  const hasHighlight = !noHighlightValues.has(highlightValue);
    
    const matchesFilter = filterType === 'all'
      ? true
      : filterType === 'highlighted'
        ? hasHighlight
        : !hasHighlight;

    return matchesSearch && matchesFilter;
  });

  // Paginação
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
  const paginatedProperties = filteredProperties.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Resetar página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const selectedCount = selectedProperties.length;
  const filteredCount = filteredProperties.length;
  const totalCount = properties.length;

  // Atualiza estado indeterminado do checkbox "Selecionar todos"
  useEffect(() => {
    if (!selectAllRef.current) return;
    const currentPageIds = paginatedProperties.map(p => p.id);
    const selectedOnPage = currentPageIds.filter(id => selectedProperties.includes(id)).length;
    const indeterminate = selectedOnPage > 0 && selectedOnPage < currentPageIds.length;
    selectAllRef.current.indeterminate = indeterminate;
  }, [selectedProperties, paginatedProperties]);

  // Selecionar/deselecionar todos os imóveis da página atual
  const toggleSelectAll = () => {
    const currentPageIds = paginatedProperties.map(p => p.id);
    const allCurrentSelected = currentPageIds.every(id => selectedProperties.includes(id));
    
    if (allCurrentSelected) {
      // Remove todos da página atual
      setSelectedProperties(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      // Adiciona todos da página atual
      setSelectedProperties(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  // Aplicar destaque aos imóveis selecionados
  const handleApplyHighlights = async () => {
    if (selectedProperties.length === 0) {
      toast.error('Selecione pelo menos um imóvel');
      return;
    }

    const toastId = toast.loading(`Aplicando destaques em ${selectedProperties.length} imóve${selectedProperties.length === 1 ? 'l' : 'is'}...`);
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const propertyIds = selectedProperties.map(Number).filter(id => !isNaN(id));
      // 1) Atualiza o tipo de publicação no banco
      await canalproService.bulkUpdatePublicationType(propertyIds, selectedType);
      // 2) Exporta e ativa com o tipo atualizado
      const result = await canalproService.exportAndActivateProperties(propertyIds);
      
      if (result.export_stats.successful) {
        toast.success(`${result.export_stats.successful} imóveis atualizados com sucesso! 🎉`, {
          id: toastId,
          description: `Tipo de destaque: ${typeLabels[selectedType]}`,
          duration: 4000,
        });
        setMessage(`${result.export_stats.successful} imóveis atualizados com sucesso!`);
        void loadProperties();
        if (onSuccess) onSuccess();
      } else {
        toast.error('Nenhum imóvel foi atualizado', {
          id: toastId,
          description: 'Verifique os IDs e tente novamente.',
          duration: 5000,
        });
        setError('Nenhum imóvel foi atualizado. Verifique os IDs e tente novamente.');
      }

      if (result.export_stats.failed) {
        toast.warning(`${result.export_stats.failed} imóveis falharam`, {
          description: 'Verifique os logs para mais detalhes.',
          duration: 5000,
        });
        setError(`${result.export_stats.failed} imóveis falharam na atualização. Verifique os logs para mais detalhes.`);
      }
    } catch (err: any) {
      toast.error('Erro ao aplicar destaques', {
        id: toastId,
        description: err?.message || 'Tente novamente',
        duration: 6000,
      });
      setError(err?.message || 'Erro ao aplicar destaques');
    } finally {
      setLoading(false);
    }
  };

  // Remover destaque dos imóveis selecionados
  const handleRemoveHighlights = async () => {
    if (selectedProperties.length === 0) {
      toast.error('Selecione pelo menos um imóvel');
      return;
    }

    const toastId = toast.loading(`Removendo destaques de ${selectedProperties.length} imóve${selectedProperties.length === 1 ? 'l' : 'is'}...`);
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const propertyIds = selectedProperties.map(Number).filter(id => !isNaN(id));
      await canalproService.removeHighlights({ property_ids: propertyIds });
      toast.success('Destaques removidos com sucesso! ✨', {
        id: toastId,
        description: `${selectedProperties.length} imóve${selectedProperties.length === 1 ? 'l removido' : 'is removidos'}`,
        duration: 4000,
      });
      setMessage('Destaques removidos com sucesso');
      setSelectedProperties([]);
      void loadProperties();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error('Erro ao remover destaques', {
        id: toastId,
        description: err?.message || 'Tente novamente',
        duration: 6000,
      });
      setError(err?.message || 'Erro ao remover destaques');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="text-xl font-display font-bold text-brand-navy dark:text-brand-navy-lighter mb-1">
          Gestão de Destaques em Massa
        </h3>
        <p className="text-sm text-text-secondary">
          Selecione os imóveis e aplique ou remova destaques com segurança e rapidez.
        </p>
      </div>

      {/* Filtros e ações */}
      <div className="bg-surface/50 backdrop-blur-sm rounded-xl p-4 border border-border/50 space-y-3">
        {/* Linha de busca e filtro */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Input
              aria-label="Buscar imóveis"
              icon={<Search className="h-4 w-4" />}
              placeholder="Buscar por título, código (property_code/external_id) ou endereço..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-9 bg-background/60 backdrop-blur-sm text-sm"
            />
          </div>

          <select
            aria-label="Filtrar por status de destaque"
            className="h-9 px-3 rounded-lg border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
          >
            <option value="all">Todos</option>
            <option value="highlighted">Com destaque</option>
            <option value="not_highlighted">Sem destaque</option>
          </select>
        </div>

        {/* Info de resultados */}
        <div className="text-xs text-text-secondary text-center">
          {filteredCount !== totalCount ? `${filteredCount} de ${totalCount} imóveis` : `${totalCount} imóveis`}
        </div>

        {/* Linha de tipo e ações */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <select
            aria-label="Tipo de destaque a aplicar"
            className="h-9 px-3 rounded-lg border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            value={selectedType}
            onChange={e => setSelectedType(e.target.value as PublicationType)}
            disabled={loading}
          >
            {validTypes.map(type => (
              <option key={type} value={type}>
                {typeLabels[type] ?? type}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleApplyHighlights}
              disabled={loading || selectedProperties.length === 0}
              title={selectedProperties.length === 0 ? 'Selecione imóveis para aplicar destaque' : 'Aplicar destaque ao(s) selecionado(s)'}
              size="sm"
            >
              {loading ? 'Aplicando...' : 'Aplicar Destaque'}
            </Button>
            <Button
              variant="danger"
              onClick={handleRemoveHighlights}
              disabled={loading || selectedProperties.length === 0}
              title={selectedProperties.length === 0 ? 'Selecione imóveis para remover destaque' : 'Remover destaque do(s) selecionado(s)'}
              size="sm"            >
              Remover Destaque
            </Button>
          </div>
        </div>

        {/* Contador de seleção */}
        {selectedCount > 0 && (
          <div className="text-center text-xs px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary font-medium">
            {selectedCount} imóve{selectedCount === 1 ? 'l selecionado' : 'is selecionados'}
          </div>
        )}
      </div>

      {/* Lista de imóveis */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-background sticky top-0 z-10">
              <tr>
                <th className="p-3 text-left">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      ref={selectAllRef}
                      checked={(() => {
                        const currentPageIds = paginatedProperties.map(p => p.id);
                        return currentPageIds.length > 0 && currentPageIds.every(id => selectedProperties.includes(id));
                      })()}
                      onChange={toggleSelectAll}
                      disabled={loading}
                    />
                    <span className="text-sm font-medium text-text-primary">
                      Selecionar todos (página)
                    </span>
                  </label>
                </th>
                <th className="p-3 text-left text-sm font-medium text-text-primary">Código</th>
                <th className="p-3 text-left text-sm font-medium text-text-primary">Título</th>
                <th className="p-3 text-left text-sm font-medium text-text-primary">Endereço</th>
                <th className="p-3 text-left text-sm font-medium text-text-primary">Destaque Atual</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="border-t animate-pulse">
                  <td className="p-3"><div className="h-4 w-4 bg-surface rounded" /></td>
                  <td className="p-3"><div className="h-4 w-16 bg-surface rounded" /></td>
                  <td className="p-3"><div className="h-4 w-40 bg-surface rounded" /></td>
                  <td className="p-3"><div className="h-4 w-48 bg-surface rounded" /></td>
                  <td className="p-3"><div className="h-4 w-24 bg-surface rounded" /></td>
                </tr>
              ))}

              {!loading && paginatedProperties.map(property => (
                <tr key={property.id} className="border-t odd:bg-surface/50 hover:bg-surface transition-colors">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedProperties.includes(property.id)}
                      onChange={() => {
                        setSelectedProperties(prev =>
                          prev.includes(property.id)
                            ? prev.filter(id => id !== property.id)
                            : [...prev, property.id]
                        );
                      }}
                      disabled={loading}
                      aria-label={`Selecionar imóvel ${property.title || property.code || property.external_id || property.id}`}
                    />
                  </td>
                  <td className="p-3 text-sm">
                    <span className="inline-flex items-center px-2 py-1 rounded-lg bg-surface border border-border text-xs text-text-primary">
                      {property.code || property.external_id || '—'}
                    </span>
                  </td>
                  <td className="p-3 text-sm">
                    <div className="line-clamp-2 text-text-primary">{property.title}</div>
                  </td>
                  <td className="p-3 text-sm">
                    <div className="line-clamp-2 text-text-secondary">{property.address}</div>
                  </td>
                  <td className="p-3 text-sm">
                    {property.highlight_type ? (
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium">
                        {typeLabels[property.highlight_type] ?? property.highlight_type}
                      </span>
                    ) : (
                      <span className="text-text-disabled">—</span>
                    )}
                  </td>
                </tr>
              ))}

              {!loading && paginatedProperties.length === 0 && filteredProperties.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border text-text-secondary">
                      <Search className="h-4 w-4" />
                      <span>Nenhum imóvel encontrado com os filtros atuais.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {!loading && filteredProperties.length > 0 && (
          <div className="mt-4 flex items-center justify-between px-4 py-3 bg-surface/50 rounded-lg border border-border">
            <div className="text-sm text-text-secondary">
              Exibindo{' '}
              <span className="font-medium text-text-primary">
                {((currentPage - 1) * itemsPerPage) + 1}
              </span>
              {' '}-{' '}
              <span className="font-medium text-text-primary">
                {Math.min(currentPage * itemsPerPage, filteredProperties.length)}
              </span>
              {' '}de{' '}
              <span className="font-medium text-text-primary">{filteredProperties.length}</span>
              {' '}imóveis
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-3 py-1 bg-background rounded border border-border">
                Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm">{message}</span>
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger flex items-center gap-2" role="alert">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
};