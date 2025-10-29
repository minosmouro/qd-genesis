// EXEMPLO: Como usar o StandardCockpit em suas páginas
//
// Este arquivo mostra como implementar o cockpit padronizado
// em diferentes cenários dentro do módulo de imóveis

import { useNavigate } from 'react-router-dom';
import { Plus, Download, Settings, Filter } from 'lucide-react';
import StandardCockpit from '../components/StandardCockpit';
import Button from '@/components/ui/Button';

// ===== EXEMPLO 1: Página de listagem de imóveis =====
export const PropertiesListPage = () => {
   
   return (
    <>
      <StandardCockpit
        title="Imóveis"
        subtitle="123 imóveis cadastrados"
        variant="default" // Altura padrão: 80px
        actions={
          <>
            <Button size="sm" variant="ghost">
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
            <Button size="sm" variant="secondary">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button size="sm" variant="primary">
              <Plus className="w-4 h-4" />
              Novo Imóvel
            </Button>
          </>
        }
      />

      {/* Conteúdo da página aqui */}
      <div className="p-4">
        <h2>Lista de imóveis...</h2>
      </div>
    </>
  );
};

// ===== EXEMPLO 2: Página de visualização de imóvel =====
export const PropertyViewPage = () => {
  // navigate é usado somente para onBack no exemplo abaixo
  const navigate = useNavigate();

  return (
    <>
      <StandardCockpit
        title="Casa em Copacabana"
        subtitle="Ref: IMV-001 • Disponível"
        variant="expanded" // Altura maior: 100px (para mais informações)
        onBack={() => navigate('/properties')}
        actions={
          <>
            <Button size="sm" variant="secondary">
              Duplicar
            </Button>
            <Button size="sm" variant="primary">
              <Settings className="w-4 h-4" />
              Editar
            </Button>
          </>
        }
      />

      {/* Conteúdo da página aqui */}
      <div className="p-4">
        <h2>Detalhes do imóvel...</h2>
      </div>
    </>
  );
};

// ===== EXEMPLO 3: Página de cadastro/edição (compacta) =====
export const PropertyFormPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <StandardCockpit
        title="Novo Imóvel"
        variant="compact" // Altura menor: 60px (para economizar espaço)
        onBack={() => navigate('/properties')}
        actions={
          <>
            <Button size="sm" variant="ghost">
              Cancelar
            </Button>
            <Button size="sm" variant="primary">
              Salvar
            </Button>
          </>
        }
      />

      {/* Formulário aqui */}
      <div className="p-4">
        <h2>Formulário de cadastro...</h2>
      </div>
    </>
  );
};

// ===== EXEMPLO 4: Página simples (apenas navegação) =====
export const PropertyReportsPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <StandardCockpit
        title="Relatórios"
        onBack={() => navigate('/properties')}
        // Sem actions, apenas navegação básica
      />

      {/* Conteúdo da página aqui */}
      <div className="p-4">
        <h2>Relatórios disponíveis...</h2>
      </div>
    </>
  );
};

/* 
RESUMO DE VARIANTES:

• compact (60px): Para formulários e páginas onde precisa economizar espaço
• default (80px): Para a maioria das páginas (padrão)
• expanded (100px): Para páginas com mais informações contextuais

CARACTERÍSTICAS:

✅ Altura fixa e consistente
✅ Posicionamento automático abaixo do header
✅ Z-index adequado (não sobrepõe modais, não é sobreposto pelo conteúdo)
✅ Layout responsivo (mobile + desktop)
✅ Integração automática com o sistema de layout modular
✅ CSS variables dinâmicas (--cockpit-height)
✅ Botão voltar opcional
✅ Ações customizáveis
✅ Menu de opções sempre presente

USO EM SUAS PÁGINAS:

1. Importe o StandardCockpit
2. Use no topo da sua página (antes do conteúdo)
3. Configure título, ações e variante conforme necessário
4. O layout se ajusta automaticamente!

*/
