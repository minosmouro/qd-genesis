import { useEffect, useMemo, useState } from 'react'
import { Tenant } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface TenantFormValues {
  name: string
  tenant_type: 'PF' | 'PJ'
  email?: string
  phone?: string
  city?: string
  state?: string
  zip_code?: string
  address?: string
}

interface TenantManagementDialogProps {
  tenant: Tenant | null
  open: boolean
  submitting: boolean
  onClose: () => void
  onSubmit: (values: TenantFormValues) => Promise<void> | void
}

export function TenantManagementDialog({
  tenant,
  open,
  submitting,
  onClose,
  onSubmit
}: TenantManagementDialogProps) {
  const [formState, setFormState] = useState<TenantFormValues | null>(null)
  const tenantName = useMemo(() => tenant?.name ?? '', [tenant])

  useEffect(() => {
    if (tenant) {
      setFormState({
        name: tenant.name,
        tenant_type: (tenant.tenant_type as 'PF' | 'PJ') ?? 'PJ',
        email: tenant.email ?? '',
        phone: tenant.phone ?? '',
        city: tenant.city ?? '',
        state: tenant.state ?? '',
        zip_code: tenant.zip_code ?? '',
        address: tenant.address ?? ''
      })
    } else {
      setFormState(null)
    }
  }, [tenant])

  if (!open || !tenant || !formState) {
    return null
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(formState)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Gerenciar Tenant</p>
            <h2 className="text-xl font-semibold text-gray-900">{tenantName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted-foreground transition hover:text-gray-900"
          >
            Fechar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 px-6 py-6">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="tenant-name">
              Nome fantasia / Razão social
            </label>
            <Input
              id="tenant-name"
              value={formState.name}
              onChange={(event) => setFormState((prev) => prev ? { ...prev, name: event.target.value } : prev)}
              placeholder="Ex: Imobiliária Silva & Santos"
              required
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="tenant-email">
              E-mail principal
            </label>
            <Input
              id="tenant-email"
              type="email"
              value={formState.email}
              onChange={(event) => setFormState((prev) => prev ? { ...prev, email: event.target.value } : prev)}
              placeholder="contato@empresa.com"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="tenant-phone">
                Telefone
              </label>
              <Input
                id="tenant-phone"
                value={formState.phone}
                onChange={(event) => setFormState((prev) => prev ? { ...prev, phone: event.target.value } : prev)}
                placeholder="(11) 91234-5678"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="tenant-type">
                Tipo
              </label>
              <select
                id="tenant-type"
                value={formState.tenant_type}
                onChange={(event) => setFormState((prev) => prev ? { ...prev, tenant_type: event.target.value as 'PF' | 'PJ' } : prev)}
                className="h-10 rounded-md border border-input bg-white px-3 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-purple-500"
              >
                <option value="PJ">Pessoa Jurídica</option>
                <option value="PF">Pessoa Física</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="tenant-city">
                Cidade
              </label>
              <Input
                id="tenant-city"
                value={formState.city}
                onChange={(event) => setFormState((prev) => prev ? { ...prev, city: event.target.value } : prev)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="tenant-state">
                Estado
              </label>
              <Input
                id="tenant-state"
                maxLength={2}
                value={formState.state}
                onChange={(event) => setFormState((prev) => prev ? { ...prev, state: event.target.value.toUpperCase() } : prev)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="tenant-address">
              Endereço completo
            </label>
            <Input
              id="tenant-address"
              value={formState.address}
              onChange={(event) => setFormState((prev) => prev ? { ...prev, address: event.target.value } : prev)}
              placeholder="Rua, número, complemento"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
