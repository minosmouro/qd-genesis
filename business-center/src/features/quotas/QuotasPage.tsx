import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  AlertCircle,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Building2,
  FileText,
  Users,
  Home
} from 'lucide-react'
import { useTenantsQuotas } from '@/hooks/useTenantsQuotas'
import { TenantQuota, PublicationType } from '@/types'

const PUBLICATION_LABELS: Record<PublicationType, string> = {
  STANDARD: 'Padrão',
  PREMIUM: 'Premium',
  SUPER_PREMIUM: 'Super Premium',
  PREMIERE_1: 'Premiere 1',
  PREMIERE_2: 'Premiere 2',
  TRIPLE: 'Triple'
}

export function QuotasPage() {
  const { quotas, stats, isLoading, error, refetch } = useTenantsQuotas()

  // Tratamento de erro
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Erro ao Carregar Quotas
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

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Dashboard de Quotas
          </h1>
          <p className="text-lg text-muted-foreground">
            Monitoramento de uso e limites por tenant
          </p>
        </div>
        <Button onClick={refetch} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total de Tenants
                </p>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.with_contract} com contrato
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
                  Alertas Críticos
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {stats.critical_alerts}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Limite atingido
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Alertas de Aviso
                </p>
                <p className="text-3xl font-bold text-amber-600">
                  {stats.warning_alerts}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Próximo do limite
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Sem Contrato
                </p>
                <p className="text-3xl font-bold text-gray-600">
                  {stats.without_contract}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Limites não definidos
                </p>
              </div>
              <FileText className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenants List with Quotas */}
      <Card>
        <CardHeader>
          <CardTitle>Uso de Quotas por Tenant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {quotas.map((quota) => (
              <TenantQuotaCard key={quota.tenant_id} quota={quota} />
            ))}

            {quotas.length === 0 && (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum tenant encontrado
                </h3>
                <p className="text-gray-600">
                  Não há dados de quotas disponíveis no momento.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TenantQuotaCard({ quota }: { quota: TenantQuota }) {
  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'warning':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-green-100 text-green-800 border-green-300'
    }
  }

  return (
    <div className="border rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-brand-purple-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-6 w-6 text-brand-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{quota.tenant_name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {quota.tenant_type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
              </Badge>
              {quota.contract.has_contract && (
                <Badge variant="outline" className="text-xs">
                  Contrato: {quota.contract.contract_number || 'Sem número'}
                </Badge>
              )}
              {!quota.is_active && (
                <Badge variant="destructive" className="text-xs">
                  Inativo
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Alert Badge */}
        {quota.alert.message && (
          <Badge className={getAlertColor(quota.alert.level)}>
            {quota.alert.message}
          </Badge>
        )}
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 border-y">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-gray-500" />
          <div>
            <p className="text-sm text-muted-foreground">Usuários</p>
            <p className="text-lg font-semibold">{quota.usage.users}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Home className="h-5 w-5 text-gray-500" />
          <div>
            <p className="text-sm text-muted-foreground">Propriedades</p>
            <p className="text-lg font-semibold">{quota.usage.properties}</p>
          </div>
        </div>
        {quota.usage.total && (
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm text-muted-foreground">Uso Total</p>
              <p className="text-lg font-semibold">
                {quota.usage.total.percentage}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Total Quota Progress */}
      {quota.usage.total && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Anúncios Totais
            </span>
            <span className="text-muted-foreground">
              {quota.usage.total.used} / {quota.usage.total.limit}
              {quota.usage.total.remaining !== null && (
                <span className="ml-1">
                  ({quota.usage.total.remaining} restantes)
                </span>
              )}
            </span>
          </div>
          <Progress 
            value={Math.min(quota.usage.total.percentage, 100)} 
            className="h-2"
          />
        </div>
      )}

      {/* Highlights Breakdown */}
      {quota.contract.has_contract && (
        <div className="space-y-2 pt-2">
          <p className="text-sm font-medium text-muted-foreground">Destaques por Tipo</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(quota.usage.highlights).map(([type, usage]) => {
              if (usage.limit === null || usage.limit === 0) return null
              
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {PUBLICATION_LABELS[type as PublicationType]}
                    </span>
                    <span className="text-muted-foreground">
                      {usage.used}/{usage.limit}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(usage.percentage || 0, 100)} 
                    className="h-1.5"
                  />
                  {usage.percentage !== null && (
                    <p className="text-xs text-muted-foreground">
                      {usage.percentage}%
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!quota.contract.has_contract && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <FileText className="h-6 w-6 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum contrato configurado para este tenant
          </p>
        </div>
      )}
    </div>
  )
}
