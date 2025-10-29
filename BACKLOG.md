# 📋 BACKLOG - QuadraDois CRM

> **Última atualização:** 27 de outubro de 2025
> **Versão atual:** 2.0.0

---

## 📊 Legenda de Prioridades

- 🔴 **P0 - CRÍTICO** - Bugs que quebram o sistema, segurança, perda de dados
- 🟠 **P1 - ALTA** - Features essenciais, melhorias importantes de UX
- 🟡 **P2 - MÉDIA** - Melhorias desejáveis, otimizações
- 🟢 **P3 - BAIXA** - Nice to have, polimento, refatorações

---

## 🔥 SPRINT ATUAL (Sprint 15)

### 🎯 Objetivos da Sprint
- Estabilizar ambiente Docker
- Resolver problemas de CORS
- Documentar sistema

### ✅ Concluído
- [x] Dockerização completa do ambiente
- [x] Correção de CORS (backend + frontend)
- [x] Sistema de criação automática de superusuário
- [x] Healthchecks em todos os containers
- [x] Documentação de desenvolvimento

### 🚧 Em Progresso
Nenhum item em progresso no momento.

### 📋 Próximos Passos Planejados

## 🔥 CORREÇÕES IDENTIFICADAS NO DEPLOY (27/10/2025)

### 🔴 P0 - CRÍTICO (Bloqueiam Deploy)

#### 1. **[DEPLOY-001] CORS: Frontend chama localhost em produção**
- **Problema:** Frontend usa `http://localhost:5000` em vez da API de produção
- **Impacto:** Login e todas APIs falham em produção (CORS blocked)
- **Causa Raiz:** `frontend/.env` tem `VITE_API_URL=http://localhost:5000`
- **Solução:**
  - ✅ Já modificado: `api.ts` usa `import.meta.env.DEV` para detectar ambiente
  - ✅ Já modificado: `vite.config.ts` proxy para `/auth`
  - ⏳ **Pendente:** Testar no dev com Docker limpo
  - ⏳ **Pendente:** Commitar após validação
- **Arquivos:** 
  - `frontend/src/services/api.ts`
  - `frontend/vite.config.ts`
  - `frontend/.env` (ajustar local)
- **Estimativa:** 1h (teste + commit)
- **Referência:** Commit e44f3e3, 95c48a1

#### 2. **[DEPLOY-002] Business Center - mesma correção CORS**
- **Problema:** Business Center pode ter mesmo problema de CORS
- **Impacto:** Falha no acesso à API em produção
- **Solução:** Aplicar mesma estratégia do frontend
- **Arquivos:**
  - `business-center/src/services/api.ts` (verificar se existe)
  - `business-center/vite.config.ts` (já tem proxy /api e /auth)
- **Estimativa:** 30min
- **Dependência:** DEPLOY-001

### 🟠 P1 - ALTA (Melhorias Importantes)

#### 3. **[DEPLOY-003] Nginx Gateway para Produção**
- **Problema:** Produção usa Vite dev server (anti-pattern)
- **Impacto:** Performance, segurança, não é profissional
- **Solução:** Implementar Nginx como gateway único
  - Build estático do frontend
  - Nginx roteia `/` → frontend estático
  - Nginx roteia `/api` e `/auth` → backend
  - Domínio único: `app.quadradois.com.br`
- **Arquivos:**
  - Criar: `nginx/nginx.conf` (gateway config)
  - Criar: `docker-compose.prod.yml` (ambiente produção)
  - Criar: `frontend/Dockerfile.prod` (build estático)
  - Criar: `business-center/Dockerfile.prod` (build estático)
- **Estimativa:** 4h
- **Benefícios:**
  - ✅ Performance (cache de assets)
  - ✅ Segurança (rate limiting, SSL único)
  - ✅ Escalabilidade (load balancing futuro)
  - ✅ Padrão da indústria

#### 4. **[DEPLOY-004] Script de Pré-Deploy Validation**
- **Problema:** Deploy revela erros que deveriam ser detectados antes
- **Solução:** Script automatizado que valida:
  - ✅ `.env` tem variáveis corretas
  - ✅ `.env.production` existe
  - ✅ `vite.config.ts` tem allowedHosts
  - ✅ Backend CORS inclui domínios de produção
  - ✅ Scripts têm permissão de execução (+x)
  - ✅ Dockerfiles não têm duplicações
