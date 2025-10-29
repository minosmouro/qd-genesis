import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Building2,
  Users,
  AlertCircle,
  RefreshCw,
  Plus,
  Search,
  Calendar,
  Pencil,
  Trash2,
  Ban,
  CheckCircle2,
  Eye,
  ChevronRight,
  Filter,
  X,
  UserCircle,
  Building
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu'
import { useTenantsData } from '@/hooks/useTenantsData'
import { apiService, ApiError } from '@/services/api'
import { Tenant } from '@/types'
import { TenantManagementDialog, TenantFormValues } from './components/TenantManagementDialog'
import { TenantCreateDialog, TenantCreateFormValues } from './components/TenantCreateDialog'

export function TenantsPage() {
  const navigate = useNavigate()
  const { tenants, stats, isLoading, error, refetch } = useTenantsData()
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [processingTenantId, setProcessingTenantId] = useState<number | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreatingTenant, setIsCreatingTenant] = useState(false)
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'PF' | 'PJ'>('all')

  const resolveErrorMessage = (err: unknown, fallback: string) => {
    if (err instanceof ApiError) {
      if (typeof err.payload === 'string') {
        return err.payload
      }

      if (err.payload && typeof err.payload === 'object') {
        const payload = err.payload as Record<string, unknown>
        const detailed = payload.error || payload.message
        if (typeof detailed === 'string' && detailed.trim().length > 0) {
          return detailed
        }
      }

      if (err.message) {
        return err.message
      }
    }

    if (err instanceof Error && err.message) {
      return err.message
    }

    return fallback
  }

  const handleCreateTenant = async (values: TenantCreateFormValues) => {
    try {
      setIsCreatingTenant(true)
      await apiService.createTenant(values)
      toast.success('Imobiliária criada com sucesso')
      setIsCreateDialogOpen(false)
      refetch()
    } catch (err) {
      console.error('Erro ao criar imobiliária', err)
      toast.error(resolveErrorMessage(err, 'Não foi possível criar a imobiliária'))
    } finally {
      setIsCreatingTenant(false)
    }
  }

  const openEditDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setSelectedTenant(null)
  }

  const handleSubmitTenant = async (values: TenantFormValues) => {
    if (!selectedTenant) return
    try {
      setIsSubmitting(true)
      await apiService.updateTenant(selectedTenant.id, values)
      toast.success('Tenant atualizado com sucesso')
      closeDialog()
      await refetch()
    } catch (err) {
      console.error('Erro ao atualizar tenant', err)
      toast.error(resolveErrorMessage(err, 'Não foi possível atualizar o tenant'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (tenant: Tenant) => {
    if (tenant.is_master) {
      toast.error('Não é possível alterar o status da imobiliária principal')
      return
    }

    const nextStatus = !(tenant.is_active ?? true)
    const confirmationMessage = nextStatus
      ? `Deseja reativar ${tenant.name}?`
      : `Deseja desativar ${tenant.name}?`

    if (!window.confirm(confirmationMessage)) {
      return
    }

    try {
      setProcessingTenantId(tenant.id)
      await apiService.updateTenantStatus(tenant.id, nextStatus)
      toast.success(nextStatus ? 'Tenant reativado com sucesso' : 'Tenant desativado com sucesso')
      await refetch()
    } catch (err) {
      console.error('Erro ao alterar status do tenant', err)
      toast.error(resolveErrorMessage(err, 'Não foi possível alterar o status do tenant'))
    } finally {
      setProcessingTenantId(null)
    }
  }

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (tenant.is_master) {
      toast.error('Não é possível remover o tenant principal')
      return
    }

    const usersCount = tenant.users_count ?? 0
    const propertiesCount = tenant.properties_count ?? 0

    if (usersCount > 0 || propertiesCount > 0) {
      toast.error(
        `Não é possível remover ${tenant.name}. Existem ${usersCount} usuário(s) e ${propertiesCount} imóvel(is) associados.`
      )
      return
    }

    if (!window.confirm(`Tem certeza que deseja excluir ${tenant.name}? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      setProcessingTenantId(tenant.id)
      await apiService.deleteTenant(tenant.id)
      toast.success('Tenant removido com sucesso')
      await refetch()
    } catch (err) {
      console.error('Erro ao excluir tenant', err)
      toast.error(
        resolveErrorMessage(
          err,
          'Não foi possível remover o tenant. Verifique se não há dados associados.'
        )
      )
    } finally {
      setProcessingTenantId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-green-100 text-green-800'
      case 'inativo':
        return 'bg-gray-100 text-gray-800'
      case 'suspenso':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Filtragem de tenants
  const filteredTenants = tenants.filter(tenant => {
    // Filtro de busca (nome ou email)
    const matchesSearch = searchTerm === '' || 
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant.email && tenant.email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    // Filtro de status
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && tenant.is_active) ||
      (statusFilter === 'inactive' && !tenant.is_active)
    
    // Filtro de tipo
    const matchesType = typeFilter === 'all' || tenant.tenant_type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  // Estatísticas dos filtros
  const activeCount = tenants.filter(t => t.is_active).length
  const inactiveCount = tenants.filter(t => !t.is_active).length
  const pfCount = tenants.filter(t => t.tenant_type === 'PF').length
  const pjCount = tenants.filter(t => t.tenant_type === 'PJ').length

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setTypeFilter('all')
  }

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || typeFilter !== 'all'

  // Tratamento de erro
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Erro ao Carregar Tenants
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={refetch} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Gestão de Tenants
          </h1>
          <p className="text-lg text-muted-foreground">
            Gerencie todas as empresas da plataforma SaaS
          </p>
        </div>
        <Button
          className="flex items-center gap-2"
          onClick={() => setIsCreateDialogOpen(true)}
          disabled={isCreatingTenant}
        >
          <Plus className="h-4 w-4" />
          Novo Tenant
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total de Tenants
                </p>
                <p className="text-3xl font-bold">
                  {isLoading ? '...' : stats.total}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-brand-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Ativos
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {isLoading ? '...' : stats.active}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Inativos
                </p>
                <p className="text-3xl font-bold text-gray-600">
                  {isLoading ? '...' : stats.inactive}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Suspensos
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {isLoading ? '...' : stats.suspended}
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="active">Ativos ({activeCount})</SelectItem>
                  <SelectItem value="inactive">Inativos ({inactiveCount})</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(value: 'all' | 'PF' | 'PJ') => setTypeFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="PF">Pessoa Física ({pfCount})</SelectItem>
                  <SelectItem value="PJ">Imobiliária ({pjCount})</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>

            {hasActiveFilters && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Filter className="h-4 w-4" />
                <span>
                  Mostrando {filteredTenants.length} de {tenants.length} tenants
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {filteredTenants.length === 0 && hasActiveFilters ? 'Nenhum resultado encontrado' : 'Lista de Tenants'}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={refetch} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-20 h-6 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">
                {hasActiveFilters 
                  ? 'Nenhum tenant corresponde aos filtros selecionados' 
                  : 'Nenhum tenant cadastrado'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Limpar Filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTenants.map((tenant) => {
                const isProcessing = processingTenantId === tenant.id
                const usersCount = tenant.users_count ?? 0
                const propertiesCount = tenant.properties_count ?? 0
                const hasAssociations = usersCount > 0 || propertiesCount > 0
                const actionsDisabled = tenant.is_master || isProcessing
                const deleteDisabled = actionsDisabled || hasAssociations

                return (
                  <div
                    key={tenant.id}
                    className="group relative flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-brand-purple-300 hover:bg-brand-purple-50/50 transition-all cursor-pointer"
                    onClick={() => navigate(`/tenants/${tenant.id}`)}
                    title="Clique para ver detalhes do tenant"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-brand-purple-100 rounded-lg flex items-center justify-center group-hover:bg-brand-purple-200 transition-colors">
                        <Building2 className="h-6 w-6 text-brand-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-brand-purple-700 transition-colors">
                          {tenant.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                          {tenant.email && <span>{tenant.email}</span>}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(tenant.created_at)}
                          </span>
                          {tenant.city && tenant.state && (
                            <span>
                              {tenant.city}/{tenant.state}
                            </span>
                          )}
                          <span>
                            Usuários: {tenant.users_count ?? 0} • Imóveis: {tenant.properties_count ?? 0}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          ID: {tenant.tenant_id}
                          {tenant.db_name ? ` • DB: ${tenant.db_name}` : ''}
                        </p>
                      </div>
                    </div>

                    <div 
                      className="flex items-center space-x-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Badge variant={tenant.tenant_type === 'PF' ? 'secondary' : 'default'} className="gap-1">
                        {tenant.tenant_type === 'PF' ? (
                          <>
                            <UserCircle className="h-3 w-3" />
                            Corretor
                          </>
                        ) : (
                          <>
                            <Building className="h-3 w-3" />
                            Imobiliária
                          </>
                        )}
                      </Badge>
                      <Badge className={getStatusBadge(tenant.status)}>{tenant.status}</Badge>
                      
                      {/* Indicador visual de clique */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="h-5 w-5 text-brand-purple-600" />
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" disabled={isProcessing}>
                            Gerenciar
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[180px]">
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault()
                              navigate(`/tenants/${tenant.id}`)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={tenant.is_master}
                            onSelect={(event) => {
                              event.preventDefault()
                              if (tenant.is_master) {
                                toast.error('Não é possível editar a imobiliária principal')
                                return
                              }
                              openEditDialog(tenant)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar tenant
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={actionsDisabled}
                            onSelect={(event) => {
                              event.preventDefault()
                              handleToggleStatus(tenant)
                            }}
                          >
                            {tenant.is_active ? (
                              <Ban className="h-4 w-4 text-amber-600" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                            {tenant.is_active ? 'Desativar' : 'Reativar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            disabled={deleteDisabled}
                            title={hasAssociations ? 'Existem dados vinculados a este tenant.' : undefined}
                            onSelect={(event) => {
                              event.preventDefault()
                              handleDeleteTenant(tenant)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir tenant
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}

              {tenants.length === 0 && (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhum tenant encontrado
                  </h3>
                  <p className="text-gray-600">
                    Comece criando o primeiro tenant da plataforma.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <TenantManagementDialog
        tenant={selectedTenant}
        open={isDialogOpen}
        submitting={isSubmitting}
        onClose={closeDialog}
        onSubmit={handleSubmitTenant}
      />
      <TenantCreateDialog
        open={isCreateDialogOpen}
        submitting={isCreatingTenant}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateTenant}
      />
    </div>
  )
}