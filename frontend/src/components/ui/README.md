# 🎨 Quadradois UI Components

Biblioteca de componentes UI modernos e reutilizáveis para o Quadradois.

## 🚀 Componentes Disponíveis

### Button
Botão com múltiplas variantes e estados.

```tsx
import Button from '@/components/ui/Button';

// Variantes
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="gradient">Gradient</Button>
<Button variant="glass">Glass</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>

// Com ícone
<Button icon={<Plus />} iconPosition="left">Adicionar</Button>

// Loading state
<Button loading>Carregando...</Button>
```

### Input
Input com label flutuante, ícones e validação.

```tsx
import Input from '@/components/ui/Input';
import { Mail, Lock } from 'lucide-react';

<Input
  label="Email"
  type="email"
  icon={<Mail className="h-5 w-5" />}
  placeholder="seu@email.com"
  helperText="Digite seu email"
  error={errors.email?.message}
/>
```

### Card
Cards com variantes modernas.

```tsx
import Card, { CardHeader, CardBody, CardFooter } from '@/components/ui/Card';

<Card variant="glass" hover>
  <CardHeader>
    <h3>Título</h3>
  </CardHeader>
  <CardBody>
    Conteúdo do card
  </CardBody>
  <CardFooter>
    <Button>Ação</Button>
  </CardFooter>
</Card>
```

### GlassCard
Card com efeito glassmorphism.

```tsx
import GlassCard from '@/components/ui/GlassCard';

<GlassCard gradient hover>
  <div className="p-6">
    Conteúdo com efeito glass
  </div>
</GlassCard>
```

### Tooltip
Tooltip com posicionamento flexível.

```tsx
import Tooltip from '@/components/ui/Tooltip';

<Tooltip content="Informação útil" position="top">
  <Button>Hover me</Button>
</Tooltip>
```

### Skeleton
Loading skeletons para melhor UX.

```tsx
import Skeleton, { SkeletonCard, SkeletonList } from '@/components/ui/Skeleton';

// Skeleton básico
<Skeleton width={200} height={20} />

// Card skeleton
<SkeletonCard />

// List skeleton
<SkeletonList count={5} />
```

### DropdownMenu
Menu dropdown moderno.

```tsx
import DropdownMenu from '@/components/ui/DropdownMenu';
import { Edit, Trash, Copy } from 'lucide-react';

<DropdownMenu
  trigger={<Button>Ações</Button>}
  items={[
    { label: 'Editar', icon: <Edit />, onClick: handleEdit },
    { label: 'Copiar', icon: <Copy />, onClick: handleCopy },
    { divider: true },
    { label: 'Excluir', icon: <Trash />, onClick: handleDelete, danger: true },
  ]}
/>
```

### IllustratedEmptyState
Estado vazio com ilustração.

```tsx
import IllustratedEmptyState from '@/components/EmptyState/IllustratedEmptyState';
import { Home } from 'lucide-react';

<IllustratedEmptyState
  icon={Home}
  title="Nenhum imóvel encontrado"
  description="Comece adicionando seu primeiro imóvel"
  actionLabel="Adicionar Imóvel"
  onAction={handleAdd}
  variant="gradient"
/>
```

### StatusPill
Badge de status com ícones.

```tsx
import StatusPill from '@/components/ui/StatusPill';

<StatusPill status="synced" showIcon />
<StatusPill status="pending" />
<StatusPill status="error" />
```

## 🎨 Classes de Animação

### Fade Animations
```tsx
<div className="animate-fade-in">Fade in</div>
<div className="animate-fade-in-up">Fade in up</div>
<div className="animate-fade-in-down">Fade in down</div>
```

### Slide Animations
```tsx
<div className="animate-slide-in-right">Slide from right</div>
<div className="animate-slide-in-left">Slide from left</div>
```

### Special Effects
```tsx
<div className="animate-float">Floating element</div>
<div className="animate-glow">Glowing element</div>
<div className="hover-lift">Lift on hover</div>
<div className="glass">Glass morphism</div>
```

### Stagger Lists
```tsx
{items.map((item, i) => (
  <div key={i} className="stagger-item">
    {item}
  </div>
))}
```

## 🎯 Variantes de Gradiente

```tsx
// Gradientes disponíveis no Tailwind
<div className="bg-gradient-primary">Primary gradient</div>
<div className="bg-gradient-accent">Accent gradient</div>
<div className="bg-gradient-success">Success gradient</div>
<div className="bg-gradient-glass">Glass gradient</div>
```

## 💡 Dicas de Uso

1. **Performance**: Use `loading="lazy"` em imagens
2. **Acessibilidade**: Sempre adicione `aria-label` em botões com apenas ícones
3. **Animações**: Use com moderação para não sobrecarregar
4. **Glassmorphism**: Funciona melhor com backgrounds coloridos
5. **Gradientes**: Combine com `hover:` para efeitos interativos

## 🎨 Paleta de Cores

- **Primary**: Azul moderno (#0284c7)
- **Accent**: Magenta vibrante (#d946ef)
- **Success**: Verde (#22c55e)
- **Warning**: Amarelo (#eab308)
- **Danger**: Vermelho (#ef4444)

## 📚 Recursos

- [Tailwind CSS](https://tailwindcss.com)
- [Headless UI](https://headlessui.com)
- [Lucide Icons](https://lucide.dev)