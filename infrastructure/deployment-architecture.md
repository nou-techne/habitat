# Deployment Architecture

**Sprint:** 51  
**Phase:** 3 — Production Deployment  
**Layer:** Infrastructure (Constraint + View)  
**Status:** Specification

---

## Purpose

Define the deployment architecture for Habitat: containerization strategy, environment configuration, infrastructure-as-code, and operational deployment guide. Enables cooperatives to deploy and maintain production Habitat instances.

---

## Architecture Overview

**Deployment Model:** Container-based microservices
**Orchestration:** Docker Compose (local/small), Kubernetes (scale)
**Database:** PostgreSQL 14+ (primary data store)
**Message Broker:** RabbitMQ (event bus)
**API Server:** Node.js (Apollo GraphQL Server)
**Frontend:** Next.js (static export or SSR)

### Core Services

```
┌─────────────────────────────────────────────────────────┐
│                     Load Balancer                       │
│                    (nginx / Caddy)                      │
└────────────┬────────────────────────────┬───────────────┘
             │                            │
             ▼                            ▼
   ┌──────────────────┐         ┌──────────────────┐
   │   Frontend (UI)  │         │   API Server     │
   │   (Next.js)      │         │   (GraphQL)      │
   └──────────────────┘         └────────┬─────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
         ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
         │   PostgreSQL   │   │   RabbitMQ     │   │  Event Worker  │
         │   (Database)   │   │  (Event Bus)   │   │   (Handlers)   │
         └────────────────┘   └────────────────┘   └────────────────┘
```

---

## Service Specifications

### 1. PostgreSQL Database

**Image:** `postgres:14-alpine`  
**Purpose:** Primary data store for Treasury, People, Agreements schemas  
**Configuration:**
- Port: 5432 (internal), not exposed externally
- Volume: persistent storage for `/var/lib/postgresql/data`
- Init: automated schema deployment via migrations
- Replication: streaming replication (production)

**Environment Variables:**
```env
POSTGRES_DB=habitat
POSTGRES_USER=habitat_admin
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_MAX_CONNECTIONS=100
POSTGRES_SHARED_BUFFERS=256MB
```

**Health Check:**
```bash
pg_isready -U habitat_admin -d habitat
```

---

### 2. RabbitMQ Event Bus

**Image:** `rabbitmq:3-management-alpine`  
**Purpose:** Pub/sub event bus for cross-context coordination  
**Configuration:**
- AMQP Port: 5672 (internal)
- Management UI: 15672 (internal, admin access only)
- Volume: persistent storage for `/var/lib/rabbitmq`
- Exchanges: topic exchange per bounded context (treasury.events, people.events, agreements.events)

**Environment Variables:**
```env
RABBITMQ_DEFAULT_USER=habitat_events
RABBITMQ_DEFAULT_PASS=<strong-random-password>
RABBITMQ_DEFAULT_VHOST=habitat
```

**Health Check:**
```bash
rabbitmq-diagnostics -q ping
```

---

### 3. API Server (GraphQL)

**Image:** Custom `habitat-api:latest` (Node.js 18+)  
**Purpose:** GraphQL API serving Treasury, People, Agreements queries/mutations  
**Configuration:**
- Port: 4000 (internal)
- Dependencies: PostgreSQL (ready), RabbitMQ (ready)
- Restart policy: always (production), on-failure (dev)

**Environment Variables:**
```env
NODE_ENV=production
DATABASE_URL=postgresql://habitat_admin:<password>@postgres:5432/habitat
RABBITMQ_URL=amqp://habitat_events:<password>@rabbitmq:5672/habitat
JWT_SECRET=<strong-random-secret>
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
CORS_ORIGIN=https://app.habitat.your-coop.org
PORT=4000
LOG_LEVEL=info
```

**Health Check:**
```bash
curl -f http://localhost:4000/health || exit 1
```

---

### 4. Event Worker

**Image:** Custom `habitat-worker:latest` (Node.js 18+)  
**Purpose:** Consumes events from RabbitMQ, executes cross-context coordination  
**Configuration:**
- No exposed ports
- Dependencies: PostgreSQL (ready), RabbitMQ (ready)
- Restart policy: always
- Concurrency: configurable worker pool (default: 4)

