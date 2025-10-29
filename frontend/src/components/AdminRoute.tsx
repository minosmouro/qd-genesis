import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactElement;
}

/**
 * Componente de proteção de rotas administrativas
 * Permite acesso apenas para usuários do tenant_id = 1 (super admin)
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user } = useAuth();

  // Verificar se é super admin (tenant_id = 1)
  const isSuperAdmin = user?.tenant_id === 1;

  if (!isSuperAdmin) {
    // Redirecionar para dashboard se não for super admin
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
