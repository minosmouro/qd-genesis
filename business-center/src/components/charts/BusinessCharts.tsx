import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'

// Dados mockados para demonstração - depois virão da API
const tenantGrowthData = [
  { month: 'Jan', tenants: 15, active: 14, properties: 2500 },
  { month: 'Feb', tenants: 22, active: 20, properties: 3200 },
  { month: 'Mar', tenants: 28, active: 26, properties: 4100 },
  { month: 'Apr', tenants: 35, active: 32, properties: 5300 },
  { month: 'Mai', tenants: 41, active: 38, properties: 6800 },
  { month: 'Jun', tenants: 47, active: 43, properties: 7900 }
]

const healthScoreData = [
  { name: 'Excelente', value: 65, color: '#10b981' },
  { name: 'Bom', value: 25, color: '#f59e0b' },
  { name: 'Atenção', value: 8, color: '#ef4444' },
  { name: 'Crítico', value: 2, color: '#dc2626' }
]

const revenueData = [
  { month: 'Jan', revenue: 45000, costs: 28000 },
  { month: 'Feb', revenue: 58000, costs: 32000 },
  { month: 'Mar', revenue: 72000, costs: 38000 },
  { month: 'Apr', revenue: 89000, costs: 45000 },
  { month: 'Mai', revenue: 105000, costs: 52000 },
  { month: 'Jun', revenue: 125000, costs: 58000 }
]

export function TenantGrowthChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={tenantGrowthData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="month" 
          className="text-sm"
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          className="text-sm"
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="tenants" 
          stroke="#8b5cf6" 
          strokeWidth={3}
          name="Total Tenants"
          dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
        />
        <Line 
          type="monotone" 
          dataKey="active" 
          stroke="#10b981" 
          strokeWidth={3}
          name="Tenants Ativos"
          dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function HealthScoreChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={healthScoreData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {healthScoreData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="month" 
          className="text-sm"
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          className="text-sm"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
          formatter={(value: number) => [`R$ ${value.toLocaleString()}`, '']}
        />
        <Legend />
        <Bar 
          dataKey="revenue" 
          fill="#f59e0b" 
          name="Receita"
          radius={[4, 4, 0, 0]}
        />
        <Bar 
          dataKey="costs" 
          fill="#6b7280" 
          name="Custos"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}