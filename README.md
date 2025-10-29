# QuadraDois - Plataforma Multi-tenant de Gestão Imobiliária

Sistema completo de gestão de imóveis com integração ao CanalPro (Grupo ZAP), desenvolvido com arquitetura multi-tenant para suportar múltiplas imobiliárias.

## 🏗️ Arquitetura

- **Backend:** Python 3.11 + Flask + SQLAlchemy + Celery
- **Frontend:** React 18.3.1 + TypeScript + Vite + TailwindCSS
- **Business Center:** React (Dashboard SaaS para gestão de tenants)
- **Database:** PostgreSQL 15
- **Cache/Queue:** Redis 7
- **Orquestração:** Docker + Docker Compose
- **Gateway:** Nginx (reverse proxy + rate limiting)

## 🚀 Deploy em Produção

Para fazer o deploy completo do sistema em um servidor VPS:

1. **Guia completo de deploy:** [GUIA_DEPLOY.md](./GUIA_DEPLOY.md)

### Deploy Rápido

```bash
# 1. Clone o repositório
git clone <seu-repositorio> /var/www/quadradois
cd /var/www/quadradois

# 2. Configure as variáveis de ambiente (nunca commit valores reais)
cp .env.example .env
nano .env  # Preencha com credenciais seguras (AWS mantidas)

# 3. Execute o deploy
python backend/scripts/deploy/manage.py check
python backend/scripts/deploy/manage.py deploy --env production
```

## 📦 Estrutura do Projeto

```text
quadradois/
├── backend/              # API Flask + Celery
│   ├── api/             # Endpoints REST
│   ├── auth/            # Autenticação JWT
│   ├── models/          # Models SQLAlchemy
│   ├── tasks/           # Tarefas Celery
│   ├── integrations/    # CanalPro API
│   └── Dockerfile.prod  # Build de produção
├── frontend/            # App React (Gestão de Imóveis)
│   ├── src/
│   └── Dockerfile.prod
├── business-center/     # Dashboard SaaS
│   ├── src/
│   └── Dockerfile.prod
├── nginx/               # Gateway configuration
│   ├── nginx.conf
│   └── conf.d/
├── backend/scripts/deploy/  # Ferramentas de deploy automatizado
│   ├── deploy.sh            # Script principal (Linux)
│   └── manage.py            # CLI cross-platform para deploy/backup
├── docker-compose.yml   # Orquestração (produção)
├── docker-compose.dev.yml  # Stack de desenvolvimento (opcional)
└── .env                 # Arquivo real (NÃO versionado) baseado no template
```

## 🔧 Desenvolvimento Local

1. Copie o template de variáveis de ambiente para uso local ou produção:

   ```bash
   cp .env.example .env
   # edite a cópia com credenciais do ambiente desejado
   ```

   > ⚠️ Nunca reutilize as chaves/ferramentas de produção no ambiente de desenvolvimento.

2. Suba a stack completa com Docker (opcional, recomendado):

   ```bash
   docker compose up --build
   ```

   O backend ficará disponível em `http://localhost:5000`, o CRM em `http://localhost:5173` e o Business Center em `http://localhost:4000`.

3. Para rodar cada serviço manualmente, siga os passos abaixo.

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
flask run
```

### Frontend

```bash
cd frontend
npm install
npm run dev  # http://localhost:5174
```

### Business Center

```bash
cd business-center
npm install
npm run dev  # http://localhost:4000
```

## 🛠️ Comandos Úteis

```bash
# Ver logs de um serviço
python backend/scripts/deploy/manage.py logs --service backend --follow

# Fazer backup manual
python backend/scripts/deploy/manage.py backup --env production

# Restaurar de um backup
./scripts/rollback.sh 2025-10-24_14-30-00

# Restart de serviços
docker compose restart backend

# Ver status dos containers
docker compose ps
```

## 🔐 Segurança

- ✅ Isolamento multi-tenant em todas as queries
- ✅ Autenticação JWT com refresh tokens
- ✅ Rate limiting (10 req/s API, 5 req/s auth)
- ✅ CORS configurado por tenant
- ✅ Criptografia Fernet para dados sensíveis
- ✅ Validação de permissões cross-tenant

## 📊 Funcionalidades

### Frontend (Imobiliária)

- ✅ Gestão completa de imóveis
- ✅ Integração com CanalPro (importação/exportação)
- ✅ Sistema de fotos com S3
- ✅ Gestão de destaques
- ✅ Renovação automática de anúncios
- ✅ Mapeamento inteligente de categorias

### Business Center (Admin)

- ✅ Gestão de tenants (imobiliárias)
- ✅ Monitoramento de tokens
- ✅ Dashboard de uso
- ✅ Configuração de planos
- ✅ Gestão de usuários

## 🌐 Integrações

- **CanalPro API:** Sincronização bidirecional de imóveis
- **AWS S3:** Armazenamento de fotos (bucket: quadra-fotos)
- **Redis:** Cache e fila de tarefas
- **Celery Beat:** Agendamento de renovações

## 📝 Variáveis de Ambiente Essenciais

```bash
# Database
DATABASE_URL=postgresql://<db_user>:<db_password>@<db_host>:<db_port>/<db_name>

# Security
SECRET_KEY=<generate-with-secrets.token_hex(32)>
JWT_SECRET_KEY=<generate-with-secrets.token_hex(32)>
FERNET_KEY=<generate-with-Fernet.generate_key()>

# AWS S3
AWS_ACCESS_KEY_ID=<your-aws-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-access-key>
AWS_S3_BUCKET_NAME=<your-s3-bucket-name>
AWS_S3_REGION=<aws-region>

# Redis
REDIS_URL=redis://<redis_host>:<redis_port>/<db_index>
```

## 🆘 Suporte

- **Guia de Deploy:** [GUIA_DEPLOY.md](./GUIA_DEPLOY.md)

## 📄 Licença

Proprietary - QuadraDois © 2024-2025
