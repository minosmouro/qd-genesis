import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, RefreshCw, Trash2, Home, Sparkles } from 'lucide-react';
import { Property } from '@/types';
import type { PaginatedResponse } from '@/types';
import { propertiesService } from '@/services/properties.service';
import { usePagination } from '@/hooks/usePagination';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { useDeleteProperty } from '@/hooks/useDeleteProperty';
import Button from '@/components/ui/Button';
import PropertyList from '@/components/PropertyList/PropertyList';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import CockpitBar from '@/components/CockpitBar';
import { SkeletonList } from '@/components/ui/Skeleton';
import IllustratedEmptyState from '@/components/EmptyState/IllustratedEmptyState';
import DeletePropertyModal from '@/components/modals/DeletePropertyModal';
import toast from 'react-hot-toast';
import { useProperties } from '@/modules/properties/PropertiesContext';
import { useExportAndActivateContext } from '@/contexts/ExportAndActivateContext';

// Importar componentes do Canal Pro
import CanalProExportModal from '@/components/CanalProExportModal';
import CanalProExportButton from '@/components/CanalProExportButton';
import CanalProExportAndActivateButton from '@/components/CanalProExportAndActivateButton';
import CanalProExportAndActivateModal from '@/components/CanalProExportAndActivateModal';

