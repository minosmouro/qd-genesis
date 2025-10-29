import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Building2, User, Mail, Phone, MapPin, Key, Sparkles, CheckCircle2 } from 'lucide-react'
import type { CreateImobiliariaPayload } from '@/types'

export type ImobiliariaCreateFormValues = CreateImobiliariaPayload

interface ImobiliariaCreateDialogProps {
  open: boolean
  submitting: boolean
  onClose: () => void
  onSubmit: (values: ImobiliariaCreateFormValues) => Promise<void> | void
}

const defaultValues: ImobiliariaCreateFormValues = {
  name: '',
  tenant_type: 'PJ',
  admin_username: '',
  admin_email: '',
  admin_password: '',
  company_name: '',
  trade_name: '',
  cnpj: '',
  email: '',
  phone: '',
  creci: '',
  zip_code: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  country: 'Brasil',
  cpf: '',
  full_name: '',
  birth_date: ''
}

type Step = 'type' | 'info' | 'contact' | 'admin'

export function ImobiliariaCreateDialog({ open, submitting, onClose, onSubmit }: ImobiliariaCreateDialogProps) {
  const initialValues = useMemo(() => ({ ...defaultValues }), [])
  const [formState, setFormState] = useState<ImobiliariaCreateFormValues>(initialValues)
  const [currentStep, setCurrentStep] = useState<Step>('type')

  useEffect(() => {
    if (open) {
      setFormState({ ...initialValues })
      setCurrentStep('type')
    }
  }, [open, initialValues])

  if (!open) {
    return null
  }

  const isPessoaJuridica = formState.tenant_type === 'PJ'
  const isPessoaFisica = formState.tenant_type === 'PF'

  const steps: Step[] = ['type', 'info', 'contact', 'admin']
  const stepIndex = steps.indexOf(currentStep)
  const progress = ((stepIndex + 1) / steps.length) * 100

  const handleChange = (field: keyof ImobiliariaCreateFormValues) => (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = event.target.value
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    const nextIndex = stepIndex + 1
    if (nextIndex < steps.length) {
      const nextStep = steps[nextIndex]
      if (nextStep) setCurrentStep(nextStep)
    }
  }

  const handleBack = () => {
    const prevIndex = stepIndex - 1
    if (prevIndex >= 0) {
      const prevStep = steps[prevIndex]
      if (prevStep) setCurrentStep(prevStep)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 'type':
        return formState.name.trim().length > 0
      case 'info':
        if (isPessoaJuridica) {
          return formState.company_name && formState.cnpj
        }
        return formState.full_name && formState.cpf
      case 'contact':
        return true
      case 'admin':
        return formState.admin_username && formState.admin_email && formState.admin_password
      default:
        return false
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const payload: ImobiliariaCreateFormValues = {
      ...formState,
      tenant_type: formState.tenant_type,
      cpf: isPessoaFisica ? formState.cpf || undefined : undefined,
      full_name: isPessoaFisica ? formState.full_name || undefined : undefined,
      birth_date: isPessoaFisica ? formState.birth_date || undefined : undefined,
      cnpj: isPessoaJuridica ? formState.cnpj || undefined : undefined,
      company_name: isPessoaJuridica ? formState.company_name || formState.name : undefined,
      trade_name: isPessoaJuridica ? formState.trade_name || undefined : undefined,
      email: formState.email || undefined,
      phone: formState.phone || undefined,
      creci: formState.creci || undefined,
      zip_code: formState.zip_code || undefined,
      street: formState.street || undefined,
      number: formState.number || undefined,
      complement: formState.complement || undefined,
      neighborhood: formState.neighborhood || undefined,
      city: formState.city || undefined,
      state: formState.state ? formState.state.toUpperCase() : undefined,
      country: formState.country || undefined,
      admin_username: formState.admin_username,
      admin_email: formState.admin_email,
      admin_password: formState.admin_password,
      name: formState.name.trim()
    }

    await onSubmit(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 px-8 py-6 text-white overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzMuMzE0IDAgNiAyLjY4NiA2IDZzLTIuNjg2IDYtNiA2LTYtMi42ODYtNi02IDIuNjg2LTYgNi02ek0yNCAzOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
          
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-medium text-purple-200">Nova Imobiliária</span>
              </div>
              <h2 className="text-2xl font-bold">Cadastrar Imobiliária</h2>
              <p className="text-sm text-purple-100 mt-1">Passo {stepIndex + 1} de {steps.length}</p>
            </div>
            
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              disabled={submitting}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="relative mt-6 h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          
          {/* Step 1: Tipo */}
          {currentStep === 'type' && (
            <div className="space-y-6 animate-in slide-in-from-right-5 duration-300">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <Building2 className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Tipo de Cadastro</h3>
                <p className="text-sm text-gray-500">Escolha o tipo de pessoa e informe o nome</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormState(prev => ({ ...prev, tenant_type: 'PJ' }))}
                  className={`
                    p-6 rounded-xl border-2 transition-all duration-200
                    ${formState.tenant_type === 'PJ' 
                      ? 'border-purple-600 bg-purple-50 shadow-lg scale-105' 
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <Building2 className={`h-8 w-8 mx-auto mb-2 ${formState.tenant_type === 'PJ' ? 'text-purple-600' : 'text-gray-400'}`} />
                  <div className="text-sm font-medium text-gray-900">Pessoa Jurídica</div>
                  <div className="text-xs text-gray-500 mt-1">Empresas e CNPJ</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormState(prev => ({ ...prev, tenant_type: 'PF' }))}
                  className={`
                    p-6 rounded-xl border-2 transition-all duration-200
                    ${formState.tenant_type === 'PF' 
                      ? 'border-purple-600 bg-purple-50 shadow-lg scale-105' 
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <User className={`h-8 w-8 mx-auto mb-2 ${formState.tenant_type === 'PF' ? 'text-purple-600' : 'text-gray-400'}`} />
                  <div className="text-sm font-medium text-gray-900">Pessoa Física</div>
                  <div className="text-xs text-gray-500 mt-1">Indivíduos e CPF</div>
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Nome da Imobiliária <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formState.name}
                  onChange={handleChange('name')}
                  placeholder="Ex: Imobiliária Horizonte"
                  className="h-12 text-base"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500">Este será o nome exibido na plataforma</p>
              </div>
            </div>
          )}

          {/* Step 2: Informações */}
          {currentStep === 'info' && (
            <div className="space-y-6 animate-in slide-in-from-right-5 duration-300">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                  {isPessoaJuridica ? <Building2 className="h-8 w-8 text-indigo-600" /> : <User className="h-8 w-8 text-indigo-600" />}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {isPessoaJuridica ? 'Dados da Empresa' : 'Dados Pessoais'}
                </h3>
                <p className="text-sm text-gray-500">Informações para identificação</p>
              </div>

              {isPessoaJuridica && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Razão Social <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formState.company_name}
                      onChange={handleChange('company_name')}
                      placeholder="Ex: Horizonte Administração de Imóveis LTDA"
                      className="h-12"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CNPJ <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formState.cnpj}
                        onChange={handleChange('cnpj')}
                        placeholder="00.000.000/0000-00"
                        className="h-12"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CRECI
                      </label>
                      <Input
                        value={formState.creci}
                        onChange={handleChange('creci')}
                        placeholder="Opcional"
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Fantasia
                    </label>
                    <Input
                      value={formState.trade_name}
                      onChange={handleChange('trade_name')}
                      placeholder="Como a empresa é conhecida no mercado"
                      className="h-12"
                    />
                  </div>
                </div>
              )}

              {isPessoaFisica && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formState.full_name}
                      onChange={handleChange('full_name')}
                      placeholder="Ex: Maria Silva Santos"
                      className="h-12"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CPF <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={formState.cpf}
                        onChange={handleChange('cpf')}
                        placeholder="000.000.000-00"
                        className="h-12"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data de Nascimento
                      </label>
                      <Input
                        type="date"
                        value={formState.birth_date}
                        onChange={handleChange('birth_date')}
                        className="h-12"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Contato */}
          {currentStep === 'contact' && (
            <div className="space-y-6 animate-in slide-in-from-right-5 duration-300">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <MapPin className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Contato e Endereço</h3>
                <p className="text-sm text-gray-500">Informações opcionais para contato</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="h-4 w-4 inline mr-1" />
                      E-mail
                    </label>
                    <Input
                      type="email"
                      value={formState.email}
                      onChange={handleChange('email')}
                      placeholder="contato@empresa.com"
                      className="h-12"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="h-4 w-4 inline mr-1" />
                      Telefone
                    </label>
                    <Input
                      value={formState.phone}
                      onChange={handleChange('phone')}
                      placeholder="(11) 91234-5678"
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                    <Input
                      value={formState.zip_code}
                      onChange={handleChange('zip_code')}
                      placeholder="00000-000"
                      className="h-12"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                    <Input
                      value={formState.city}
                      onChange={handleChange('city')}
                      placeholder="Ex: São Paulo"
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rua</label>
                    <Input
                      value={formState.street}
                      onChange={handleChange('street')}
                      placeholder="Nome da rua"
                      className="h-12"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                    <Input
                      maxLength={2}
                      value={formState.state}
                      onChange={(e) => setFormState(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                      placeholder="SP"
                      className="h-12 text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Admin */}
          {currentStep === 'admin' && (
            <div className="space-y-6 animate-in slide-in-from-right-5 duration-300">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <Key className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Administrador</h3>
                <p className="text-sm text-gray-500">Credenciais de acesso do admin principal</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usuário de Acesso <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formState.admin_username}
                    onChange={handleChange('admin_username')}
                    placeholder="Ex: admin.horizonte"
                    className="h-12"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Usado para fazer login no sistema</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail do Administrador <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={formState.admin_email}
                    onChange={handleChange('admin_email')}
                    placeholder="admin@empresa.com"
                    className="h-12"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha Inicial <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    value={formState.admin_password}
                    onChange={handleChange('admin_password')}
                    placeholder="Mínimo 6 caracteres"
                    className="h-12"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">O administrador poderá alterar depois</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium mb-1">Pronto para finalizar!</p>
                      <p className="text-green-700">Clique em "Criar Imobiliária" para cadastrar na plataforma.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={stepIndex === 0 || submitting}
              className="h-11"
            >
              Voltar
            </Button>

            <div className="flex gap-2">
              {stepIndex < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed() || submitting}
                  className="h-11 px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  Próximo
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!canProceed() || submitting}
                  className="h-11 px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Criando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Criar Imobiliária
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// Aliases para compatibilidade com código existente
export { ImobiliariaCreateDialog as TenantCreateDialog }
export type { ImobiliariaCreateFormValues as TenantCreateFormValues }
export type { ImobiliariaCreateDialogProps as TenantCreateDialogProps }
