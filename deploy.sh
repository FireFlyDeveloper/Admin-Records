#!/bin/bash

# Quick Deployment Script for Admin Records Platform

echo "🚀 Admin Records - Quick Deployment"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_success "Docker is running"

# Check environment files
cd /root/tmp/Admin-Records

# Backend .env.production
if [ ! -f "Backend-app/.env.production" ]; then
    print_warning "Backend-app/.env.production not found. Creating from template..."
    cp Backend-app/.env.example Backend-app/.env.production
    print_info "Please edit Backend-app/.env.production with your secrets"
fi

# Root .env.production  
if [ ! -f ".env.production" ]; then
    print_warning ".env.production not found. Creating from template..."
    cp .env.example .env.production
    print_info "Please edit .env.production with your secrets"
fi

# Frontend .env.local
if [ ! -f "Frontend-app/.env.local" ]; then
    print_info "Creating Frontend-app/.env.local"
    cp Frontend-app/.env.example Frontend-app/.env.local
fi

# Show environment file status
echo ""
print_info "Environment Files:"
ls -la Backend-app/.env.production .env.production Frontend-app/.env.local 2>/dev/null | awk '{print "  " $9 " (" $5 " bytes)"}'
echo ""

# Check if secrets still have placeholders
if grep -q "change..." Backend-app/.env.production 2>/dev/null; then
    print_warning "Backend-app/.env.production contains placeholder secrets!"
    print_info "Edit the file and change all 'change...' values"
fi

if grep -q "change..." .env.production 2>/dev/null; then
    print_warning ".env.production contains placeholder secrets!"
    print_info "Edit the file and change all 'change...' values"
fi

echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deployment cancelled"
    exit 1
fi

echo ""
print_info "Building and starting services..."
docker-compose up --build -d

# Wait for services to start
echo ""
print_info "Waiting for services to start..."
sleep 10

# Check backend health
echo ""
print_info "Checking backend health..."
if curl -s http://localhost:3000/health > /dev/null; then
    print_success "Backend is healthy"
else
    print_warning "Backend health check failed - check logs"
fi

# Check if containers are running
echo ""
print_info "Container Status:"
docker ps --filter "name=admin-records" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
print_success "Deployment complete!"
echo ""
print_info "Access Points:"
print_info "  Frontend: http://localhost"
print_info "  Backend API: http://localhost:3000"
print_info "  Backend Health: http://localhost:3000/health"
echo ""
print_info "Monitor logs:"
print_info "  docker-compose logs -f backend"
print_info "  docker-compose logs -f frontend"
echo ""

read -p "View logs now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose logs -f --tail=50
fi