const PropertiesPageContent: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Usar contexto do módulo para estados compartilhados
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    selectedIds,
    setSelectedIds,
  } = useProperties();

  // Estado local para filtro de tipo de imóvel
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('');

  const { isModalOpen, setIsModalOpen } = useExportAndActivateContext();

  const [showImportModal, setShowImportModal] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Estado para modal de exportação Canal Pro
  const [showExportModal, setShowExportModal] = useState(false);

  // Estado para modal de exclusão
  const [propertiesToDelete, setPropertiesToDelete] = useState<Property[]>([]);
  const deleteHook = useDeleteProperty();

  // Estados para ordenação
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    debouncedSearchTerm,
  } = useDebouncedSearch({
    controlledValue: searchTerm,
  });
  const {
    currentPage,
    totalPages,
    pageSize,
    goToPage,
    setPageSize,
    setTotalItems,
  } = usePagination({ initialPageSize: 12 });

  // fetch counts for KPIs from properties stats endpoint
  const { data: statsData } = useQuery<
    {
      total: number;
      imported: number;
      pending: number;
      synced: number;
      error: number;
    },
    Error
  >({
    queryKey: ['properties', 'stats'],
    queryFn: () => propertiesService.getStats(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const {
    data: propertiesData,
    error,
    refetch,
  } = useQuery<
    PaginatedResponse<Property>,
    Error,
    PaginatedResponse<Property>,
    (string | number)[]
  >({
    queryKey: [
      'properties',
      currentPage,
      pageSize,
      debouncedSearchTerm,
      statusFilter,
      propertyTypeFilter,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      propertiesService.list({
        page: currentPage,
        page_size: pageSize,
        q: debouncedSearchTerm || undefined,
        status: (statusFilter as Property['status']) || undefined,
        property_type: propertyTypeFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        include_shared: true, // ✅ Incluir imóveis compartilhados via parcerias
      }),
    placeholderData: previousData =>
      previousData as PaginatedResponse<Property> | undefined,
    // Keep previous page data while fetching new page to avoid flashing and extra renders
    // Note: some react-query type versions don't include `keepPreviousData` in the options type;
    // placeholderData already helps avoid visual flicker, so we omit the typed option to keep TS happy
    staleTime: 5 * 60 * 1000,
    // Don't refetch automatically on window focus or reconnect (reduces noisy requests)
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const importMutation = useMutation({
    mutationFn: () =>
      propertiesService.importFromGandalf({ filter: { status: 'active' } }),
    onSuccess: (data: any) => {
      setImportResult(data);
      toast.success(
        `Importação concluída! ${data.inserted} novos, ${data.updated} atualizados.`
      );
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
    onError: (err: any) =>
      toast.error(err.message || 'Erro ao importar propriedades'),
  });

  const bulkSyncMutation = useMutation({
    mutationFn: (ids: number[]) => propertiesService.bulkSync(ids),
    onSuccess: (data: any) => {
      toast.success(
        `Sincronização em lote concluída! ${data.synced} sincronizados.`
      );
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
    onError: (err: any) =>
      toast.error(err.message || 'Erro ao sincronizar propriedades'),
  });

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    
    // Buscar os imóveis selecionados dos dados atuais
    const properties = propertiesData?.data?.filter((p: Property) => 
      selectedIds.includes(Number(p.id))
    ) || [];
    
    setPropertiesToDelete(properties);
    deleteHook.openModal();
  };

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  // Handler para deletar um único imóvel
  const handleDeleteSingle = (propertyId: number) => {
    const property = propertiesData?.data?.find((p: Property) => Number(p.id) === propertyId);
    if (property) {
      setPropertiesToDelete([property]);
      deleteHook.openModal();
    }
  };

  // Novo: seleciona todos os resultados da busca (across pages)
  const handleSelectAllResults = async () => {
    const total = Number(propertiesData?.total || 0);
    if (total <= 0) return;

    try {
      // buscar todos com page_size = total (retorna todos os items atuais do filtro)
      const all = await propertiesService.list({
        page: 1,
        page_size: total,
        q: debouncedSearchTerm || undefined,
        status: (statusFilter as Property['status']) || undefined,
        property_type: propertyTypeFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const ids = (all.data || []).map(p => Number(p.id));
      setSelectedIds(ids);
      toast.success(`Selecionadas ${ids.length} propriedades.`);
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao selecionar todos os resultados');
    }
  };

  // sync pagination total when data arrives (useEffect to avoid re-render loop)
  useEffect(() => {
    if (propertiesData && typeof setTotalItems === 'function') {
      // only update when total is a number
      const total = Number(propertiesData.total || 0);
      setTotalItems(total);
    }
  }, [propertiesData?.total, setTotalItems]);

  const isLoading = !propertiesData && !error;
  const isEmpty = propertiesData && Array.isArray(propertiesData.data) && propertiesData.data.length === 0;
  const hasSearchOrFilter = debouncedSearchTerm || statusFilter;

  if (error) {
    return (
      <>
        <CockpitBar
          total={statsData?.total || 0}
          counts={{
            imported: statsData?.imported || 0,
            pending: statsData?.pending || 0,
            synced: statsData?.synced || 0,
            error: statsData?.error || 0,
          }}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onNewClick={() => navigate('/properties/new')}
          statusFilter={statusFilter}
          setStatusFilter={v => setStatusFilter(v)}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <IllustratedEmptyState
            icon={AlertCircle}
            title="Erro ao carregar propriedades"
            description={error.message || 'Ocorreu um erro ao buscar as propriedades. Tente novamente.'}
            actionLabel="Tentar Novamente"
            onAction={() => refetch()}
            variant="default"
          />
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <CockpitBar
        total={statsData?.total || 0}
        counts={{
          imported: statsData?.imported || 0,
          pending: statsData?.pending || 0,
          synced: statsData?.synced || 0,
          error: statsData?.error || 0,
        }}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onNewClick={() => navigate('/properties/new')}
        statusFilter={statusFilter}
        setStatusFilter={v => setStatusFilter(v)}
        propertyTypeFilter={propertyTypeFilter}
        setPropertyTypeFilter={v => setPropertyTypeFilter(v)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />
      {/* Spacer removido: CockpitBar agora atualiza --cockpit-height dinamicamente via ResizeObserver */}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4 animate-fade-in">
          <SkeletonList count={6} />
        </div>
      )}

      {/* Empty State - No properties at all */}
      {isEmpty && !hasSearchOrFilter && !isLoading && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <IllustratedEmptyState
            icon={Home}
            title="Nenhum imóvel cadastrado"
            description="Comece adicionando seu primeiro imóvel ou importe do Canal Pro para começar a gerenciar seu portfólio."
            actionLabel="Adicionar Primeiro Imóvel"
            onAction={() => navigate('/properties/new')}
            variant="default"
          />
        </div>
      )}

      {/* Empty State - No results for search/filter */}
      {isEmpty && hasSearchOrFilter && !isLoading && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <IllustratedEmptyState
            icon={AlertCircle}
            title="Nenhum resultado encontrado"
            description={`Não encontramos imóveis que correspondam aos filtros aplicados. Tente ajustar sua busca ou filtros.`}
            actionLabel="Limpar Filtros"
            onAction={() => {
              setSearchTerm('');
              setStatusFilter('');
              setPropertyTypeFilter('');
            }}
          />
        </div>
      )}

      {/* Barra de ações em massa - renderizada no conteúdo principal (alinhada ao container) */}
      {selectedIds.length > 0 && !isLoading && (
        <div className="bg-brand-yellow/10 dark:bg-brand-yellow-light/10 border border-brand-yellow/30 dark:border-brand-yellow-light/30 rounded-xl p-5 animate-fade-in-up shadow-soft backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-[1200px] mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-primary">
                {selectedIds.length} propriedade{selectedIds.length !== 1 ? 's' : ''} selecionada{selectedIds.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkSyncMutation.mutate(selectedIds as number[])}
                loading={bulkSyncMutation.isPending}
                icon={<RefreshCw className="h-4 w-4" />}
              >
                Sincronizar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleBulkDelete}
                loading={deleteHook.isLoading}
                icon={<Trash2 className="h-4 w-4" />}
              >
                Excluir
              </Button>
              <CanalProExportButton
                variant="primary"
                size="sm"
                propertyIds={selectedIds.map(id => Number(id))}
                onSuccess={() => {
                  setSelectedIds([]);
                  toast.success('Exportação iniciada!');
                }}
              />
              <CanalProExportAndActivateButton
                variant="primary"
                size="sm"
                propertyIds={selectedIds.map(id => Number(id))}
                onSuccess={() => {
                  setSelectedIds([]);
                  toast.success('Exportação + Ativação concluída!');
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedIds([])}
                className="hover:bg-primary/10"
              >
                Limpar Seleção
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Property List */}
      {!isLoading && !isEmpty && (
        <div className="space-y-4 animate-fade-in">
          <PropertyList
            data={propertiesData?.data || []}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onOpenDetail={(id: number) => navigate(`/properties/${id}/view`)}
            onEdit={(id: number) => navigate(`/properties/${id}/edit`)}
            onDelete={handleDeleteSingle}
            totalCount={propertiesData?.total}
            onSelectAllResults={handleSelectAllResults}
          />
          {propertiesData && propertiesData.total > 0 && (
            <div className="fixed bottom-[env(safe-area-inset-bottom,40px)] left-0 right-0 md:left-64 bg-surface/95 backdrop-blur-xl border-t border-border/50 py-4 px-4 z-20 shadow-soft">
              <div className="max-w-[1200px] mx-auto">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={propertiesData.total}
                  pageSize={pageSize}
                  onPageChange={goToPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Importar do Canal Pro"
        size="lg"
      >
        <div className="space-y-4">
          <p>
            Esta ação irá buscar e atualizar todas as propriedades do seu Canal
            Pro para o CRM. Propriedades já existentes serão atualizadas com
            base no ID externo.
          </p>
          {importResult && (
            <div className="bg-background p-4 rounded-lg border border-border">
              <h4 className="font-semibold text-text-primary mb-2">
                Resultado da Importação:
              </h4>
              <div className="space-y-1 text-sm">
                <p>
                  •{' '}
                  <span className="font-medium text-text-primary">
                    {importResult.inserted}
                  </span>{' '}
                  novos imóveis inseridos.
                </p>
                <p>
                  •{' '}
                  <span className="font-medium text-text-primary">
                    {importResult.updated}
                  </span>{' '}
                  imóveis existentes atualizados.
                </p>
                <p>
                  •{' '}
                  <span className="text-text-secondary">
                    {importResult.skipped}
                  </span>{' '}
                  imóveis ignorados (sem alterações).
                </p>
                <p>
                  •{' '}
                  <span className="font-medium text-text-primary">
                    {importResult.total_listings}
                  </span>{' '}
                  total de imóveis no portal.
                </p>
                {importResult.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium text-danger">
                      Erros encontrados:
                    </p>
                    <ul className="list-disc list-inside text-danger/80 text-xs mt-1">
                      {importResult.errors.map(
                        (error: string, index: number) => (
                          <li key={index}>{error}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowImportModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => importMutation.mutate()}
              loading={importMutation.isPending}
            >
              {importMutation.isPending
                ? 'Importando...'
                : 'Iniciar Importação'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Exportação para Canal Pro */}
      <CanalProExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        propertyIds={
          selectedIds.length > 0 ? selectedIds.map(id => Number(id)) : undefined
        }
      />

      {/* Modal de Exportação + Ativação para Canal Pro */}
      <CanalProExportAndActivateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Modal de Exclusão Inteligente */}
      <DeletePropertyModal
        isOpen={deleteHook.isModalOpen}
        onClose={() => {
          deleteHook.closeModal();
          setPropertiesToDelete([]);
        }}
        properties={propertiesToDelete}
        onConfirm={(type, reason, notes) => {
          deleteHook.deleteProperty({
            propertyIds: propertiesToDelete.map(p => Number(p.id)),
            type,
            reason,
            notes
          });
          setSelectedIds([]);
        }}
        isLoading={deleteHook.isLoading}
      />
    </div>
  );
};

const PropertiesPage: React.FC = () => {
  return <PropertiesPageContent />;
};

export default PropertiesPage;
