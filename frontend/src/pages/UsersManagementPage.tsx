import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import { errorLog } from '@/utils/logger';

interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  tenant_id?: number;
  tenant_name?: string;
}

const UsersManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Formulário para novo usuário
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    is_admin: false
  });

  // Função para obter token (simples)
  const getToken = () => {
    return localStorage.getItem('access_token') || 
           localStorage.getItem('token') || 
           localStorage.getItem('auth_token');
  };

  const fetchCurrentUser = async () => {
    try {
      const token = getToken();
      if (!token) {
        setError('Token de autenticação não encontrado');
        return;
      }
      
      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao buscar perfil');
      }
    } catch (err) {
      errorLog('Erro ao buscar usuário atual:', err);
      setError('Erro de conexão');
    }
  };

  const fetchUsers = async () => {
    try {
      const token = getToken();
      if (!token) return;
      
      const response = await fetch('/api/users/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao carregar usuários');
      }
    } catch (err) {
      setError('Erro de conexão');
    }
  };

  const createUser = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      });
      
      if (response.ok) {
        setShowCreateUser(false);
        setNewUser({ username: '', email: '', password: '', is_admin: false });
        fetchUsers();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao criar usuário');
      }
    } catch (err) {
      setError('Erro de conexão');
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;
    
    try {
      const token = getToken();
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        fetchUsers();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao deletar usuário');
      }
    } catch (err) {
      setError('Erro de conexão');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchCurrentUser();
      await fetchUsers();
      setLoading(false);
    };
    
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-primary font-semibold">Carregando sistema de usuários...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Gestão de Usuários</h1>
          <p className="text-muted-foreground mt-1">Gerencie usuários e tenants do sistema</p>
        </div>
        {currentUser && (
          <div className="flex items-center gap-2">
            <StatusBadge 
              status={currentUser.is_admin ? "success" : "info"}
              label={currentUser.is_admin ? "Administrador" : "Usuário"}
            />
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <strong className="mr-2">Erro:</strong>
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Current User Profile */}
      {currentUser && (
        <Card variant="accent">
          <CardHeader>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              👤 Meu Perfil
              {currentUser.is_admin && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  ADMIN
                </span>
              )}
            </h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <strong className="text-muted-foreground">Username:</strong>
                <div className="font-medium">{currentUser.username}</div>
              </div>
              <div>
                <strong className="text-muted-foreground">Email:</strong>
                <div className="font-medium">{currentUser.email}</div>
              </div>
              <div>
                <strong className="text-muted-foreground">Tenant ID:</strong>
                <div className="font-medium">{currentUser.tenant_id}</div>
              </div>
              <div>
                <strong className="text-muted-foreground">Tenant:</strong>
                <div className="font-medium">{currentUser.tenant_name || 'Master'}</div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Users Content */}
      <div className="space-y-6">
        {/* Create User Button */}
        {currentUser?.is_admin && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Total de {users.length} usuários cadastrados
            </div>
            <Button 
                variant="primary"
                onClick={() => setShowCreateUser(true)}
              >
                ➕ Criar Novo Usuário
              </Button>
            </div>
          )}

          {/* Create User Form */}
          {showCreateUser && (
            <Card variant="elevated">
              <CardHeader>
                <h3 className="text-lg font-semibold">➕ Criar Novo Usuário</h3>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Username (ex: corretor4)"
                    className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  />
                  <input
                    type="email"
                    placeholder="Email (ex: corretor4@empresa.com)"
                    className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  />
                  <input
                    type="password"
                    placeholder="Password (mínimo 6 caracteres)"
                    className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  />
                  <div className="flex items-center space-x-2 p-2">
                    <input
                      type="checkbox"
                      id="is_admin"
                      checked={newUser.is_admin}
                      onChange={(e) => setNewUser({...newUser, is_admin: e.target.checked})}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <label htmlFor="is_admin" className="text-sm font-medium">
                      Administrador (pode gerenciar outros usuários)
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setShowCreateUser(false);
                      setNewUser({ username: '', email: '', password: '', is_admin: false });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="primary"
                    onClick={createUser}
                  >
                    Criar Usuário
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Users List */}
          <div className="grid gap-3">
            {users.map((user) => (
              <Card key={user.id} variant="default" hover>
                <CardBody className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-primary">{user.username}</strong>
                        {user.is_admin && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        📧 {user.email}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        🆔 ID: {user.id}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        🏢 Tenant: {user.tenant_id}
                      </div>
                      <div className="text-right">
                        {currentUser?.is_admin && currentUser.id !== user.id && (
                          <Button 
                            variant="danger" 
                            size="sm"
                            onClick={() => deleteUser(user.id)}
                          >
                            🗑️ Deletar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

      {/* Empty State */}
      {users.length === 0 && (
        <Card>
          <CardBody className="text-center py-12">
            <div className="text-muted-foreground">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-medium mb-2">Nenhum usuário encontrado</h3>
              <p>Você ainda não tem permissão para ver usuários ou não há usuários cadastrados.</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Instructions */}
      <Card variant="glass">
        <CardBody className="p-4">
          <h4 className="font-semibold text-primary mb-2">💡 Como Testar:</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>• <strong>Super Admin:</strong> admin / admin@quadradois.com / QuadraDois2024!</div>
            <div>• <strong>Admin Imobiliária:</strong> admin_silva / admin@silvasantos.com / silva123</div>
            <div>• <strong>Corretor:</strong> corretor1 / corretor1@silvasantos.com / corretor123</div>
            <div>• Teste criação, edição e exclusão de usuários com diferentes permissões</div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default UsersManagementPage;