**Environment Variables:**
```env
NODE_ENV=production
DATABASE_URL=postgresql://habitat_admin:<password>@postgres:5432/habitat
RABBITMQ_URL=amqp://habitat_events:<password>@rabbitmq:5672/habitat
WORKER_CONCURRENCY=4
LOG_LEVEL=info
DEAD_LETTER_RETRY_LIMIT=3
```

**Health Check:**
```bash
# Worker exposes health endpoint on internal port 9090
curl -f http://localhost:9090/health || exit 1
```

---

### 5. Frontend (Next.js)

**Image:** Custom `habitat-ui:latest` (Node.js 18+ or static export)  
**Purpose:** Member-facing dashboard and admin interface  
**Configuration:**
- Port: 3000 (internal)
- Dependencies: API Server (ready)
- Deployment mode: SSR (production) or static export (CDN)

**Environment Variables:**
```env
NEXT_PUBLIC_API_URL=https://api.habitat.your-coop.org
NEXT_PUBLIC_APP_NAME=Habitat
NEXT_PUBLIC_COOP_NAME=Your Cooperative Name
NEXT_TELEMETRY_DISABLED=1
```

**Health Check:**
```bash
curl -f http://localhost:3000/api/health || exit 1
```

---

### 6. Load Balancer / Reverse Proxy

**Image:** `nginx:alpine` or `caddy:alpine`  
**Purpose:** TLS termination, routing, rate limiting  
**Configuration:**
- Ports: 80 (HTTP), 443 (HTTPS)
- TLS: Let's Encrypt (automated via Caddy) or manual certs (nginx)
- Routing:
  - `/` → Frontend (3000)
  - `/graphql` → API Server (4000)
  - `/api/*` → API Server (4000)

**Example Caddy Configuration:**
```caddyfile
app.habitat.your-coop.org {
    reverse_proxy /* frontend:3000
    reverse_proxy /graphql api:4000
    reverse_proxy /api/* api:4000
    
    encode gzip
    log {
        output file /var/log/caddy/access.log
    }
}
```

---

## Docker Compose Stack

### Development Configuration

**File:** `docker-compose.dev.yml`

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:14-alpine
    container_name: habitat-db-dev
    restart: unless-stopped
    environment:
      POSTGRES_DB: habitat_dev
      POSTGRES_USER: habitat_admin
      POSTGRES_PASSWORD: dev_password_change_in_production
    ports:
      - "5432:5432"  # Exposed for local dev tools
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./schema:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U habitat_admin -d habitat_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: habitat-mq-dev
    restart: unless-stopped
    environment:
      RABBITMQ_DEFAULT_USER: habitat_events
      RABBITMQ_DEFAULT_PASS: dev_password_change_in_production
      RABBITMQ_DEFAULT_VHOST: habitat
    ports:
      - "5672:5672"   # AMQP
      - "15672:15672" # Management UI
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./services/api
      dockerfile: Dockerfile.dev
    container_name: habitat-api-dev
    restart: unless-stopped
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://habitat_admin:dev_password_change_in_production@postgres:5432/habitat_dev
      RABBITMQ_URL: amqp://habitat_events:dev_password_change_in_production@rabbitmq:5672/habitat
      JWT_SECRET: dev_secret_change_in_production
      JWT_EXPIRY: 15m
      REFRESH_TOKEN_EXPIRY: 7d
      CORS_ORIGIN: http://localhost:3000
      PORT: 4000
      LOG_LEVEL: debug
    ports:
      - "4000:4000"
    volumes:
      - ./services/api:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    command: npm run dev

  worker:
    build:
      context: ./services/worker
      dockerfile: Dockerfile.dev
    container_name: habitat-worker-dev
    restart: unless-stopped
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://habitat_admin:dev_password_change_in_production@postgres:5432/habitat_dev
      RABBITMQ_URL: amqp://habitat_events:dev_password_change_in_production@rabbitmq:5672/habitat
      WORKER_CONCURRENCY: 2
      LOG_LEVEL: debug
      DEAD_LETTER_RETRY_LIMIT: 3
    volumes:
      - ./services/worker:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    command: npm run dev

  frontend:
    build:
      context: ./services/frontend
      dockerfile: Dockerfile.dev
    container_name: habitat-ui-dev
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000
      NEXT_PUBLIC_APP_NAME: Habitat (Dev)
      NEXT_PUBLIC_COOP_NAME: Development Cooperative
      NEXT_TELEMETRY_DISABLED: 1
    ports:
      - "3000:3000"
    volumes:
      - ./services/frontend:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - api
    command: npm run dev

