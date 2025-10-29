# Dockerfile para desenvolvimento - Business Center QuadraDois
FROM node:18-alpine AS base

# Definir diretório de trabalho
WORKDIR /app

# Dependências de sistema necessárias para healthchecks
RUN apk add --no-cache curl

# Copiar arquivos de configuração
COPY package*.json ./

# Instalar dependências (desabilitar strict-ssl para Windows)
RUN npm config set strict-ssl false && npm install --no-verify-ssl && npm config set strict-ssl true

# Copiar código fonte
COPY . .

# Expor porta do Vite (4000 conforme configuração)
EXPOSE 4000

# Comando para desenvolvimento com hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "4000"]