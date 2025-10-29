FROM nginx:alpine

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Copiar configurações
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Criar diretório para SSL (caso seja necessário no futuro)
RUN mkdir -p /etc/nginx/ssl

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -fsS http://localhost/health || exit 1

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