- **Arquivo:** `scripts/pre-deploy-check.sh` (já existe - melhorar)
- **Estimativa:** 2h

#### 5. **[DEPLOY-005] Documentação: Diferenças Dev vs Prod**
- **Problema:** Não está claro como cada ambiente funciona
- **Solução:** Documentar arquitetura:
  - Dev: Vite proxy interno
  - Prod: Nginx gateway
  - Diagrama de fluxo de requisições
  - Checklist de deploy
- **Arquivo:** `docs/ARQUITETURA_AMBIENTES.md` (criar)
- **Estimativa:** 1h

### 🟡 P2 - MÉDIA (Melhorias Desejáveis)

#### 6. **[DEPLOY-006] CI/CD Pipeline**
- **Problema:** Deploy é manual e propenso a erros
- **Solução:** GitHub Actions para:
  - Build automático
  - Testes antes de deploy
  - Deploy automático em staging
  - Deploy manual em produção (com aprovação)
- **Estimativa:** 6h

#### 7. **[DEPLOY-007] Docker Multi-Stage Build**
- **Problema:** Imagens de produção grandes (contém dev dependencies)
- **Solução:** Multi-stage builds otimizados
- **Estimativa:** 2h

### 🟢 P3 - BAIXA (Polimento)

#### 8. **[DEPLOY-008] Consolidar scripts wait-for-it.sh**
- **Problema:** Dois arquivos `wait-for-it.sh` (raiz e backend/scripts)
- **Impacto:** Confusão, manutenção duplicada
- **Solução:** Manter apenas um, ajustar referências
- **Estimativa:** 30min

---

## 📊 OUTRAS TAREFAS (Backlog Anterior)

### 🔴 P0 - CRÍTICO

1. **Resolver P0 (Críticos):**
   - [ ] Fix healthcheck do Qdrant (1h)
   - [ ] Rate limiting em produção (4h)
   - [ ] Revisar vazamento de tokens em logs (2h)

2. **Planning Sprint 16:**
   - [ ] Escolher 2-3 itens de P1 (20-30h total)
   - [ ] Sistema de backup automático
   - [ ] Implementar retry de jobs com falha
   - [ ] Monitoramento e alertas

3. **Manutenção:**
   - [ ] Revisar prioridades semanalmente
   - [ ] Atualizar backlog com novos itens

---

## 🔴 P0 - CRÍTICO (Resolver Imediatamente)

### 🐛 Bugs Críticos
Nenhum bug crítico identificado no momento ✅

### 🔒 Segurança
- [ ] **Implementar rate limiting em produção**
  - Descrição: Proteger endpoints críticos contra brute force
  - Arquivos: `backend/config.py`, nginx configs
  - Estimativa: 4h
  - Labels: `security`, `backend`

- [ ] **Revisar vazamento de tokens em logs**
  - Descrição: Garantir que tokens não sejam logados em produção
  - Referência: `docs/CORRECAO_SEGURANCA_LOGS_PRODUCAO.md`
  - Arquivos: `backend/utils/logging_config.py`
  - Estimativa: 2h
  - Labels: `security`, `logging`

### 💥 Infraestrutura
- [ ] **Fix healthcheck do Qdrant**
  - Descrição: Container qdrant está unhealthy - falta curl
  - Arquivo: `docker-compose.yml`
  - Estimativa: 1h
  - Labels: `docker`, `infra`

---

## 🟠 P1 - ALTA (Próximas 2 Sprints)

### ✨ Features Essenciais

- [ ] **Sistema de Backup Automático**
  - Descrição: Backup diário do PostgreSQL + S3 upload
  - Arquivos: Novo script `scripts/backup.sh`
  - Estimativa: 8h
  - Labels: `infra`, `data-protection`
  - Detalhes:
    - Backup incremental PostgreSQL
    - Upload para S3
    - Rotação de backups (manter últimos 30 dias)
    - Notificação em caso de falha

