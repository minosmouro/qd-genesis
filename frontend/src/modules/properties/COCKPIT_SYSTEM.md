# 🏗️ Sistema de Cockpit Padronizado

Sistema completo para padronização de cockpits no módulo de imóveis, garantindo consistência visual e comportamental em todas as páginas.

## 📋 Visão Geral

**Problema resolvido**: Cada página tinha cockpits com alturas e estilos diferentes, quebrando o layout e criando inconsistências visuais.

**Solução implementada**: Sistema de cockpit padronizado com altura dinâmica, integração automática com o layout e CSS variables.

## 🎯 Componentes do Sistema

### 1. **StandardCockpit** - Componente Principal

```tsx
import StandardCockpit from '@/modules/properties/components/StandardCockpit';

<StandardCockpit
  title="Título da Página"
  subtitle="Subtítulo opcional"
  variant="default" // compact | default | expanded
  onBack={() => navigate('/back')}
  actions={<>Seus botões aqui</>}
/>;
```

### 2. **useCockpitHeight** - Hook de Sincronização

```tsx
import useCockpitHeight from '@/modules/properties/hooks/useCockpitHeight';

// Sincroniza automaticamente a altura com CSS variables
const cockpitHeight = useCockpitHeight();
```

### 3. **PropertiesContext** - Estado Global

Gerencia a altura do cockpit globalmente para todos os componentes do módulo.

## 🎨 Variantes Disponíveis

| Variante   | Altura | Uso Recomendado                                     |
| ---------- | ------ | --------------------------------------------------- |
| `compact`  | 60px   | Formulários, páginas onde precisa economizar espaço |
| `default`  | 80px   | Maioria das páginas (padrão)                        |
| `expanded` | 100px  | Páginas com mais informações contextuais            |

## 🔧 Como Funciona

1. **Componente Monta**: StandardCockpit define sua altura no contexto
2. **Hook Sincroniza**: useCockpitHeight atualiza CSS variable `--cockpit-height`
3. **Layout Adapta**: Classes CSS usam a variável para posicionamento
4. **Resultado**: Layout sempre consistente, independente da altura do cockpit

## 📱 Responsividade

- **Desktop**: Cockpit fixo abaixo do header, aside posicionado automaticamente
- **Mobile**: Cockpit fixo, aside deslizante com posicionamento dinâmico

## 🎯 Integração com Layout Modular

O sistema se integra perfeitamente com as classes CSS modulares:

```css
.module-layout-content {
  padding-top: calc(var(--header-height) + var(--cockpit-height));
}

.module-aside {
  height: calc(100vh - var(--header-height) - var(--cockpit-height));
  margin-top: var(--cockpit-height);
}
```

## 📖 Exemplos Práticos

### Página de Listagem

```tsx
<StandardCockpit
  title="Imóveis"
  subtitle="123 imóveis cadastrados"
  actions={
    <>
      <Button variant="ghost">Filtros</Button>
      <Button variant="primary">Novo Imóvel</Button>
    </>
  }
/>
```

### Página de Visualização

```tsx
<StandardCockpit
  title="Casa em Copacabana"
  subtitle="Ref: IMV-001 • Disponível"
  variant="expanded"
  onBack={() => navigate('/properties')}
  actions={<Button variant="primary">Editar</Button>}
/>
```

### Formulário

```tsx
<StandardCockpit
  title="Novo Imóvel"
  variant="compact"
  onBack={() => navigate('/properties')}
  actions={
    <>
      <Button variant="ghost">Cancelar</Button>
      <Button variant="primary">Salvar</Button>
    </>
  }
/>
```

## ✅ Benefícios

- **Consistência Visual**: Todos os cockpits têm o mesmo estilo
- **Layout Automático**: Posicionamento perfeito em qualquer altura
- **Responsividade**: Funciona em desktop e mobile
- **Flexibilidade**: 3 variantes para diferentes necessidades
- **Manutenibilidade**: Mudanças centralizadas no componente
- **Performance**: CSS variables para transições suaves

## 🚀 Como Implementar em Suas Páginas

1. **Substitua** cockpits existentes pelo StandardCockpit
2. **Configure** título, subtitle e ações conforme necessário
3. **Escolha** a variante apropriada
4. **Pronto!** O layout se ajusta automaticamente

## 🔍 Arquivos do Sistema

```
properties/
├── components/
│   └── StandardCockpit.tsx     # Componente principal
├── hooks/
│   └── useCockpitHeight.ts     # Hook de sincronização
├── examples/
│   └── StandardCockpitExamples.tsx  # Exemplos de uso
├── PropertiesContext.tsx       # Context com estado da altura
└── PropertiesLayout.tsx        # Layout integrado
```

## 🎨 CSS Variables

```css
:root {
  --cockpit-height: 80px; /* Atualizada dinamicamente */
}
```

Esta variável é automaticamente atualizada pelo sistema e usada por todo o layout para posicionamento consistente.

---

**Resultado**: Sistema robusto que resolve definitivamente os problemas de inconsistência de cockpit, garantindo uma experiência visual uniforme em todo o módulo de imóveis! 🎯
