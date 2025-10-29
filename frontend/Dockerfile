# Dockerfile para produção - Frontend QuadraDois
FROM node:18-alpine AS builder

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração
COPY package*.json ./

# Instalar dependências
RUN npm config set strict-ssl false && npm ci --no-verify-ssl && npm config set strict-ssl true

# Copiar código fonte e arquivo .env
COPY . .

# Build da aplicação
RUN npm run build

# Stage 2: Nginx para servir os arquivos estáticos
FROM nginx:alpine

# Instalar wget para healthcheck
RUN apk add --no-cache wget

# Copiar arquivos buildados
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração customizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta 80
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/health || exit 1

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]