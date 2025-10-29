import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Building2, 
  Users, 
  BarChart3, 
  TrendingUp, 
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Shield,
  Activity,
  KeyRound,
  Pencil,
  DollarSign,
  MoreVertical,
  Ban,
  Trash2,
  RefreshCw,
  AlertTriangle,
  FileText,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { apiService } from '@/services/api'
import { TenantDetail, TenantUser, TenantStats, TenantTokenStatus, TenantTokenStatusItem, PropertyStatusSummaryItem } from '@/types'
import { toast } from 'sonner'
import { ChangePasswordDialog } from './components/ChangePasswordDialog'

type TabType = 'overview' | 'users' | 'stats' | 'quotas'

const STATUS_CARD_STYLES: Record<string, string> = {
  published: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-700',
  pipeline: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-700',
  problem: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-700',
  other: 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-700',
}

export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [users, setUsers] = useState<TenantUser[]>([])
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tokenStatus, setTokenStatus] = useState<TenantTokenStatus | null>(null)
  const [tokenStatusLoading, setTokenStatusLoading] = useState(true)

  const handleToggleStatus = async () => {
    if (!tenant) return
    
    const action = tenant.is_active ? 'desativar' : 'ativar'
    if (!window.confirm(`Tem certeza que deseja ${action} este tenant?`)) return

    try {
      await apiService.updateTenant(parseInt(id!), { is_active: !tenant.is_active })
      toast.success(`Tenant ${action}do com sucesso!`)
      loadTenantData()
    } catch (error) {
      toast.error(`Erro ao ${action} tenant`)
    }
  }

  const handleRefresh = () => {
    loadTenantData()
    loadTokenStatus()
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'stats') loadStats()
    toast.success('Dados atualizados!')
  }

  useEffect(() => {
    loadTenantData()
    loadTokenStatus()
  }, [id])

  const loadTenantData = async () => {
    if (!id) return

    try {
      setLoading(true)
      const tenantData = await apiService.getTenantDetail(parseInt(id))
      setTenant(tenantData)
    } catch (error) {
      console.error('Erro ao carregar tenant:', error)
      toast.error('Erro ao carregar detalhes do tenant')
    } finally {
      setLoading(false)
    }
  }

  const loadTokenStatus = async () => {
    if (!id) return

    try {
      setTokenStatusLoading(true)
      const status = await apiService.getTenantTokenStatus(parseInt(id))
      setTokenStatus(status)
    } catch (error) {
      console.error('Erro ao carregar status do token:', error)
      setTokenStatus(null)
      toast.error('Erro ao carregar status do token CanalPro')
    } finally {
      setTokenStatusLoading(false)
    }
  }

  const loadUsers = async () => {
    if (!id) return

    try {
      const response = await apiService.getTenantUsers(parseInt(id))
      setUsers(response.users)
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      toast.error('Erro ao carregar usuários')
    }
  }

  const loadStats = async () => {
    if (!id) return

    try {
      const statsData = await apiService.getTenantStats(parseInt(id))
      setStats(statsData)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      toast.error('Erro ao carregar estatísticas')
    }
  }

  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) {
      loadUsers()
    }
    if (activeTab === 'stats' && !stats) {
      loadStats()
    }
  }, [activeTab])

  if (loading || !tenant) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando detalhes do tenant...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Informações Gerais', icon: Building2 },
    { id: 'users' as TabType, label: 'Usuários', icon: Users },
    { id: 'stats' as TabType, label: 'Estatísticas', icon: BarChart3 },
    { id: 'quotas' as TabType, label: 'Quotas e Limites', icon: TrendingUp },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/tenants')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
            <p className="text-sm text-gray-500">
              {tenant.tenant_type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'} • 
              ID: {tenant.tenant_id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            tenant.is_active 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {tenant.is_active ? 'Ativo' : 'Inativo'}
          </span>

          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>

          <Button variant="outline" size="sm" className="gap-2">
            <Pencil className="w-4 h-4" />
            Editar
          </Button>

          <Button variant="outline" size="sm" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Atribuir Plano
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleToggleStatus}>
                {tenant.is_active ? (
                  <>
                    <Ban className="w-4 h-4 mr-2" />
                    Desativar Tenant
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Ativar Tenant
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="w-4 h-4 mr-2" />
                Ver Logs de Auditoria
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Deletar Tenant
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-4 px-1 border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'overview' && (
          <OverviewTab
            tenant={tenant}
            tokenStatus={tokenStatus}
            tokenLoading={tokenStatusLoading}
          />
        )}
        {activeTab === 'users' && <UsersTab users={users} loading={users.length === 0} />}
        {activeTab === 'stats' && <StatsTab stats={stats} loading={!stats} />}
        {activeTab === 'quotas' && <QuotasTab tenant={tenant} />}
      </div>
    </div>
  )
}