- [ ] **Monitoramento e Alertas**
  - Descrição: Integrar Sentry ou similar para tracking de erros
  - Arquivos: `backend/app.py`, `frontend/src/main.tsx`
  - Estimativa: 6h
  - Labels: `monitoring`, `devops`

- [ ] **Implementar retry de jobs com falha**
  - Descrição: Permitir retentar refresh jobs que falharam
  - Referência: `frontend/src/pages/RefreshSchedulePage.tsx` linha 150
  - Arquivos: `backend/tasks/`, `frontend/src/services/refresh.service.ts`
  - Estimativa: 8h
  - Labels: `feature`, `canalpro`

### 🔧 Melhorias Importantes

- [ ] **Migrar para PostgreSQL 16**
  - Descrição: Atualizar versão do banco para melhor performance
  - Arquivo: `docker-compose.yml`
  - Estimativa: 4h (+ testes)
  - Labels: `database`, `upgrade`

- [ ] **Otimizar queries lentas**
  - Descrição: Adicionar índices em queries identificadas como lentas
  - Arquivos: `backend/models/`, migrations
  - Estimativa: 12h
  - Labels: `performance`, `database`

---

## 🟡 P2 - MÉDIA (Próximos 2 Meses)

### 🎨 UX/UI

- [ ] **Tradução completa para PT-BR**
  - Descrição: Traduzir mensagens de erro e interface
  - Referência: `docs/ANALISE_TRADUCAO_PT_BR.md`
  - Estimativa: 22-32h
  - Labels: `ux`, `i18n`
  - Status: Aguardando aprovação
  - Fases:
    - Fase 1: Mensagens de erro e interface (22-32h)
    - Fase 2: URLs e redirects (18-26h) - opcional

- [ ] **Dashboard de Analytics**
  - Descrição: Gráficos de uso, métricas de conversão, KPIs
  - Arquivos: Novo componente `frontend/src/pages/AnalyticsPage.tsx`
  - Estimativa: 16h
  - Labels: `feature`, `analytics`

- [ ] **Dark Mode completo**
  - Descrição: Garantir que todos os componentes suportam dark mode
  - Arquivos: `frontend/src/contexts/ThemeContext.tsx`, CSS
  - Estimativa: 8h
  - Labels: `ux`, `design`

### 🔄 Integrações

- [ ] **Integração com WhatsApp Business**
  - Descrição: Permitir envio de notificações via WhatsApp
  - Estimativa: 24h
  - Labels: `feature`, `integration`

- [ ] **Export para Excel avançado**
  - Descrição: Permitir export de relatórios customizados
  - Arquivos: `backend/api/`, `frontend/src/services/`
  - Estimativa: 12h
  - Labels: `feature`, `export`

### 🏗️ Arquitetura

- [ ] **Implementar cache Redis para queries frequentes**
  - Descrição: Cachear listagens e estatísticas
  - Arquivos: `backend/utils/cache.py`
  - Estimativa: 16h
  - Labels: `performance`, `backend`

- [ ] **WebSockets para atualizações em tempo real**
  - Descrição: Push de notificações e atualizações de status
  - Estimativa: 24h
  - Labels: `feature`, `realtime`

---

## 🟢 P3 - BAIXA (Backlog / Quando Houver Tempo)

### 📚 Documentação

- [ ] **Documentação de API (Swagger/OpenAPI)**
  - Descrição: Gerar docs automáticas para API REST
  - Arquivos: `backend/api_docs.py`
  - Estimativa: 8h
  - Labels: `docs`, `api`

- [ ] **Guia de onboarding para novos desenvolvedores**
  - Descrição: Tutorial passo a passo para setup local
  - Arquivo: Novo `docs/ONBOARDING.md`
  - Estimativa: 4h
  - Labels: `docs`, `dx`

### 🧪 Testes

- [ ] **Aumentar cobertura de testes backend**
  - Descrição: Atingir 80% de cobertura
  - Arquivos: `backend/tests/`
  - Estimativa: 40h
  - Labels: `testing`, `quality`

- [ ] **Testes E2E com Playwright**
  - Descrição: Testes de fluxo completo (login, criar imóvel, etc)
  - Estimativa: 32h
  - Labels: `testing`, `e2e`

### 🎨 Polimento