volumes:
  postgres_data:
    driver: local
  rabbitmq_data:
    driver: local
```

---

### Production Configuration

**File:** `docker-compose.prod.yml`

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:14-alpine
    container_name: habitat-db
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_MAX_CONNECTIONS: ${POSTGRES_MAX_CONNECTIONS:-100}
      POSTGRES_SHARED_BUFFERS: ${POSTGRES_SHARED_BUFFERS:-256MB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - habitat-internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres-replica:
    image: postgres:14-alpine
    container_name: habitat-db-replica
    restart: always
    environment:
      POSTGRES_PRIMARY_HOST: postgres
      POSTGRES_PRIMARY_PORT: 5432
      POSTGRES_REPLICATION_USER: ${POSTGRES_REPLICATION_USER}
      POSTGRES_REPLICATION_PASSWORD: ${POSTGRES_REPLICATION_PASSWORD}
    volumes:
      - postgres_replica_data:/var/lib/postgresql/data
    networks:
      - habitat-internal
    depends_on:
      - postgres

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: habitat-mq
    restart: always
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
      RABBITMQ_DEFAULT_VHOST: ${RABBITMQ_VHOST:-habitat}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - habitat-internal
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  api:
    image: ${DOCKER_REGISTRY}/habitat-api:${VERSION:-latest}
    container_name: habitat-api
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      DATABASE_READ_REPLICA_URL: ${DATABASE_READ_REPLICA_URL}
      RABBITMQ_URL: ${RABBITMQ_URL}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRY: ${JWT_EXPIRY:-15m}
      REFRESH_TOKEN_EXPIRY: ${REFRESH_TOKEN_EXPIRY:-7d}
      CORS_ORIGIN: ${CORS_ORIGIN}
      PORT: 4000
      LOG_LEVEL: ${LOG_LEVEL:-info}
    networks:
      - habitat-internal
      - habitat-external
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  worker:
    image: ${DOCKER_REGISTRY}/habitat-worker:${VERSION:-latest}
    container_name: habitat-worker
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      RABBITMQ_URL: ${RABBITMQ_URL}
      WORKER_CONCURRENCY: ${WORKER_CONCURRENCY:-4}
      LOG_LEVEL: ${LOG_LEVEL:-info}
      DEAD_LETTER_RETRY_LIMIT: ${DEAD_LETTER_RETRY_LIMIT:-3}
    networks:
      - habitat-internal
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9090/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M

  frontend:
    image: ${DOCKER_REGISTRY}/habitat-ui:${VERSION:-latest}
    container_name: habitat-ui
    restart: always
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
      NEXT_PUBLIC_APP_NAME: Habitat
      NEXT_PUBLIC_COOP_NAME: ${COOP_NAME}
      NEXT_TELEMETRY_DISABLED: 1
    networks:
      - habitat-external
    depends_on:
      - api
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M

  caddy:
    image: caddy:alpine
    container_name: habitat-proxy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - habitat-external
    depends_on:
      - frontend
      - api

  prometheus:
    image: prom/prometheus:latest
    container_name: habitat-metrics
    restart: always
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    networks:
      - habitat-internal
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'

  grafana:
    image: grafana/grafana:latest
    container_name: habitat-dashboards
    restart: always
    environment:
      GF_SECURITY_ADMIN_USER: ${GRAFANA_USER}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_USERS_ALLOW_SIGN_UP: false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana-dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana-datasources:/etc/grafana/provisioning/datasources:ro
    networks:
      - habitat-internal
    depends_on:
      - prometheus

  loki:
    image: grafana/loki:latest
    container_name: habitat-logs
    restart: always
    volumes:
      - ./monitoring/loki-config.yml:/etc/loki/local-config.yaml:ro
      - loki_data:/loki
    networks:
      - habitat-internal
    command: -config.file=/etc/loki/local-config.yaml

networks:
  habitat-internal:
    driver: bridge
    internal: true
  habitat-external:
    driver: bridge

volumes:
  postgres_data:
    driver: local
  postgres_replica_data:
    driver: local
  rabbitmq_data:
    driver: local
  caddy_data:
    driver: local
  caddy_config:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local
  loki_data:
    driver: local
```

---

## Environment Configuration

### Development (`.env.dev`)

