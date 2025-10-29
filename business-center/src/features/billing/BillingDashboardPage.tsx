import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, Users, CreditCard, Package, AlertCircle } from 'lucide-react'
import { apiService } from '@/services/api'
import { BillingDashboard as BillingDashboardType } from '@/types'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function BillingDashboardPage() {
  const [dashboard, setDashboard] = useState<BillingDashboardType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const data = await apiService.getBillingDashboard()
      setDashboard(data)
    } catch (error) {
      console.error('Erro ao carregar dashboard de billing:', error)
      toast.error('Erro ao carregar dashboard financeiro')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard financeiro...</p>
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Erro ao carregar dados</p>
        </div>
      </div>
    )
  }

  const { metrics, subscriptions_by_plan, revenue_by_plan } = dashboard

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Financeiro</h1>
        <p className="text-gray-600 mt-1">Visão geral de receitas e assinaturas</p>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">MRR</p>
                <p className="text-sm text-gray-500">Receita Recorrente Mensal</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  R$ {metrics.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ARR */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ARR</p>
                <p className="text-sm text-gray-500">Receita Recorrente Anual</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  R$ {metrics.arr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assinaturas Ativas */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Assinaturas Ativas</p>
                <p className="text-sm text-gray-500">Total de tenants pagantes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {metrics.active_subscriptions}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Conversão */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Conversão</p>
                <p className="text-sm text-gray-500">{metrics.tenants_with_subscription} de {metrics.total_tenants} tenants</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {metrics.conversion_rate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e Detalhes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assinaturas por Plano */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Assinaturas por Plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(subscriptions_by_plan).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma assinatura ativa
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(subscriptions_by_plan).map(([planName, count]) => {
                  const total = Object.values(subscriptions_by_plan).reduce((sum, c) => sum + c, 0)
                  const percentage = (count / total) * 100
                  
                  return (
                    <div key={planName}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{planName}</span>
                        <span className="text-sm text-gray-600">{count} assinaturas</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}% do total</p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Receita por Plano */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Receita Mensal por Plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(revenue_by_plan).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma receita registrada
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(revenue_by_plan)
                  .sort(([, a], [, b]) => b - a)
                  .map(([planName, revenue]) => {
                    const total = Object.values(revenue_by_plan).reduce((sum, r) => sum + r, 0)
                    const percentage = (revenue / total) * 100
                    
                    return (
                      <div key={planName}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{planName}</span>
                          <span className="text-sm text-gray-600">
                            R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-green-600 h-2.5 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}% da receita</p>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo de Tenants */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{metrics.total_tenants}</p>
              <p className="text-sm text-gray-600 mt-1">Total de Tenants</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{metrics.tenants_with_subscription}</p>
              <p className="text-sm text-gray-600 mt-1">Com Assinatura</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{metrics.tenants_without_subscription}</p>
              <p className="text-sm text-gray-600 mt-1">Sem Assinatura</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
