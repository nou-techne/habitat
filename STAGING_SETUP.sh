#!/bin/bash
#
# Habitat Staging Deployment Script
# 
# Usage: ./STAGING_SETUP.sh
#
# Requirements:
# - Docker and Docker Compose installed
# - DNS configured for staging domain
# - Ports 80, 443 open
#

set -e  # Exit on error

echo "=========================================="
echo "Habitat Patronage System - Staging Setup"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
  echo -e "${RED}Please do not run as root. Run as regular user with Docker permissions.${NC}"
  exit 1
fi

# Check Docker
echo -e "${YELLOW}Checking Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker found${NC}"

# Check Docker Compose
echo -e "${YELLOW}Checking Docker Compose...${NC}"
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose found${NC}"

# Check if .env files exist
echo ""
echo -e "${YELLOW}Checking environment files...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env from example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env${NC}"
else
    echo -e "${GREEN}✓ .env exists${NC}"
fi

if [ ! -f "packages/api/.env" ]; then
    echo -e "${YELLOW}Creating packages/api/.env from example...${NC}"
    cp packages/api/.env.example packages/api/.env
    echo -e "${GREEN}✓ Created packages/api/.env${NC}"
else
    echo -e "${GREEN}✓ packages/api/.env exists${NC}"
fi

if [ ! -f "packages/worker/.env" ]; then
    echo -e "${YELLOW}Creating packages/worker/.env from example...${NC}"
    cp packages/worker/.env.example packages/worker/.env
    echo -e "${GREEN}✓ Created packages/worker/.env${NC}"
else
    echo -e "${GREEN}✓ packages/worker/.env exists${NC}"
fi

if [ ! -f "ui/.env" ]; then
    echo -e "${YELLOW}Creating ui/.env from example...${NC}"
    cp ui/.env.example ui/.env
    echo -e "${GREEN}✓ Created ui/.env${NC}"
else
    echo -e "${GREEN}✓ ui/.env exists${NC}"
fi

# Generate secrets
echo ""
echo -e "${YELLOW}Generating secrets...${NC}"

JWT_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
RABBITMQ_PASSWORD=$(openssl rand -hex 16)

echo -e "${GREEN}✓ Secrets generated${NC}"
echo ""
echo "Add these to your .env files:"
echo ""
echo "JWT_SECRET=${JWT_SECRET}"
echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}"
echo "RABBITMQ_DEFAULT_PASS=${RABBITMQ_PASSWORD}"
echo ""
read -p "Press enter to continue after updating .env files..."

# Pull images
echo ""
echo -e "${YELLOW}Building Docker images...${NC}"
docker compose -f docker-compose.prod.yml build
echo -e "${GREEN}✓ Images built${NC}"

# Start services
echo ""
echo -e "${YELLOW}Starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✓ Services started${NC}"

# Wait for PostgreSQL
echo ""
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
for i in {1..30}; do
    if docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U habitat &> /dev/null; then
        echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}PostgreSQL did not start in time${NC}"
        exit 1
    fi
    sleep 2
done

# Wait for RabbitMQ
echo -e "${YELLOW}Waiting for RabbitMQ to be ready...${NC}"
for i in {1..30}; do
    if docker compose -f docker-compose.prod.yml exec -T rabbitmq rabbitmqctl status &> /dev/null; then
        echo -e "${GREEN}✓ RabbitMQ is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}RabbitMQ did not start in time${NC}"
        exit 1
    fi
    sleep 2
done

# Run migrations
echo ""
echo -e "${YELLOW}Running database migrations...${NC}"
docker compose -f docker-compose.prod.yml exec -T api pnpm db:migrate
echo -e "${GREEN}✓ Migrations complete${NC}"

# Seed data
echo ""
read -p "Seed test data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Seeding test data...${NC}"
    docker compose -f docker-compose.prod.yml exec -T api pnpm db:seed
    echo -e "${GREEN}✓ Test data seeded${NC}"
fi

# Health checks
echo ""
echo -e "${YELLOW}Running health checks...${NC}"

# Check API
if docker compose -f docker-compose.prod.yml exec -T api node -e "console.log('OK')" &> /dev/null; then
    echo -e "${GREEN}✓ API container healthy${NC}"
else
    echo -e "${RED}✗ API container unhealthy${NC}"
fi

# Check Worker
if docker compose -f docker-compose.prod.yml exec -T worker node -e "console.log('OK')" &> /dev/null; then
    echo -e "${GREEN}✓ Worker container healthy${NC}"
else
    echo -e "${RED}✗ Worker container unhealthy${NC}"
fi

# Check PostgreSQL
if docker compose -f docker-compose.prod.yml exec -T postgres psql -U habitat -d habitat -c "SELECT 1;" &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL healthy${NC}"
else
    echo -e "${RED}✗ PostgreSQL unhealthy${NC}"
fi

# Check RabbitMQ
if docker compose -f docker-compose.prod.yml exec -T rabbitmq rabbitmqctl status &> /dev/null; then
    echo -e "${GREEN}✓ RabbitMQ healthy${NC}"
else
    echo -e "${RED}✗ RabbitMQ unhealthy${NC}"
fi

# Final status
echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Services running:"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "Next steps:"
echo "1. Configure your domain DNS to point to this server"
echo "2. Access the UI at: https://your-domain.com"
echo "3. Check logs: docker compose -f docker-compose.prod.yml logs -f"
echo "4. Monitor health: curl https://your-domain.com/health"
echo ""
echo "Test users (if seeded):"
echo "  Member:  member@habitat.test / test123"
echo "  Steward: steward@habitat.test / test123"
echo "  Admin:   admin@habitat.test / test123"
echo ""
echo "For troubleshooting, see: docs/operations/troubleshooting.md"
echo ""
