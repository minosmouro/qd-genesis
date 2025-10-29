#!/bin/bash
# Deploy script for Gandalf Backend
# Usage: ./deploy.sh [environment] [action]
# Example: ./deploy.sh production deploy

set -e

ENVIRONMENT=${1:-staging}
ACTION=${2:-deploy}

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-quadradois}
COMPOSE_CMD="docker compose --project-name $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE"
ENV_FILE="$PROJECT_ROOT/.env"

echo "🚀 Gandalf Backend - Deploy to $ENVIRONMENT"
echo "Action: $ACTION"
echo "Project root: $PROJECT_ROOT"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

load_env_file() {
    if [ -f "$ENV_FILE" ]; then
        log "Loading environment variables from $ENV_FILE"
        set -a
        # shellcheck source=/dev/null
        source "$ENV_FILE"
        set +a
    else
        warn ".env não encontrado em $PROJECT_ROOT — variáveis devem ser fornecidas manualmente"
    fi
}

# Verificar pré-requisitos
check_prerequisites() {
    log "Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi

    if ! docker compose version &> /dev/null; then
        error "Docker Compose V2 is not installed"
        exit 1
    fi

    if [ ! -f "$COMPOSE_FILE" ]; then
        error "docker-compose.yml not found in $PROJECT_ROOT"
        exit 1
    fi

    log "Prerequisites OK"
}

# Fazer backup do banco
backup_database() {
    log "Creating database backup..."

    if [ "$ENVIRONMENT" = "production" ]; then
        TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
        BACKUP_FILE="backup_$ENVIRONMENT_$TIMESTAMP.sql"

        POSTGRES_CONTAINER="$COMPOSE_PROJECT_NAME-postgres-1"
        docker exec -e PGPASSWORD="$DATABASE_PASSWORD" "$POSTGRES_CONTAINER" \
            pg_dump -U "$DATABASE_USER" -d "$DATABASE_NAME" > "$BACKUP_FILE"

        if [ $? -eq 0 ]; then
            log "Database backup created: $BACKUP_FILE"
        else
            error "Failed to create database backup"
            exit 1
        fi
    else
        warn "Skipping database backup for $ENVIRONMENT"
    fi
}

# Deploy da aplicação
deploy_app() {
    log "Deploying application..."

    # Parar containers existentes
    log "Stopping existing containers..."
    $COMPOSE_CMD down || true

    # Limpar imagens não utilizadas (opcional)
    if [ "$ENVIRONMENT" = "production" ]; then
        log "Cleaning up unused Docker images..."
    docker image prune -f
    fi

    # Build e start dos serviços
    log "Building and starting services..."
    $COMPOSE_CMD up -d --build

    # Aguardar serviços ficarem saudáveis
    log "Waiting for services to be healthy..."
    sleep 30

    # Verificar health dos serviços
    check_health
}

# Verificar health dos serviços
check_health() {
    log "Checking service health..."

    # Verificar se containers estão rodando
    if ! $COMPOSE_CMD ps backend --status running | grep -q backend; then
        error "Backend container is not running"
        exit 1
    fi

    if ! $COMPOSE_CMD ps postgres --status running | grep -q postgres; then
        error "PostgreSQL container is not running"
        exit 1
    fi

    if ! $COMPOSE_CMD ps redis --status running | grep -q redis; then
        error "Redis container is not running"
        exit 1
    fi

    # Verificar health check da API
    log "Testing API health endpoint..."
    for i in {1..10}; do
        if curl -f http://localhost/api/properties/health &> /dev/null; then
            log "API health check passed"
            break
        fi
        if [ $i -eq 10 ]; then
            error "API health check failed after 10 attempts"
            exit 1
        fi
        log "Waiting for API to be ready... (attempt $i/10)"
        sleep 10
    done

    log "All services are healthy!"
}

# Rollback em caso de falha
rollback() {
    error "Deployment failed! Starting rollback..."

    # Parar containers atuais
    $COMPOSE_CMD down

    # Restaurar backup do banco se existir
    if [ -f "backup_$ENVIRONMENT_*.sql" ]; then
        LATEST_BACKUP=$(ls -t backup_$ENVIRONMENT_*.sql | head -1)
        log "Restoring database from backup: $LATEST_BACKUP"
        POSTGRES_CONTAINER="$COMPOSE_PROJECT_NAME-postgres-1"
        docker exec -e PGPASSWORD="$DATABASE_PASSWORD" -i "$POSTGRES_CONTAINER" \
            psql -U "$DATABASE_USER" -d "$DATABASE_NAME" < "$LATEST_BACKUP"
    fi

    # Restart dos containers anteriores
    $COMPOSE_CMD up -d

    log "Rollback completed"
}

# Executar migrações do banco
run_migrations() {
    log "Running database migrations..."

    $COMPOSE_CMD exec backend flask db upgrade

    if [ $? -eq 0 ]; then
        log "Database migrations completed successfully"
    else
        error "Database migrations failed"
        exit 1
    fi
}

# Main deployment logic
main() {
    case $ACTION in
        "deploy")
            load_env_file
            check_prerequisites
            backup_database
            deploy_app
            run_migrations
            log "🎉 Deployment to $ENVIRONMENT completed successfully!"
            ;;
        "rollback")
            load_env_file
            rollback
            ;;
        "health")
            check_health
            ;;
        "backup")
            load_env_file
            backup_database
            ;;
        *)
            error "Invalid action: $ACTION"
            echo "Usage: $0 [environment] [action]"
            echo "Actions: deploy, rollback, health, backup"
            exit 1
            ;;
    esac
}

# Trap para rollback automático em caso de erro
trap 'error "Deployment failed!"; rollback' ERR

# Executar main
main "$@"
