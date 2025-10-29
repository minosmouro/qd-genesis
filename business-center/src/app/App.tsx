import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { TenantsPage } from '@/features/tenants/TenantsPage'
import { TenantDetailPage } from '@/features/tenants/TenantDetailPage'
import { QuotasPage } from '@/features/quotas/QuotasPage'
import { BillingDashboardPage } from '@/features/billing/BillingDashboardPage'
import { PlansPage } from '@/features/billing/PlansPage'
import { Layout } from '@/shared/components/Layout'
import { LoadingScreen } from '@/shared/components/LoadingScreen'

export function App() {
  const { checkAuth, isLoading, isAuthenticated } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected routes */}
        {isAuthenticated ? (
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="tenants" element={<TenantsPage />} />
            <Route path="tenants/:id" element={<TenantDetailPage />} />
            <Route path="quotas" element={<QuotasPage />} />
            <Route path="billing" element={<BillingDashboardPage />} />
            <Route path="billing/plans" element={<PlansPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
      
      <Toaster 
        position="top-right"
        richColors
        closeButton
        expand={false}
      />
    </>
  )
}