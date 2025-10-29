import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import { Loader2 } from 'lucide-react';
import { fetchAddressByCep, BRAZILIAN_STATES } from '@/utils/addressUtils';
import { toast } from 'sonner';
import { errorLog } from '@/utils/logger';

interface Tenant {
  id: number;
  name: string;
  tenant_type: string;
  cpf?: string;
  full_name?: string;
  birth_date?: string;
  cnpj?: string;
  company_name?: string;
  trade_name?: string;
  email?: string;
  phone?: string;
  creci?: string;
  zip_code?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  is_master: boolean;
  is_active: boolean;
  users_count: number;
  properties_count: number;
  created_at?: string;
  updated_at?: string;
}

const TenantsManagementPage: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  
  // Formulário para novo tenant
  const [tenantForm, setTenantForm] = useState({
    name: '',
    tenant_type: 'PJ',
    // PF fields
    cpf: '',
    full_name: '',
    birth_date: '',
    // PJ fields
    cnpj: '',
    company_name: '',
    trade_name: '',
    // Common fields
    email: '',
    phone: '',
    creci: '',
    // Address fields
    zip_code: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    country: 'Brasil',
    // Admin user
    admin_username: '',
    admin_email: '',
    admin_password: ''
  });

  // Função para obter token
  const getToken = () => {
    return localStorage.getItem('access_token') || 
           localStorage.getItem('token') || 
           localStorage.getItem('auth_token');
  };

  // Função auxiliar para máscara de CPF
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  // Função auxiliar para máscara de CNPJ
  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  // Função auxiliar para máscara de telefone
  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  // Função auxiliar para máscara de CEP
  const formatZipCode = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  // Função para buscar endereço por CEP
  const handleCepSearch = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length === 8) {
      setAddressLoading(true);
      try {
        const addressData = await fetchAddressByCep(cleanCep);
        
        if (addressData) {
          setTenantForm(prev => ({
            ...prev,
            street: addressData.street,
            neighborhood: addressData.neighborhood,
            city: addressData.city,
            state: addressData.state,
            country: addressData.country
          }));
          toast.success('Endereço encontrado!');
        } else {
          toast.error('CEP não encontrado');
        }
      } catch (error) {
        toast.error('Erro ao buscar CEP');
      } finally {
        setAddressLoading(false);
      }
    }
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

  const fetchTenants = async () => {
    try {
      const token = getToken();
      if (!token) return;
      
      const response = await fetch('/api/tenants/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao carregar tenants');
      }
    } catch (err) {
      setError('Erro de conexão');
    }
  };

  const createTenant = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      const response = await fetch('/api/tenants/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tenantForm)
      });
      
      if (response.ok) {
        setShowCreateTenant(false);
        setTenantForm({
          name: '', tenant_type: 'PJ', cpf: '', full_name: '', birth_date: '',
          cnpj: '', company_name: '', trade_name: '', email: '', phone: '',
          creci: '', zip_code: '', street: '', number: '', complement: '',
          neighborhood: '', city: '', state: '', country: 'Brasil',
          admin_username: '', admin_email: '', admin_password: ''
        });
        await fetchTenants();
        toast.success('Tenant criado com sucesso!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao criar tenant');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchCurrentUser();
      await fetchTenants();
      setLoading(false);
    };
    
    loadData();
  }, []);

  if (loading && tenants.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-primary font-semibold">Carregando sistema de tenants...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Gestão de Tenants</h1>
          <p className="text-muted-foreground mt-1">Gerencie imobiliárias e corretores autônomos do sistema</p>
        </div>
        {currentUser && (
          <div className="flex items-center gap-2">
            <StatusBadge 
              status={currentUser.is_admin ? "success" : "info"}
              label={currentUser.is_admin ? "Super Administrador" : "Usuário"}
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
                  SUPER ADMIN
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
                <strong className="text-muted-foreground">Permissões:</strong>
                <div className="font-medium">Gestão de Tenants</div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Create Tenant Button */}
      {currentUser?.is_admin && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Total de {tenants.length} tenants cadastrados
          </div>
          <Button 
            variant="primary"
            onClick={() => setShowCreateTenant(true)}
          >
            ➕ Criar Novo Tenant
          </Button>
        </div>
      )}

      {/* Create Tenant Form */}
      {showCreateTenant && (
        <Card variant="elevated">
          <CardHeader>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">🏢 Criar Novo Tenant</h3>
              <Button variant="ghost" onClick={() => setShowCreateTenant(false)}>✕</Button>
            </div>
          </CardHeader>
          <CardBody>
            {/* Tipo de Tenant */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Tipo de Tenant</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tenant_type"
                    value="PF"
                    checked={tenantForm.tenant_type === 'PF'}
                    onChange={(e) => setTenantForm({...tenantForm, tenant_type: e.target.value})}
                    className="mr-2"
                  />
                  <span className="text-sm">👤 Pessoa Física (Corretor Autônomo)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tenant_type"
                    value="PJ"
                    checked={tenantForm.tenant_type === 'PJ'}
                    onChange={(e) => setTenantForm({...tenantForm, tenant_type: e.target.value})}
                    className="mr-2"
                  />
                  <span className="text-sm">🏢 Pessoa Jurídica (Imobiliária)</span>
                </label>
              </div>
            </div>

            {/* Campos específicos por tipo */}
            {tenantForm.tenant_type === 'PF' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    value={tenantForm.full_name}
                    onChange={(e) => setTenantForm({...tenantForm, full_name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="João Silva Santos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CPF *</label>
                  <input
                    type="text"
                    value={tenantForm.cpf}
                    onChange={(e) => setTenantForm({...tenantForm, cpf: formatCPF(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={tenantForm.birth_date}
                    onChange={(e) => setTenantForm({...tenantForm, birth_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nome de Exibição *</label>
                  <input
                    type="text"
                    value={tenantForm.name}
                    onChange={(e) => setTenantForm({...tenantForm, name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="João Silva - Corretor"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Razão Social *</label>
                  <input
                    type="text"
                    value={tenantForm.company_name}
                    onChange={(e) => setTenantForm({...tenantForm, company_name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Silva & Santos Imóveis Ltda"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CNPJ *</label>
                  <input
                    type="text"
                    value={tenantForm.cnpj}
                    onChange={(e) => setTenantForm({...tenantForm, cnpj: formatCNPJ(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    value={tenantForm.trade_name}
                    onChange={(e) => setTenantForm({...tenantForm, trade_name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Silva Imóveis"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nome de Exibição *</label>
                  <input
                    type="text"
                    value={tenantForm.name}
                    onChange={(e) => setTenantForm({...tenantForm, name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Silva & Santos Imóveis"
                  />
                </div>
              </div>
            )}

            {/* Campos comuns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={tenantForm.email}
                  onChange={(e) => setTenantForm({...tenantForm, email: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="contato@empresa.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefone</label>
                <input
                  type="text"
                  value={tenantForm.phone}
                  onChange={(e) => setTenantForm({...tenantForm, phone: formatPhone(e.target.value)})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CRECI</label>
                <input
                  type="text"
                  value={tenantForm.creci}
                  onChange={(e) => setTenantForm({...tenantForm, creci: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="CRECI-SP 123456"
                />
              </div>
            </div>

            {/* Endereço com busca por CEP */}
            <div className="border-t pt-4">
              <h5 className="font-medium text-sm mb-3">🏠 Endereço</h5>
              
              {/* CEP com busca automática */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">CEP</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={tenantForm.zip_code}
                      onChange={(e) => {
                        const formatted = formatZipCode(e.target.value);
                        setTenantForm({...tenantForm, zip_code: formatted});
                        
                        // Buscar automaticamente quando CEP estiver completo
                        if (formatted.length === 9) {
                          handleCepSearch(formatted);
                        }
                      }}
                      className="w-full border rounded-lg px-3 py-2 pr-10"
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    {addressLoading && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Digite o CEP para buscar automaticamente</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Estado</label>
                  <select
                    value={tenantForm.state}
                    onChange={(e) => setTenantForm({...tenantForm, state: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    title="Selecione o estado"
                  >
                    <option value="">Selecione</option>
                    {BRAZILIAN_STATES.map(state => (
                      <option key={state.code} value={state.code}>
                        {state.name} ({state.code})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Cidade</label>
                  <input
                    type="text"
                    value={tenantForm.city}
                    onChange={(e) => setTenantForm({...tenantForm, city: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="São Paulo"
                  />
                </div>
              </div>

              {/* Logradouro e Bairro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Logradouro/Rua</label>
                  <input
                    type="text"
                    value={tenantForm.street}
                    onChange={(e) => setTenantForm({...tenantForm, street: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Rua das Flores"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bairro</label>
                  <input
                    type="text"
                    value={tenantForm.neighborhood}
                    onChange={(e) => setTenantForm({...tenantForm, neighborhood: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Centro"
                  />
                </div>
              </div>

              {/* Número e Complemento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Número</label>
                  <input
                    type="text"
                    value={tenantForm.number}
                    onChange={(e) => setTenantForm({...tenantForm, number: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Complemento</label>
                  <input
                    type="text"
                    value={tenantForm.complement}
                    onChange={(e) => setTenantForm({...tenantForm, complement: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Qd. 10 Lt. 5, Sala 201"
                  />
                </div>
              </div>
            </div>

            {/* Dados do administrador */}
            <div className="border-t pt-4">
              <h5 className="font-medium text-sm mb-3">👤 Dados do Administrador</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Username *</label>
                  <input
                    type="text"
                    value={tenantForm.admin_username}
                    onChange={(e) => setTenantForm({...tenantForm, admin_username: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="admin_silva"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    value={tenantForm.admin_email}
                    onChange={(e) => setTenantForm({...tenantForm, admin_email: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="admin@empresa.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Senha *</label>
                  <input
                    type="password"
                    value={tenantForm.admin_password}
                    onChange={(e) => setTenantForm({...tenantForm, admin_password: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" onClick={() => setShowCreateTenant(false)}>
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                onClick={createTenant}
                loading={loading}
              >
                Criar Tenant
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tenants List */}
      <div className="space-y-3">
        {tenants.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-text-secondary">
              {tenants.length} tenant(s) cadastrado(s)
            </h4>
            {tenants.map((tenant) => (
              <Card key={tenant.id} variant="default" hover>
                <CardBody className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="font-semibold">{tenant.name}</h5>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          tenant.tenant_type === 'PF' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {tenant.tenant_type === 'PF' ? '👤 Pessoa Física' : '🏢 Pessoa Jurídica'}
                        </span>
                        {tenant.is_master && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            MASTER
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-text-secondary">
                        <div>
                          <strong>ID:</strong> {tenant.id}
                        </div>
                        <div>
                          <strong>Usuários:</strong> {tenant.users_count}
                        </div>
                        <div>
                          <strong>Propriedades:</strong> {tenant.properties_count}
                        </div>
                        <div>
                          <strong>CRECI:</strong> {tenant.creci || 'N/A'}
                        </div>
                      </div>

                      {tenant.tenant_type === 'PF' ? (
                        <div className="mt-2 text-sm text-text-secondary">
                          <strong>CPF:</strong> {tenant.cpf || 'N/A'} | 
                          <strong> Nome:</strong> {tenant.full_name || 'N/A'}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-text-secondary">
                          <strong>CNPJ:</strong> {tenant.cnpj || 'N/A'} | 
                          <strong> Razão Social:</strong> {tenant.company_name || 'N/A'}
                        </div>
                      )}

                      {(tenant.city || tenant.state) && (
                        <div className="mt-1 text-sm text-text-secondary">
                          <strong>Localização:</strong> {tenant.city}{tenant.city && tenant.state ? ', ' : ''}{tenant.state}
                        </div>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {!loading && tenants.length === 0 && !showCreateTenant && (
          <Card>
            <CardBody className="text-center py-12">
              <div className="text-muted-foreground">
                <div className="text-4xl mb-4">🏢</div>
                <h3 className="text-lg font-medium mb-2">Nenhum tenant encontrado</h3>
                <p>Você ainda não tem permissão para ver tenants ou não há tenants cadastrados.</p>
                {currentUser?.is_admin && (
                  <Button 
                    variant="primary" 
                    onClick={() => setShowCreateTenant(true)}
                    className="mt-4"
                  >
                    Criar Primeiro Tenant
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Instructions */}
      <Card variant="glass">
        <CardBody className="p-4">
          <h4 className="font-semibold text-primary mb-2">💡 Como Usar:</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>• <strong>Pessoa Física (PF):</strong> Para corretores autônomos - campos CPF, nome completo</div>
            <div>• <strong>Pessoa Jurídica (PJ):</strong> Para imobiliárias - campos CNPJ, razão social</div>
            <div>• <strong>Busca por CEP:</strong> Digite o CEP e o endereço é preenchido automaticamente</div>
            <div>• <strong>Admin Tenant:</strong> Cada tenant recebe um usuário administrador para gestão</div>
            <div>• Campos obrigatórios estão marcados com asterisco (*)</div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default TenantsManagementPage;