function OverviewTab({
  tenant,
  tokenStatus,
  tokenLoading,
}: {
  tenant: TenantDetail
  tokenStatus: TenantTokenStatus | null
  tokenLoading: boolean
}) {
  const infoItems = [
    { icon: Mail, label: 'Email', value: tenant.email || 'Não informado' },
    { icon: Phone, label: 'Telefone', value: tenant.phone || 'Não informado' },
    { icon: MapPin, label: 'Cidade/Estado', value: tenant.city && tenant.state ? `${tenant.city}, ${tenant.state}` : 'Não informado' },
    { icon: Calendar, label: 'Data de Criação', value: tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('pt-BR') : 'Não informado' },
  ]

  const statusInfoMap: Record<
    TenantTokenStatusItem['status'] | 'unknown',
    { label: string; badge: string; description: string }
  > = {
    active: {
      label: 'Token ativo',
      badge: 'bg-green-100 text-green-700',
      description: 'Token válido e monitoramento automático funcionando.',
    },
    expiring_soon: {
      label: 'Expirando em breve',
      badge: 'bg-yellow-100 text-yellow-700',
      description: 'Token válido, mas expira nas próximas horas. Avalie a renovação.',
    },
    expired: {
      label: 'Token expirado',
      badge: 'bg-red-100 text-red-700',
      description: 'Token expirado. A integração CanalPro está inativa até uma nova renovação.',
    },
    unknown: {
      label: 'Status indisponível',
      badge: 'bg-gray-100 text-gray-600',
      description: 'Não foi possível determinar o status atual do token.',
    },
  }

  const getStatusInfo = (status?: TenantTokenStatusItem['status']) =>
    statusInfoMap[status ?? 'unknown']

  const formatDateTime = (value?: string | null) => {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const formatRelativeTime = (value?: string | null) => {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null

    const diffMs = date.getTime() - Date.now()
    const diffMinutes = Math.round(diffMs / 60000)
    if (!Number.isFinite(diffMinutes)) return null

    const absMinutes = Math.abs(diffMinutes)

    if (absMinutes >= 1440) {
      const days = Math.round(diffMinutes / 1440)
      return days >= 0 ? `em ${days} dia(s)` : `há ${Math.abs(days)} dia(s)`
    }

    if (absMinutes >= 60) {
      const hours = Math.round(diffMinutes / 60)
      return hours >= 0 ? `em ${hours} hora(s)` : `há ${Math.abs(hours)} hora(s)`
    }

    return diffMinutes >= 0 ? `em ${diffMinutes} minuto(s)` : `há ${Math.abs(diffMinutes)} minuto(s)`
  }

  const canalProToken = tokenStatus?.tokens.find((token) =>
    token.provider?.toLowerCase() === 'gandalf' || token.provider?.toLowerCase() === 'canalpro'
  ) ?? tokenStatus?.tokens[0]

  const statusInfo = getStatusInfo(canalProToken?.status)
  const expiresAtLabel = formatDateTime(canalProToken?.expires_at)
  const expiresAtRelative = formatRelativeTime(canalProToken?.expires_at)

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Usuários</p>
              <p className="text-2xl font-bold text-gray-900">{tenant.users_count || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Propriedades</p>
              <p className="text-2xl font-bold text-gray-900">{tenant.properties_count || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-2xl font-bold text-gray-900">
                {tenant.is_active ? 'Ativo' : 'Inativo'}
              </p>
            </div>
          </div>
        </div>
      </div>

        {/* Token Monitor Status */}
        <div className="bg-white border border-indigo-200 rounded-lg p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <KeyRound className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-indigo-700">Token CanalPro</p>
                <p className="text-xs text-indigo-500">Monitoramento em tempo real da integração CanalPro/Gandalf</p>
              </div>
            </div>
            {tokenLoading ? (
              <div className="flex items-center gap-2 text-indigo-600 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Carregando status...</span>
              </div>
            ) : (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.badge}`}>
                {statusInfo.label}
              </span>
            )}
          </div>

          <div className="mt-4">
            {tokenLoading ? (
              <div className="h-24 flex items-center justify-center text-sm text-gray-500">
                Buscando últimas informações...
              </div>
            ) : canalProToken ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Situação atual</p>
                  <p className="mt-2 text-sm text-gray-700 leading-snug">{statusInfo.description}</p>
                  {tokenStatus?.summary?.last_check && (
                    <p className="mt-3 text-xs text-gray-500">
                      Última verificação: {formatDateTime(tokenStatus.summary.last_check)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Expira em</p>
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {expiresAtLabel || 'Sem data registrada'}
                  </p>
                  {expiresAtRelative && (
                    <p className="text-xs text-gray-500 mt-1">{expiresAtRelative}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Automação</p>
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {canalProToken.automation_enabled ? 'Renovação automática ativa' : 'Renovação manual' }
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Total de tokens: {tokenStatus?.summary?.total ?? 0} • Expirando: {tokenStatus?.summary?.expiring_soon ?? 0}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                Nenhum token CanalPro encontrado para este tenant.
              </div>
            )}
          </div>
        </div>

      {/* Health Score */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-2">Health Score</p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-5xl font-bold text-purple-600">
                {tenant.health_score || '—'}
              </span>
              {tenant.health_score && (
                <span className="text-lg text-gray-500">/100</span>
              )}
            </div>
            {tenant.health_score && (
              <div className="mt-3">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all ${
                      tenant.health_score >= 80 ? 'bg-green-500' :
                      tenant.health_score >= 60 ? 'bg-yellow-500' :
                      tenant.health_score >= 40 ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${tenant.health_score}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
            )}
          </div>
          <Activity className="w-10 h-10 text-purple-400" />
        </div>

        {/* Alertas baseados no health score */}
        {tenant.health_score && tenant.health_score < 50 && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-start gap-3 border border-red-200">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Atenção Necessária</p>
              <p className="text-xs text-red-600 mt-1">
                Este tenant apresenta baixo engajamento. Considere entrar em contato.
              </p>
            </div>
          </div>
        )}

        {!tenant.health_score && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-3 border border-blue-200">
            <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-blue-600">
                Health Score será calculado após atividade do tenant.
              </p>
            </div>
          </div>
        )}

        {tenant.properties_count === 0 && tenant.is_active && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg flex items-start gap-3 border border-yellow-200">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Nenhum Imóvel Cadastrado</p>
              <p className="text-xs text-yellow-600 mt-1">
                Este tenant está ativo mas ainda não cadastrou nenhum imóvel.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Contact Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações de Contato</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {infoItems.map((item, index) => {
            const Icon = item.icon
            return (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Icon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">{item.label}</p>
                  <p className="font-medium text-gray-900">{item.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Contract Information */}
      {tenant.contract && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contrato CanalPro</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Máx. Propriedades</p>
              <p className="text-xl font-bold text-gray-900">{tenant.contract.max_properties ?? '—'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Máx. Destaques</p>
              <p className="text-xl font-bold text-gray-900">{tenant.contract.max_highlights ?? '—'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Máx. Super Destaques</p>
              <p className="text-xl font-bold text-gray-900">{tenant.contract.max_super_highlights ?? '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Address */}
      {tenant.address && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Endereço</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-900">{tenant.address}</p>
            {tenant.city && tenant.state && (
              <p className="text-gray-600 mt-1">
                {tenant.city}, {tenant.state} {tenant.zip_code ? `- ${tenant.zip_code}` : ''}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function UsersTab({ users, loading }: { users: TenantUser[]; loading: boolean }) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null)

  const handleChangePassword = (user: TenantUser) => {
    setSelectedUser(user)
    setPasswordDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando usuários...</p>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Nenhum usuário encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Total de usuários: {users.length}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuário
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Criado em
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Último acesso
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{user.username}</span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.email}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {user.is_admin ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <Shield className="w-3 h-3" />
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      Usuário
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {user.is_active ? (
                    <span className="inline-flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm text-red-600">
                      <XCircle className="w-4 h-4" />
                      Inativo
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.last_login ? new Date(user.last_login).toLocaleDateString('pt-BR') : 'Nunca'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleChangePassword(user)}
                    className="gap-2"
                  >
                    <KeyRound className="h-4 w-4" />
                    Trocar Senha
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog de troca de senha */}
      {selectedUser && (
        <ChangePasswordDialog
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
          userId={selectedUser.id}
          userName={selectedUser.username}
        />
      )}
    </div>
  )
}

function StatsTab({ stats, loading }: { stats: TenantStats | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando estatísticas...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Estatísticas não disponíveis</p>
      </div>
    )
  }

  const propertyStats = stats.stats.properties
  const propertyStatusSummary = propertyStats.status_summary
  const statusEntries: PropertyStatusSummaryItem[] = propertyStatusSummary?.by_status ?? []
  const fallbackStatusEntries = Object.entries(propertyStats.by_status || {})

  return (
    <div className="space-y-6">
      {/* User Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas de Usuários</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total de Usuários</p>
            <p className="text-3xl font-bold text-blue-600">{stats.stats.users.total}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Administradores</p>
            <p className="text-3xl font-bold text-purple-600">{stats.stats.users.admins}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Usuários Regulares</p>
            <p className="text-3xl font-bold text-green-600">{stats.stats.users.regular}</p>
          </div>
        </div>
      </div>

      {/* Property Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas de Propriedades</h3>
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">Total de Propriedades</span>
            <span className="text-2xl font-bold text-gray-900">{stats.stats.properties.total}</span>
          </div>

          {(statusEntries.length > 0 || fallbackStatusEntries.length > 0) && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Por Status:</p>
              {statusEntries.length > 0 ? (
                <div className="space-y-2">
                  {statusEntries.map((item) => {
                    const styleClass = STATUS_CARD_STYLES[item.category] ?? STATUS_CARD_STYLES.other
                    return (
                      <div key={item.key} className={`rounded-lg border p-3 ${styleClass}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.label}</span>
                          <span className="text-base font-bold text-gray-900 dark:text-gray-100">{item.count}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{item.description}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {fallbackStatusEntries.map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between py-2 border-t border-gray-200">
                      <span className="text-sm text-gray-600 capitalize">{status}</span>
                      <span className="font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function QuotasTab({ tenant }: { tenant: TenantDetail }) {
  if (!tenant.contract) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Nenhum contrato CanalPro encontrado</p>
        <p className="text-sm text-gray-500 mt-2">
          Configure um contrato para visualizar quotas e limites
        </p>
      </div>
    )
  }

  const calculatePercentage = (used: number, limit: number) => {
    if (limit === 0) return 0
    return Math.min((used / limit) * 100, 100)
  }

  const propertiesUsed = tenant.properties_count || 0
  const propertiesLimit = tenant.contract.max_properties ?? 0
  const propertiesPercentage = propertiesLimit > 0 ? calculatePercentage(propertiesUsed, propertiesLimit) : 0
  const propertiesLimitLabel = propertiesLimit > 0 ? propertiesLimit : 'Sem limite'

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Uso de Recursos</h3>
        
        {/* Properties Usage */}
        <div className="bg-gray-50 rounded-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Propriedades</span>
            <span className="text-sm text-gray-600">
              {propertiesUsed} / {propertiesLimitLabel}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${
                propertiesPercentage >= 90
                  ? 'bg-red-600'
                  : propertiesPercentage >= 70
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${propertiesPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{propertiesPercentage.toFixed(1)}% utilizado</p>
        </div>

        {/* Highlights Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Destaques Disponíveis</p>
            <p className="text-2xl font-bold text-gray-900">{tenant.contract.max_highlights ?? '—'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Super Destaques Disponíveis</p>
            <p className="text-2xl font-bold text-gray-900">{tenant.contract.max_super_highlights ?? '—'}</p>
          </div>
        </div>
      </div>

      {tenant.contract.expires_at && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">Validade do Contrato</p>
              <p className="text-sm text-yellow-700 mt-1">
                Expira em: {new Date(tenant.contract.expires_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
