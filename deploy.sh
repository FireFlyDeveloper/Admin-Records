#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Admin-Records Production Deployment Script${NC}"
echo "=========================================="

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Create necessary directories
echo -e "${YELLOW}Creating necessary directories...${NC}"
mkdir -p Backend-app/uploads
mkdir -p Backend-app/logs
mkdir -p Frontend-app/logs
mkdir -p certs
mkdir -p monitoring/grafana/provisioning/dashboards
mkdir -p monitoring/grafana/provisioning/datasources

echo -e "${GREEN}✓ Directories created${NC}"

# Set proper permissions
echo -e "${YELLOW}Setting permissions...${NC}"
chmod 755 Backend-app/uploads
chmod 644 Backend-app/logs
chmod 644 Frontend-app/logs
echo -e "${GREEN}✓ Permissions set${NC}"

# Check if .env exists, if not copy from .env.production
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from .env.production template...${NC}"
    cp .env.production .env
    echo -e "${YELLOW}Please edit .env file with your actual values!${NC}"
fi

# Pull latest images
echo -e "${YELLOW}Pulling latest Docker images...${NC}"
docker-compose -f docker-compose.prod.yml pull
echo -e "${GREEN}✓ Images pulled${NC}"

# Start services
echo -e "${YELLOW}Starting Admin-Records services...${NC}"
docker-compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✓ Services started${NC}"

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 30

# Check health
echo -e "${YELLOW}Checking service health...${NC}"
docker-compose -f docker-compose.prod.yml ps

# Test API endpoints
echo -e "${YELLOW}Testing API endpoints...${NC}"
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend API is healthy${NC}"
else
    echo -e "${RED}✗ Backend API health check failed${NC}"
fi

if curl -f http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is healthy${NC}"
else
    echo -e "${RED}✗ Frontend health check failed${NC}"
fi

# Show logs
echo -e "${YELLOW}Fetching recent logs...${NC}"
docker-compose -f docker-compose.prod.yml logs --tail=20

# Show access information
echo -e "${GREEN}"
echo "====================================="
echo "Deployment complete!"
echo "====================================="
echo ""
echo "Access your application:"
echo "  Frontend: http://localhost"
echo "  Backend API: http://localhost:3000"
echo "  Grafana: http://localhost:3001 (admin/admin)"
echo "  Prometheus: http://localhost:9090"
echo ""
echo "Monitoring:"
echo "  cAdvisor: http://localhost:8080"
echo "  Node Exporter: http://localhost:9100"
echo "  Alertmanager: http://localhost:9093"
echo "${NC}"

# Cleanup old images
echo -e "${YELLOW}Cleaning up old Docker images...${NC}"
docker system prune -f
echo -e "${GREEN}✓ Cleanup complete${NC}"