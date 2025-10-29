import { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Home, 
  TrendingUp, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  PieChart,
  Calendar
} from 'lucide-react';
import KPICard from '../components/ui/KPICard';
import ProgressBar from '../components/ui/ProgressBar';
import { toast } from 'sonner';

interface DashboardStats {
  tenants: {
    total: number;
    active: number;
    new_30d: number;
    growth_rate: number;
  };
  users: {
    total: number;
    active: number;
    new_30d: number;
    avg_per_tenant: number;
  };
  properties: {
    total: number;
    active: number;
    new_30d: number;
    avg_per_tenant: number;
  };
  tenant_distribution: {
    PF: number;
    PJ: number;
  };
}

interface TenantData {
  id: string;
  name: string;
  tenant_type: 'PF' | 'PJ';
  email: string;
  phone: string;
  creci: string;
  is_active: boolean;
  created_at: string;
  users_count: number;
  properties_count: number;
  last_activity: string | null;
  health_score: number;
  health_status: 'excellent' | 'good' | 'warning' | 'critical';
}

interface ActivityData {
  type: 'new_tenant' | 'new_user' | 'user_login';
  timestamp: string;
  description: string;
  tenant_id: string;
  tenant_name: string;
  tenant_type?: 'PF' | 'PJ';
  user_id?: string;
  username?: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Carregar todas as informações em paralelo
      const baseUrl = import.meta.env.VITE_API_URL || 'https://api.quadradois.com.br';
      const [statsRes, tenantsRes, activitiesRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/dashboard/overview`, { headers }),
        fetch(`${baseUrl}/api/admin/dashboard/tenants`, { headers }),
        fetch(`${baseUrl}/api/admin/dashboard/activity`, { headers })
      ]);

      // Verificar erros individualmente para melhor debugging
      if (!statsRes.ok) {
        const errorText = await statsRes.text();
        console.error('Erro na API overview:', statsRes.status, errorText);
        throw new Error(`Erro ao carregar overview: ${statsRes.status} - ${errorText}`);
      }
      
      if (!tenantsRes.ok) {
        const errorText = await tenantsRes.text();
        console.error('Erro na API tenants:', tenantsRes.status, errorText);
        throw new Error(`Erro ao carregar tenants: ${tenantsRes.status} - ${errorText}`);
      }
      
      if (!activitiesRes.ok) {
        const errorText = await activitiesRes.text();
        console.error('Erro na API activities:', activitiesRes.status, errorText);
        throw new Error(`Erro ao carregar atividades: ${activitiesRes.status} - ${errorText}`);
      }

      const [statsData, tenantsData, activitiesData] = await Promise.all([
        statsRes.json(),
        tenantsRes.json(),
        activitiesRes.json()
      ]);
      
      console.log('Dados carregados:', { statsData, tenantsData, activitiesData });

      setStats(statsData.data);
      setTenants(tenantsData.data);
      setActivities(activitiesData.data);

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      setError('Erro ao carregar dados do dashboard');
      toast.error('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-4 w-4" />;
      case 'good': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <Clock className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'new_tenant': return <Building2 className="h-4 w-4 text-blue-600" />;
      case 'new_user': return <Users className="h-4 w-4 text-green-600" />;
      case 'user_login': return <Activity className="h-4 w-4 text-gray-600" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao Carregar Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadDashboardData}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Executivo</h1>
              <p className="text-sm text-gray-600">Visão geral do seu CRM B2B</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={loadDashboardData}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Activity className="h-4 w-4" />
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total de Clientes"
            value={stats?.tenants.total || 0}
            icon={<Building2 className="h-6 w-6" />}
            trend={{
              value: stats?.tenants.growth_rate || 0,
              direction: (stats?.tenants.growth_rate || 0) >= 0 ? 'up' : 'down'
            }}
            subtitle={`${stats?.tenants.new_30d || 0} novos em 30 dias`}
            color="blue"
          />
          
          <KPICard
            title="Usuários Ativos"
            value={stats?.users.active || 0}
            icon={<Users className="h-6 w-6" />}
            trend={{
              value: ((stats?.users.new_30d || 0) / Math.max(stats?.users.total || 1, 1)) * 100,
              direction: 'up'
            }}
            subtitle={`${stats?.users.avg_per_tenant.toFixed(1) || 0} por cliente`}
            color="green"
          />
          
          <KPICard
            title="Propriedades"
            value={stats?.properties.total || 0}
            icon={<Home className="h-6 w-6" />}
            trend={{
              value: ((stats?.properties.new_30d || 0) / Math.max(stats?.properties.total || 1, 1)) * 100,
              direction: 'up'
            }}
            subtitle={`${stats?.properties.avg_per_tenant.toFixed(1) || 0} por cliente`}
            color="yellow"
          />

          <KPICard
            title="Growth Rate"
            value={`${stats?.tenants.growth_rate.toFixed(1) || 0}%`}
            icon={<TrendingUp className="h-6 w-6" />}
            trend={{
              value: stats?.tenants.growth_rate || 0,
              direction: (stats?.tenants.growth_rate || 0) >= 0 ? 'up' : 'down'
            }}
            subtitle="Crescimento mensal"
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Clientes */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Clientes</h3>
                    <p className="text-sm text-gray-600">Health scores e métricas por cliente</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      PF: {stats?.tenant_distribution.PF || 0} | PJ: {stats?.tenant_distribution.PJ || 0}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {tenants.map((tenant) => (
                  <div key={tenant.id} className="p-4 border-b hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getHealthColor(tenant.health_status)}`}>
                          {getHealthIcon(tenant.health_status)}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{tenant.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              tenant.tenant_type === 'PF' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {tenant.tenant_type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                            </span>
                            {tenant.creci && (
                              <span className="text-xs">CRECI: {tenant.creci}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {tenant.health_score}%
                        </div>
                        <div className="text-xs text-gray-500">Health Score</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Usuários:</span>
                        <span className="ml-1 font-medium">{tenant.users_count}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Propriedades:</span>
                        <span className="ml-1 font-medium">{tenant.properties_count}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Última atividade:</span>
                        <span className="ml-1 font-medium">
                          {tenant.last_activity 
                            ? formatDate(tenant.last_activity).split(' ')[0]
                            : 'Nunca'
                          }
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <ProgressBar 
                        value={tenant.health_score} 
                        variant={tenant.health_status === 'excellent' ? 'success' : 
                               tenant.health_status === 'good' ? 'default' :
                               tenant.health_status === 'warning' ? 'warning' : 'danger'}
                        size="sm"
                        showPercentage={false}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feed de Atividades */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Atividades Recentes</h3>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {activities.length > 0 ? (
                  activities.map((activity, index) => (
                    <div key={index} className="p-4 border-b">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {formatDate(activity.timestamp)}
                            </span>
                            {activity.tenant_type && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                activity.tenant_type === 'PF' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {activity.tenant_type}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>Nenhuma atividade recente</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;