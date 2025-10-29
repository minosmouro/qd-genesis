import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Plus, MoreVertical, Pencil, Trash2, DollarSign, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { apiService } from '@/services/api'
import { SubscriptionPlan } from '@/types'
import { toast } from 'sonner'

type PlanFormData = {
  name: string
  description: string
  price_monthly: string
  price_quarterly: string
  price_yearly: string
  limits: {
    max_properties: string
    max_users: string
    max_highlights: string
    max_super_highlights: string
  }
  features: {
    api_access: boolean
    custom_domain: boolean
    priority_support: boolean
    analytics: boolean
    white_label: boolean
  }
  is_active: boolean
}

const emptyFormData: PlanFormData = {
  name: '',
  description: '',
  price_monthly: '',
  price_quarterly: '',
  price_yearly: '',
  limits: {
    max_properties: '',
    max_users: '',
    max_highlights: '',
    max_super_highlights: '',
  },
  features: {
    api_access: false,
    custom_domain: false,
    priority_support: false,
    analytics: false,
    white_label: false,
  },
  is_active: true,
}

export function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [formData, setFormData] = useState<PlanFormData>(emptyFormData)
  const [submitting, setSubmitting] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    loadPlans()
  }, [showAll])

  const loadPlans = async () => {
    try {
      setLoading(true)
      const response = await apiService.getSubscriptionPlans(showAll)
      setPlans(response.plans)
    } catch (error: any) {
      toast.error('Erro ao carregar planos', {
        description: error.response?.data?.error || 'Erro desconhecido'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setFormData(emptyFormData)
    setShowCreateDialog(true)
  }

  const handleEdit = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan)
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price_monthly: plan.price_monthly.toString(),
      price_quarterly: (plan.price_quarterly || 0).toString(),
      price_yearly: (plan.price_yearly || 0).toString(),
      limits: {
        max_properties: plan.limits.max_properties.toString(),
        max_users: plan.limits.max_users.toString(),
        max_highlights: plan.limits.max_highlights.toString(),
        max_super_highlights: plan.limits.max_super_highlights.toString(),
      },
      features: { ...plan.features },
      is_active: plan.is_active,
    })
    setShowEditDialog(true)
  }

  const handleDelete = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan)
    setShowDeleteDialog(true)
  }

  const handleSubmitCreate = async () => {
    try {
      setSubmitting(true)
      const payload = {
        name: formData.name,
        description: formData.description || null,
        price_monthly: parseFloat(formData.price_monthly),
        price_quarterly: parseFloat(formData.price_quarterly),
        price_yearly: parseFloat(formData.price_yearly),
        limits: {
          max_properties: parseInt(formData.limits.max_properties),
          max_users: parseInt(formData.limits.max_users),
          max_highlights: parseInt(formData.limits.max_highlights),
          max_super_highlights: parseInt(formData.limits.max_super_highlights),
        },
        features: formData.features,
        is_active: formData.is_active,
      }

      await apiService.createSubscriptionPlan(payload)
      toast.success('Plano criado com sucesso!')
      setShowCreateDialog(false)
      loadPlans()
    } catch (error: any) {
      toast.error('Erro ao criar plano', {
        description: error.response?.data?.error || 'Erro desconhecido'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitEdit = async () => {
    if (!selectedPlan) return

    try {
      setSubmitting(true)
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        price_monthly: parseFloat(formData.price_monthly),
        price_quarterly: parseFloat(formData.price_quarterly),
        price_yearly: parseFloat(formData.price_yearly),
        limits: {
          max_properties: parseInt(formData.limits.max_properties),
          max_users: parseInt(formData.limits.max_users),
          max_highlights: parseInt(formData.limits.max_highlights),
          max_super_highlights: parseInt(formData.limits.max_super_highlights),
        },
        features: formData.features,
        is_active: formData.is_active,
      }

      await apiService.updateSubscriptionPlan(selectedPlan.id, payload)
      toast.success('Plano atualizado com sucesso!')
      setShowEditDialog(false)
      loadPlans()
    } catch (error: any) {
      toast.error('Erro ao atualizar plano', {
        description: error.response?.data?.error || 'Erro desconhecido'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitDelete = async () => {
    if (!selectedPlan) return

    try {
      setSubmitting(true)
      await apiService.deleteSubscriptionPlan(selectedPlan.id)
      toast.success('Plano deletado com sucesso!')
      setShowDeleteDialog(false)
      loadPlans()
    } catch (error: any) {
      toast.error('Erro ao deletar plano', {
        description: error.response?.data?.error || 'Erro desconhecido'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  const renderPlanForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Plano *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Plano Básico"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição do plano..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price_monthly">Preço Mensal (R$) *</Label>
          <Input
            id="price_monthly"
            type="number"
            step="0.01"
            value={formData.price_monthly}
            onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })}
            placeholder="99.90"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price_quarterly">Preço Trimestral (R$) *</Label>
          <Input
            id="price_quarterly"
            type="number"
            step="0.01"
            value={formData.price_quarterly}
            onChange={(e) => setFormData({ ...formData, price_quarterly: e.target.value })}
            placeholder="269.90"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price_yearly">Preço Anual (R$) *</Label>
          <Input
            id="price_yearly"
            type="number"
            step="0.01"
            value={formData.price_yearly}
            onChange={(e) => setFormData({ ...formData, price_yearly: e.target.value })}
            placeholder="999.90"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium mb-4">Limites</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="max_properties">Máx. Imóveis *</Label>
            <Input
              id="max_properties"
              type="number"
              value={formData.limits.max_properties}
              onChange={(e) => setFormData({
                ...formData,
                limits: { ...formData.limits, max_properties: e.target.value }
              })}
              placeholder="100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_users">Máx. Usuários *</Label>
            <Input
              id="max_users"
              type="number"
              value={formData.limits.max_users}
              onChange={(e) => setFormData({
                ...formData,
                limits: { ...formData.limits, max_users: e.target.value }
              })}
              placeholder="5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_highlights">Máx. Destaques *</Label>
            <Input
              id="max_highlights"
              type="number"
              value={formData.limits.max_highlights}
              onChange={(e) => setFormData({
                ...formData,
                limits: { ...formData.limits, max_highlights: e.target.value }
              })}
              placeholder="10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_super_highlights">Máx. Super Destaques *</Label>
            <Input
              id="max_super_highlights"
              type="number"
              value={formData.limits.max_super_highlights}
              onChange={(e) => setFormData({
                ...formData,
                limits: { ...formData.limits, max_super_highlights: e.target.value }
              })}
              placeholder="3"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium mb-4">Recursos Incluídos</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="api_access" className="cursor-pointer">Acesso à API</Label>
            <Switch
              id="api_access"
              checked={formData.features.api_access}
              onCheckedChange={(checked: boolean) => setFormData({
                ...formData,
                features: { ...formData.features, api_access: checked }
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="custom_domain" className="cursor-pointer">Domínio Customizado</Label>
            <Switch
              id="custom_domain"
              checked={formData.features.custom_domain}
              onCheckedChange={(checked: boolean) => setFormData({
                ...formData,
                features: { ...formData.features, custom_domain: checked }
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="priority_support" className="cursor-pointer">Suporte Prioritário</Label>
            <Switch
              id="priority_support"
              checked={formData.features.priority_support}
              onCheckedChange={(checked: boolean) => setFormData({
                ...formData,
                features: { ...formData.features, priority_support: checked }
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="analytics" className="cursor-pointer">Analytics Avançado</Label>
            <Switch
              id="analytics"
              checked={formData.features.analytics}
              onCheckedChange={(checked: boolean) => setFormData({
                ...formData,
                features: { ...formData.features, analytics: checked }
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="white_label" className="cursor-pointer">White Label</Label>
            <Switch
              id="white_label"
              checked={formData.features.white_label}
              onCheckedChange={(checked: boolean) => setFormData({
                ...formData,
                features: { ...formData.features, white_label: checked }
              })}
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="is_active" className="cursor-pointer">Status</Label>
            <p className="text-sm text-gray-500">Plano ativo e disponível para assinatura</p>
          </div>
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked: boolean) => setFormData({ ...formData, is_active: checked })}
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Planos de Assinatura</h1>
          <p className="text-gray-500 mt-1">Gerencie os planos disponíveis para os tenants</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="show_all" className="text-sm">Mostrar inativos</Label>
            <Switch
              id="show_all"
              checked={showAll}
              onCheckedChange={setShowAll}
            />
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Plano
          </Button>
        </div>
      </div>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Planos Cadastrados</CardTitle>
          <CardDescription>
            {plans.length} {plans.length === 1 ? 'plano encontrado' : 'planos encontrados'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum plano cadastrado</p>
              <Button onClick={handleCreate} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Plano
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead>Preços</TableHead>
                  <TableHead>Limites</TableHead>
                  <TableHead>Recursos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        {plan.description && (
                          <p className="text-sm text-gray-500 line-clamp-1">{plan.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p>Mensal: {formatPrice(plan.price_monthly)}</p>
                        <p>Trimestral: {formatPrice(plan.price_quarterly || 0)}</p>
                        <p>Anual: {formatPrice(plan.price_yearly || 0)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p>{plan.limits.max_properties} imóveis</p>
                        <p>{plan.limits.max_users} usuários</p>
                        <p>{plan.limits.max_highlights} destaques</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {plan.features.api_access && (
                          <Badge variant="secondary" className="text-xs">API</Badge>
                        )}
                        {plan.features.custom_domain && (
                          <Badge variant="secondary" className="text-xs">Domínio</Badge>
                        )}
                        {plan.features.priority_support && (
                          <Badge variant="secondary" className="text-xs">Suporte</Badge>
                        )}
                        {plan.features.analytics && (
                          <Badge variant="secondary" className="text-xs">Analytics</Badge>
                        )}
                        {plan.features.white_label && (
                          <Badge variant="secondary" className="text-xs">White Label</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {plan.is_active ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(plan)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(plan)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Plano</DialogTitle>
            <DialogDescription>
              Preencha as informações do novo plano de assinatura
            </DialogDescription>
          </DialogHeader>
          {renderPlanForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitCreate} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Plano'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
            <DialogDescription>
              Atualize as informações do plano {selectedPlan?.name}
            </DialogDescription>
          </DialogHeader>
          {renderPlanForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitEdit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar Plano</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar o plano "{selectedPlan?.name}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-2">
            <p className="text-sm text-yellow-800">
              ⚠️ Atenção: Não é possível deletar planos com assinaturas ativas.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleSubmitDelete} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deletando...
                </>
              ) : (
                'Deletar Plano'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
