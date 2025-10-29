import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Plus, 
  Check, 
  X, 
  AlertCircle, 
  Info,
  Building2,
  TrendingUp,
  Clock
} from 'lucide-react';
import { partnershipsService } from '@/services/partnerships.service';
import { TenantPartnership, PartnershipStatus } from '@/types/partnership';
import Button from '@/components/ui/Button';
import CreatePartnershipModal from '@/components/partnerships/CreatePartnershipModal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PartnershipsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<'active' | 'pending'>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Query para listar parcerias
  const { data: partnershipsData, isLoading, error } = useQuery({
    queryKey: ['partnerships'],
    queryFn: () => partnershipsService.listPartnerships(),
  });

  // Mutation para aceitar parceria
  const acceptMutation = useMutation({
    mutationFn: (partnershipId: number) => 
      partnershipsService.acceptPartnership(partnershipId),
    onSuccess: () => {
      toast.success('Parceria aceita com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao aceitar parceria');
    },
  });

  // Mutation para rejeitar parceria (DELETE)
  const rejectMutation = useMutation({
    mutationFn: (partnershipId: number) => 
      partnershipsService.rejectPartnership(partnershipId),
    onSuccess: () => {
      toast.success('Parceria rejeitada');
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao rejeitar parceria');
    },
  });

  // Filtrar parcerias
  const partnerships = partnershipsData?.partnerships || [];
  
  const activePartnerships = partnerships.filter(
    (p: TenantPartnership) => p.status === 'active'
  );
  
  const pendingPartnerships = partnerships.filter(
    (p: TenantPartnership) => p.status === 'pending'
  );

  const getStatusBadge = (status: PartnershipStatus) => {
    const badges: Record<PartnershipStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    const labels: Record<PartnershipStatus, string> = {
      pending: 'Pendente',
      active: 'Ativa',
      rejected: 'Rejeitada',
      cancelled: 'Cancelada',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Data não disponível';
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-gray-600">Erro ao carregar parcerias</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              Parcerias
            </h1>
            <p className="mt-2 text-gray-600">
              Gerencie suas parcerias e compartilhamento de imóveis
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nova Parceria
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Parcerias Ativas</p>
                <p className="text-2xl font-bold text-gray-900">{activePartnerships.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">{pendingPartnerships.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{partnerships?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedTab('active')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${selectedTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Parcerias Ativas
            <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
              {activePartnerships.length}
            </span>
          </button>
          <button
            onClick={() => setSelectedTab('pending')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${selectedTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Solicitações Pendentes
            <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
              {pendingPartnerships.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {selectedTab === 'active' && (
          <>
            {activePartnerships.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma parceria ativa
                </h3>
                <p className="text-gray-600 mb-6">
                  Crie uma nova parceria para começar a compartilhar imóveis
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-5 w-5 mr-2" />
                  Criar Primeira Parceria
                </Button>
              </div>
            ) : (
              activePartnerships.map((partnership: TenantPartnership) => (
                <div
                  key={partnership.id}
                  className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Tenant #{partnership.partner_tenant_id}
                        </h3>
                        {getStatusBadge(partnership.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>Comissão: <strong>{partnership.commission_percentage}%</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>Criada em: {formatDate(partnership.created_at)}</span>
                        </div>
                      </div>

                      {partnership.notes && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600 flex items-start gap-2">
                            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {partnership.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {selectedTab === 'pending' && (
          <>
            {pendingPartnerships.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma solicitação pendente
                </h3>
                <p className="text-gray-600">
                  Você não possui solicitações de parceria aguardando aprovação
                </p>
              </div>
            ) : (
              pendingPartnerships.map((partnership: TenantPartnership) => (
                <div
                  key={partnership.id}
                  className="bg-white rounded-lg shadow border border-yellow-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Tenant #{partnership.partner_tenant_id}
                        </h3>
                        {getStatusBadge(partnership.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>Comissão proposta: <strong>{partnership.commission_percentage}%</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>Solicitada em: {formatDate(partnership.created_at)}</span>
                        </div>
                      </div>

                      {partnership.notes && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600 flex items-start gap-2">
                            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {partnership.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Ações para parcerias recebidas (onde sou o partner_tenant) */}
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => acceptMutation.mutate(partnership.id)}
                        disabled={acceptMutation.isPending}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4" />
                        Aceitar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => rejectMutation.mutate(partnership.id)}
                        disabled={rejectMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Modal de criar parceria */}
      <CreatePartnershipModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};

export default PartnershipsPage;
