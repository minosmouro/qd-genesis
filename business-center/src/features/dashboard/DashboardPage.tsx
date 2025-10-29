import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, Users, Home, TrendingUp, Activity, Shield, Database, Globe, RefreshCw, AlertCircle } from 'lucide-react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { TenantGrowthChart, HealthScoreChart, RevenueChart } from '@/components/charts/BusinessCharts'

export function DashboardPage() {
  const { stats, isLoading, error, refetch } = useDashboardData()

  // Calcular health score baseado nos dados
  const healthScore = Math.min(95, Math.max(70, 
    (stats.active_tenants / stats.total_tenants) * 100 || 85
  ))

  const serverStatus: 'online' | 'warning' | 'offline' = 
    healthScore > 90 ? 'online' : healthScore > 70 ? 'warning' : 'offline'

  const kpiCards = [
    {
      title: 'Total de Tenants',
      value: stats.total_tenants,
      icon: Building2,
      color: 'text-brand-purple-600',
      bgColor: 'bg-brand-purple-100',
      change: '+3 este mês'
    },
    {
      title: 'Usuários Ativos',
      value: stats.total_users.toLocaleString(),
      icon: Users,
      color: 'text-brand-gold-600',
      bgColor: 'bg-brand-gold-100',
      change: '+89 hoje'
    },
    {
      title: 'Propriedades',
      value: stats.total_properties.toLocaleString(),
      icon: Home,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      change: '+234 esta semana'
    },
    {
      title: 'Crescimento',
      value: `+${stats.growth_rate}%`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: 'vs mês anterior'
    }
  ]

  // Tratamento de erro
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Erro ao Carregar Dados
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Dashboard Executivo
          </h1>
          <Badge 
            variant={serverStatus === 'online' ? 'default' : 'destructive'}
            className="flex items-center gap-2"
          >
            <Activity className="h-3 w-3" />
            {serverStatus === 'online' ? 'Sistema Online' : 'Sistema Offline'}
          </Badge>
        </div>
        <p className="text-lg text-muted-foreground">
          Visão geral da plataforma SaaS QuadraDois e indicadores executivos
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold tracking-tight">
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {card.change}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${card.bgColor}`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-purple-600" />
              Evolução de Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TenantGrowthChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-brand-gold-600" />
              Distribuição Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HealthScoreChart />
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-600" />
              Receita vs Custos Mensais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>

        {/* System Health & Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-brand-purple-600" />
              Health Score da Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Score Geral</span>
              <span className="text-2xl font-bold text-green-600">{Math.round(healthScore)}%</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Performance da API</span>
                <Badge variant="secondary">Excelente</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Disponibilidade</span>
                <Badge variant="secondary">99.9%</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Uso de Recursos</span>
                <Badge variant="secondary">Normal</Badge>
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <button className="w-full p-2 text-left rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Gerenciar Tenants</span>
                </div>
              </button>
              
              <button className="w-full p-2 text-left rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Relatórios</span>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Última verificação: há 2 minutos
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}