- [ ] **Animações e transições melhoradas**
  - Descrição: Adicionar micro-interações com Framer Motion
  - Arquivos: Diversos componentes
  - Estimativa: 16h
  - Labels: `ux`, `animation`

- [ ] **Modo offline (PWA)**
  - Descrição: Permitir uso básico sem conexão
  - Estimativa: 40h
  - Labels: `feature`, `pwa`

### 🔨 Refatoração

- [ ] **Migrar de Class Components para Hooks** (se houver)
  - Descrição: Modernizar componentes antigos
  - Estimativa: 16h
  - Labels: `refactor`, `frontend`

- [ ] **Separar lógica de negócio em services**
  - Descrição: Extrair lógica complexa de componentes
  - Estimativa: 24h
  - Labels: `refactor`, `architecture`

---

## 🗂️ ICEBOX (Ideias para Futuro Distante)

### 💡 Ideias

- [ ] **App Mobile (React Native)**
  - Descrição: Versão mobile nativa do CRM
  - Estimativa: 200h+
  - Labels: `mobile`, `epic`

- [ ] **IA para descrição automática de imóveis**
  - Descrição: Usar GPT-4 para gerar descrições atrativas
  - Referência: `backend/routes/ai_description.py` (já existe!)
  - Estimativa: 16h (melhorias)
  - Labels: `ai`, `feature`

- [ ] **Marketplace de plugins**
  - Descrição: Permitir extensões de terceiros
  - Estimativa: 80h+
  - Labels: `platform`, `epic`

- [ ] **Multi-idioma (EN, ES)**
  - Descrição: Expandir além de PT-BR
  - Dependências: Tradução PT-BR completa
  - Estimativa: 40h
  - Labels: `i18n`, `expansion`

---

## 📈 Métricas e Objetivos

### 🎯 Objetivos Q4 2025
- [ ] Deploy em produção estável (99.9% uptime)
- [ ] 5 tenants ativos na plataforma
- [ ] Tempo de resposta médio < 200ms
- [ ] Zero incidentes críticos de segurança

### 📊 Indicadores de Sucesso
- **Performance:** Lighthouse score > 90
- **Qualidade:** Cobertura de testes > 70%
- **Disponibilidade:** Uptime > 99.5%
- **UX:** NPS > 8.0

---

## 🔄 Processo de Gestão do Backlog

### Como Adicionar Itens
1. Criar issue no GitHub com template adequado
2. Adicionar labels apropriadas
3. Definir prioridade (P0-P3)
4. Estimar esforço (horas)
5. Atualizar este BACKLOG.md

### Revisão de Prioridades
- **Semanal:** Revisar P0 e P1
- **Quinzenal:** Planning da próxima sprint
- **Mensal:** Revisar roadmap completo

### Critérios de Priorização
1. **Impacto em usuários** (Alto = P0/P1)
2. **Valor de negócio** (ROI esperado)
3. **Esforço técnico** (Quick wins = alta prioridade)
4. **Dependências** (Blockers = P0)
5. **Risco/Dívida técnica**

---

## 📝 Notas

### Links Úteis
- [Documentação de Deploy](./DEPLOY.md)
- [Guia de Desenvolvimento](./DESENVOLVIMENTO.md)
- [Análise de Tradução PT-BR](./docs/ANALISE_TRADUCAO_PT_BR.md)
- [Documentação de API](./backend/properties/README.md)

### Convenções
- **Estimativas:** Em horas de desenvolvimento
- **Labels:** Usar padrão GitHub (feature, bug, docs, etc)
- **Sprints:** 2 semanas de duração
- **Definition of Done:**
  - Código revisado (PR aprovado)
  - Testes passando
  - Documentação atualizada
  - Deploy em staging OK

---

## 🤝 Como Contribuir

1. Escolha um item do backlog
2. Crie uma branch: `feature/nome-da-feature` ou `fix/nome-do-bug`
3. Desenvolva seguindo os padrões do projeto
4. Abra PR com descrição detalhada
5. Aguarde code review
6. Merge após aprovação

---

**Última atualização:** 27 de outubro de 2025 por GitHub Copilot
**Próxima revisão:** Sprint Planning (10 de novembro de 2025)