```env
# Database
POSTGRES_DB=habitat_dev
POSTGRES_USER=habitat_admin
POSTGRES_PASSWORD=dev_password_change_in_production
POSTGRES_MAX_CONNECTIONS=50
POSTGRES_SHARED_BUFFERS=128MB

# RabbitMQ
RABBITMQ_USER=habitat_events
RABBITMQ_PASSWORD=dev_password_change_in_production
RABBITMQ_VHOST=habitat

# API
DATABASE_URL=postgresql://habitat_admin:dev_password_change_in_production@postgres:5432/habitat_dev
RABBITMQ_URL=amqp://habitat_events:dev_password_change_in_production@rabbitmq:5672/habitat
JWT_SECRET=dev_secret_change_in_production_minimum_32_characters
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug

# Worker
WORKER_CONCURRENCY=2
DEAD_LETTER_RETRY_LIMIT=3

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=Habitat (Dev)
NEXT_PUBLIC_COOP_NAME=Development Cooperative

# Monitoring (optional for dev)
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin
```

### Staging (`.env.staging`)

```env
# Database
POSTGRES_DB=habitat_staging
POSTGRES_USER=habitat_admin
POSTGRES_PASSWORD=<strong-random-password-from-secrets-manager>
POSTGRES_REPLICATION_USER=replicator
POSTGRES_REPLICATION_PASSWORD=<strong-random-password-from-secrets-manager>
POSTGRES_MAX_CONNECTIONS=100
POSTGRES_SHARED_BUFFERS=256MB

# RabbitMQ
RABBITMQ_USER=habitat_events
RABBITMQ_PASSWORD=<strong-random-password-from-secrets-manager>
RABBITMQ_VHOST=habitat

# API
DATABASE_URL=postgresql://habitat_admin:<password>@postgres:5432/habitat_staging
DATABASE_READ_REPLICA_URL=postgresql://habitat_admin:<password>@postgres-replica:5432/habitat_staging
RABBITMQ_URL=amqp://habitat_events:<password>@rabbitmq:5672/habitat
JWT_SECRET=<strong-random-secret-minimum-32-characters>
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
CORS_ORIGIN=https://staging.habitat.your-coop.org
LOG_LEVEL=info

# Worker
WORKER_CONCURRENCY=4
DEAD_LETTER_RETRY_LIMIT=3

# Frontend
NEXT_PUBLIC_API_URL=https://api-staging.habitat.your-coop.org
NEXT_PUBLIC_APP_NAME=Habitat (Staging)
NEXT_PUBLIC_COOP_NAME=Your Cooperative Name

# Docker Registry
DOCKER_REGISTRY=registry.your-coop.org
VERSION=staging-latest

# Monitoring
GRAFANA_USER=admin
GRAFANA_PASSWORD=<strong-random-password-from-secrets-manager>
```

### Production (`.env.production`)

```env
# Database
POSTGRES_DB=habitat
POSTGRES_USER=habitat_admin
POSTGRES_PASSWORD=<strong-random-password-from-secrets-manager>
POSTGRES_REPLICATION_USER=replicator
POSTGRES_REPLICATION_PASSWORD=<strong-random-password-from-secrets-manager>
POSTGRES_MAX_CONNECTIONS=200
POSTGRES_SHARED_BUFFERS=512MB

# RabbitMQ
RABBITMQ_USER=habitat_events
RABBITMQ_PASSWORD=<strong-random-password-from-secrets-manager>
RABBITMQ_VHOST=habitat

# API
DATABASE_URL=postgresql://habitat_admin:<password>@postgres:5432/habitat
DATABASE_READ_REPLICA_URL=postgresql://habitat_admin:<password>@postgres-replica:5432/habitat
RABBITMQ_URL=amqp://habitat_events:<password>@rabbitmq:5672/habitat
JWT_SECRET=<strong-random-secret-minimum-64-characters>
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
CORS_ORIGIN=https://app.habitat.your-coop.org
LOG_LEVEL=info

# Worker
WORKER_CONCURRENCY=8
DEAD_LETTER_RETRY_LIMIT=3

# Frontend
NEXT_PUBLIC_API_URL=https://api.habitat.your-coop.org
NEXT_PUBLIC_APP_NAME=Habitat
NEXT_PUBLIC_COOP_NAME=Your Cooperative Name

# Docker Registry
DOCKER_REGISTRY=registry.your-coop.org
VERSION=v1.0.0

# Monitoring
GRAFANA_USER=admin
GRAFANA_PASSWORD=<strong-random-password-from-secrets-manager>

# Backup
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=habitat-backups-your-coop
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
```

