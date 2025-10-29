import { Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Toaster as SonnerToaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Handshake, Users } from 'lucide-react';
import './index.css';

// Pages
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import PropertiesPage from '@/pages/PropertiesPage';
import PropertyViewPage from '@/pages/PropertyViewPage';
import RefreshSchedulePage from '@/pages/RefreshSchedulePage';
import RefreshScheduleFormPage from '@/pages/RefreshScheduleFormPage';
import RefreshSchedulePropertiesPage from '@/pages/RefreshSchedulePropertiesPage';
import UsersManagementPage from '@/pages/UsersManagementPage';
import TenantsManagementPage from '@/pages/TenantsManagementPage';
import AdminDashboard from '@/pages/AdminDashboard';
const PropertyDetailPage = lazy(() => import('@/pages/PropertyDetailPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const CanalProHubPage = lazy(() => import('@/pages/CanalProHubPage'));
const PropertyCreatePage = lazy(() => import('@/pages/PropertyCreatePage'));
const TokenMonitorPage = lazy(() => import('@/pages/TokenMonitorPage'));
const PartnershipsPage = lazy(() => import('@/pages/PartnershipsPage'));
import Layout from '@/components/Layout';
import PlaceholderPage from '@/components/PlaceholderPage';
import { AdminRoute } from '@/components/AdminRoute';

// Properties module layout
import PropertiesLayout from '@/modules/properties/PropertiesLayout';

// React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <div className="min-h-screen bg-background">
              <Routes>
                {/* Public Route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected Routes */}
                <Route path="/" element={<Layout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />

                  {/* Refresh CanalPro Routes */}
                  <Route path="refresh" element={<RefreshSchedulePage />} />
                  <Route path="refresh/new" element={<RefreshScheduleFormPage />} />
                  <Route path="refresh/:id/edit" element={<RefreshScheduleFormPage />} />
                  <Route path="refresh/:id/properties" element={<RefreshSchedulePropertiesPage />} />

                  {/* Properties module with specific layout and nested routes */}
                  <Route path="properties" element={<PropertiesLayout />}>
                    <Route index element={<PropertiesPage />} />
                    <Route
                      path="new"
                      element={
                        <Suspense
                          fallback={<div className="p-8">Carregando...</div>}
                        >
                          <PropertyCreatePage />
                        </Suspense>
                      }
                    />
                    <Route
                      path=":id"
                      element={
                        <Suspense
                          fallback={<div className="p-8">Carregando...</div>}
                        >
                          <PropertyDetailPage />
                        </Suspense>
                      }
                    />
                    <Route path=":id/view" element={<PropertyViewPage />} />
                    <Route
                      path=":id/edit"
                      element={
                        <Suspense
                          fallback={<div className="p-8">Carregando...</div>}
                        >
                          <PropertyCreatePage />
                        </Suspense>
                      }
                    />
                  </Route>

                  <Route
                    path="partnerships"
                    element={
                      <Suspense
                        fallback={<div className="p-8">Carregando...</div>}
                      >
                        <PartnershipsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="leads"
                    element={
                      <PlaceholderPage title="Leads" icon={<Handshake />} />
                    }
                  />
                  <Route
                    path="clients"
                    element={
                      <PlaceholderPage title="Clientes" icon={<Users />} />
                    }
                  />
                  <Route 
                    path="users" 
                    element={
                      <AdminRoute>
                        <UsersManagementPage />
                      </AdminRoute>
                    } 
                  />
                  <Route 
                    path="tenants" 
                    element={
                      <AdminRoute>
                        <TenantsManagementPage />
                      </AdminRoute>
                    } 
                  />
                  <Route 
                    path="admin" 
                    element={
                      <AdminRoute>
                        <AdminDashboard />
                      </AdminRoute>
                    } 
                  />

                <Route
                    path="settings"
                    element={
                      <Suspense
                        fallback={<div className="p-8">Carregando...</div>}
                      >
                        <SettingsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="canalpro"
                    element={
                      <Suspense
                        fallback={<div className="p-8">Carregando...</div>}
                      >
                        <CanalProHubPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="tokens"
                    element={
                      <Suspense
                        fallback={<div className="p-8">Carregando...</div>}
                      >
                        <TokenMonitorPage />
                      </Suspense>
                    }
                  />
                </Route>

                {/* 404 Fallback */}
                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Routes>

              {/* Toast Notifications */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#161B22', // bg-surface
                    color: '#C9D1D9', // text-text-primary
                    border: '1px solid #30363D', // border-border
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#3FB950', // success
                      secondary: '#0D1117', // background
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#F96666', // danger
                      secondary: '#0D1117', // background
                    },
                  },
                }}
              />
              <SonnerToaster
                position="top-right"
                expand={false}
                richColors
                closeButton
                toastOptions={{
                  className: 'sonner-toast',
                }}
              />
            </div>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