**Security Note:** Production secrets MUST be managed via a secrets manager (Doppler, AWS Secrets Manager, HashiCorp Vault) and never committed to version control.

---

## Infrastructure as Code

### Terraform Configuration (AWS Example)

**File:** `terraform/main.tf`

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "habitat-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-west-2"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "habitat" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "habitat-vpc"
    Environment = var.environment
  }
}

# Subnets
resource "aws_subnet" "habitat_public" {
  count                   = 2
  vpc_id                  = aws_vpc.habitat.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "habitat-public-${count.index + 1}"
    Environment = var.environment
  }
}

resource "aws_subnet" "habitat_private" {
  count             = 2
  vpc_id            = aws_vpc.habitat.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "habitat-private-${count.index + 1}"
    Environment = var.environment
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "habitat" {
  identifier              = "habitat-${var.environment}"
  engine                  = "postgres"
  engine_version          = "14.10"
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_allocated_storage
  storage_encrypted       = true
  db_name                 = "habitat"
  username                = var.db_username
  password                = var.db_password
  vpc_security_group_ids  = [aws_security_group.habitat_db.id]
  db_subnet_group_name    = aws_db_subnet_group.habitat.name
  backup_retention_period = 30
  skip_final_snapshot     = var.environment != "production"
  multi_az                = var.environment == "production"

  tags = {
    Name        = "habitat-db-${var.environment}"
    Environment = var.environment
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "habitat" {
  name = "habitat-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "habitat-cluster-${var.environment}"
    Environment = var.environment
  }
}

# Application Load Balancer
resource "aws_lb" "habitat" {
  name               = "habitat-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.habitat_alb.id]
  subnets            = aws_subnet.habitat_public[*].id

  tags = {
    Name        = "habitat-alb-${var.environment}"
    Environment = var.environment
  }
}

# Outputs
output "database_endpoint" {
  value     = aws_db_instance.habitat.endpoint
  sensitive = true
}

output "load_balancer_dns" {
  value = aws_lb.habitat.dns_name
}
```

---

## Deployment Guide

### Local Development Setup

**Prerequisites:**
- Docker 24+ and Docker Compose 2+
- Node.js 18+ (for local dev without containers)
- Git

**Steps:**

1. **Clone repository:**
   ```bash
   git clone https://github.com/nou-techne/habitat.git
   cd habitat
   ```

2. **Copy environment template:**
   ```bash
   cp .env.dev.example .env.dev
   ```

3. **Start services:**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

4. **Initialize database:**
   ```bash
   docker exec habitat-db-dev psql -U habitat_admin -d habitat_dev -f /docker-entrypoint-initdb.d/01_treasury_core.sql
   docker exec habitat-db-dev psql -U habitat_admin -d habitat_dev -f /docker-entrypoint-initdb.d/02_treasury_migrations.sql
   docker exec habitat-db-dev psql -U habitat_admin -d habitat_dev -f /docker-entrypoint-initdb.d/03_treasury_seed_data.sql
   docker exec habitat-db-dev psql -U habitat_admin -d habitat_dev -f /docker-entrypoint-initdb.d/04_people_core.sql
   docker exec habitat-db-dev psql -U habitat_admin -d habitat_dev -f /docker-entrypoint-initdb.d/05_agreements_core.sql
   ```

5. **Verify services:**
   ```bash
   docker-compose -f docker-compose.dev.yml ps
   curl http://localhost:4000/health  # API health
   curl http://localhost:3000          # Frontend
   open http://localhost:15672         # RabbitMQ management (guest/guest)
   ```

6. **View logs:**
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f api
   ```

7. **Stop services:**
   ```bash
   docker-compose -f docker-compose.dev.yml down
   ```

---

### Production Deployment (Self-Hosted VPS)

**Prerequisites:**
- Ubuntu 22.04 LTS server with root access
- Domain name pointed to server IP
- Minimum specs: 4 CPU cores, 8GB RAM, 100GB SSD

**Steps:**

1. **Provision server:**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   sudo usermod -aG docker $USER
   
   # Install Docker Compose
   sudo apt install docker-compose-plugin -y
   ```

2. **Clone and configure:**
   ```bash
   git clone https://github.com/nou-techne/habitat.git /opt/habitat
   cd /opt/habitat
   cp .env.production.example .env.production
   
   # Edit .env.production with production secrets
   nano .env.production
   ```

3. **Generate secrets:**
   ```bash
   # Generate strong passwords
   openssl rand -base64 32  # For POSTGRES_PASSWORD
   openssl rand -base64 32  # For RABBITMQ_PASSWORD
   openssl rand -base64 64  # For JWT_SECRET
   ```

4. **Deploy stack:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

5. **Initialize database:**
   ```bash
   docker exec habitat-db psql -U habitat_admin -d habitat < schema/01_treasury_core.sql
   docker exec habitat-db psql -U habitat_admin -d habitat < schema/02_treasury_migrations.sql
   docker exec habitat-db psql -U habitat_admin -d habitat < schema/04_people_core.sql
   docker exec habitat-db psql -U habitat_admin -d habitat < schema/05_agreements_core.sql
   ```

6. **Configure TLS (Caddy auto-handles Let's Encrypt):**
   - Ensure DNS A record points to server
   - Caddy will automatically provision TLS certificates

7. **Verify deployment:**
   ```bash
   curl https://api.habitat.your-coop.org/health
   curl https://app.habitat.your-coop.org
   ```

8. **Set up automated backups:**
   ```bash
   # Create backup script
   sudo nano /opt/habitat/scripts/backup.sh
   
   # Schedule via cron
   sudo crontab -e
   # Add: 0 2 * * * /opt/habitat/scripts/backup.sh
   ```

---

### Kubernetes Deployment

**Prerequisites:**
- Kubernetes 1.25+ cluster
- kubectl configured
- Helm 3+ installed

**Helm Chart Structure:**

```
habitat-chart/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment-api.yaml
│   ├── deployment-worker.yaml
│   ├── deployment-frontend.yaml
│   ├── statefulset-postgres.yaml
│   ├── statefulset-rabbitmq.yaml
│   ├── service-api.yaml
│   ├── service-frontend.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   └── secret.yaml
```

**Deploy:**

```bash
# Add Habitat Helm repo (future)
helm repo add habitat https://charts.habitat.org
helm repo update

# Install
helm install habitat habitat/habitat \
  --namespace habitat \
  --create-namespace \
  --set postgres.password="<strong-password>" \
  --set rabbitmq.password="<strong-password>" \
  --set api.jwtSecret="<strong-secret>" \
  --set ingress.hosts[0].host="app.habitat.your-coop.org"

# Upgrade
helm upgrade habitat habitat/habitat --namespace habitat

# Rollback
helm rollback habitat --namespace habitat
```

---

## Monitoring and Observability

### Metrics (Prometheus)

**Scrape targets:**
- API Server: `/metrics` endpoint (prom-client)
- Worker: `/metrics` endpoint
- PostgreSQL: postgres_exporter sidecar
- RabbitMQ: rabbitmq_prometheus plugin

**Key metrics:**
- Request rate, latency, error rate (API)
- Event processing rate, queue depth (Worker)
- Connection count, query duration (PostgreSQL)
- Message rate, queue length (RabbitMQ)

### Logs (Loki)

**Log aggregation:**
- All container stdout/stderr → Loki via Docker log driver
- Structured logging (JSON format)
- Labels: service, environment, level

**Query examples:**
```logql
{service="habitat-api"} |= "error"
rate({service="habitat-worker"}[5m])
```

### Dashboards (Grafana)

**Pre-built dashboards:**
1. **System Overview:** CPU, memory, disk, network across all services
2. **API Performance:** Request rates, latency percentiles, error rates
3. **Worker Health:** Event processing rates, queue depths, retry counts
4. **Database:** Query performance, connection pool, replication lag
5. **Business Metrics:** Contributions submitted, allocations processed, distributions scheduled

---

## Backup and Disaster Recovery

### Database Backups

**Automated daily backups:**

```bash
#!/bin/bash
# /opt/habitat/scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
RETENTION_DAYS=30

# Create backup
docker exec habitat-db pg_dump -U habitat_admin -F c habitat > "$BACKUP_DIR/habitat_$DATE.dump"

# Compress
gzip "$BACKUP_DIR/habitat_$DATE.dump"

# Upload to S3
aws s3 cp "$BACKUP_DIR/habitat_$DATE.dump.gz" "s3://habitat-backups-your-coop/$DATE.dump.gz"

# Remove old local backups
find "$BACKUP_DIR" -name "*.dump.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: habitat_$DATE.dump.gz"
```

**Schedule:**
```cron
0 2 * * * /opt/habitat/scripts/backup.sh
```

### Restore Procedure

```bash
# Download latest backup
aws s3 cp s3://habitat-backups-your-coop/latest.dump.gz /tmp/restore.dump.gz
gunzip /tmp/restore.dump.gz

# Stop services
docker-compose -f docker-compose.prod.yml stop api worker frontend

# Restore database
docker exec -i habitat-db pg_restore -U habitat_admin -d habitat -c /tmp/restore.dump

# Restart services
docker-compose -f docker-compose.prod.yml start api worker frontend
```

---

## Scaling Strategy

### Vertical Scaling (Single Server)

| Workload | CPU | RAM | Disk | Cost/Month |
|----------|-----|-----|------|------------|
| Small (1-50 members) | 2 cores | 4GB | 50GB | $20-40 |
| Medium (50-200 members) | 4 cores | 8GB | 100GB | $40-80 |
| Large (200-500 members) | 8 cores | 16GB | 200GB | $80-160 |

### Horizontal Scaling (Kubernetes)

**Stateless services (API, Worker, Frontend):**
- Horizontal Pod Autoscaler (HPA) based on CPU/memory
- Target: 70% CPU utilization
- Min replicas: 2, Max replicas: 10

**Stateful services (PostgreSQL, RabbitMQ):**
- Use managed services (AWS RDS, CloudAMQP) for production scale
- Self-hosted: PostgreSQL streaming replication, RabbitMQ clustering

---

## Cost Estimates

### Self-Hosted (VPS)

| Provider | Tier | Specs | Cost/Month |
|----------|------|-------|------------|
| DigitalOcean | Droplet | 4 vCPU, 8GB RAM, 100GB SSD | $48 |
| Linode | Dedicated CPU | 4 vCPU, 8GB RAM, 160GB SSD | $36 |
| Hetzner | CPX31 | 4 vCPU, 8GB RAM, 160GB SSD | €19.90 (~$22) |

**Total monthly (self-hosted):** $30-60 including backups and bandwidth

### Cloud-Managed (AWS)

| Service | Configuration | Cost/Month |
|---------|---------------|------------|
| RDS PostgreSQL | db.t3.medium, 100GB, Multi-AZ | ~$150 |
| ECS Fargate | 4 tasks, 0.5 vCPU, 1GB each | ~$50 |
| ALB | Application Load Balancer | ~$20 |
| CloudFront | CDN for frontend | ~$10 |
| S3 | Backups and static assets | ~$5 |
| **Total** | | **~$235/month** |

### Serverless (Vercel + PlanetScale + Upstash)

| Service | Configuration | Cost/Month |
|---------|---------------|------------|
| Vercel | Pro plan (Next.js frontend + API) | $20 |
| PlanetScale | Scaler plan (MySQL, 10GB) | $39 |
| Upstash | Pay-as-you-go (Redis for events) | ~$10 |
| **Total** | | **~$69/month** |

**Recommendation:** Self-hosted VPS for maximum control and minimum cost. Managed cloud for scale beyond 500 members.

---

## Security Considerations

1. **Secrets Management:** Use Doppler, AWS Secrets Manager, or HashiCorp Vault
2. **Network Isolation:** Internal Docker network for DB/MQ, external network for API/Frontend only
3. **TLS Everywhere:** HTTPS for all external traffic, TLS for internal DB connections
4. **Database Access:** No public DB access; API server is the only entry point
5. **Regular Updates:** Automated security patches via Dependabot + Renovate
6. **Audit Logging:** All mutations logged to audit table with actor + timestamp
7. **Rate Limiting:** Caddy or nginx rate limiting per IP
8. **DDoS Protection:** Cloudflare or equivalent in front of load balancer

---

## Next Steps (Sprint 52+)

1. **Sprint 52:** Deploy schemas, load seed data, configure database roles
2. **Sprint 53:** Implement API server core (queries)
3. **Sprint 54:** Implement API server mutations
4. **Sprint 55:** Implement event bus and handlers
5. **Sprint 56-60:** Build frontend UI (dashboard, forms, approver interface)

---

*Sprint 51 complete. Infrastructure foundation specified.*

**Repository:** github.com/nou-techne/habitat  
**Deployment Guide:** habitat/infrastructure/deployment-architecture.md
