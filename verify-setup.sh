#!/bin/bash

# Quick Environment Security Verification

echo "🔒 Environment Security Verification"
echo "====================================="
echo ""

cd /root/tmp/Admin-Records

# Check .gitignore
echo "📋 Checking .gitignore configuration..."
if grep -q "\.env" .gitignore; then
    echo "✅ .gitignore includes .env files"
else
    echo "❌ .gitignore missing .env entries"
fi

if grep -q "\.env\.production" .gitignore; then
    echo "✅ .gitignore includes .env.production"
else
    echo "❌ .gitignore missing .env.production"
fi

echo ""

# Check if files exist
echo "📁 Environment Files Status:"
FILES=(
    ".env.production"
    "Backend-app/.env.production"
    "Frontend-app/.env.local"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

echo ""

# Check if .env files are in git
echo "🔍 Git tracking status:"
ENV_TRACKED=$(git status --porcelain 2>/dev/null | grep -c "\.env")
if [ "$ENV_TRACKED" -eq 0 ]; then
    echo "✅ No .env files in git tracking"
else
    echo "❌ .env files tracked by git!"
    git status --porcelain | grep "\.env"
fi

echo ""

# Check for placeholder secrets
echo "🚨 Checking for placeholder secrets:"
PLACEMENTS=0
if [ -f ".env.production" ] && grep -q "change..." .env.production; then
    echo "⚠️  .env.production contains placeholder secrets"
    PLACEMENTS=$((PLACEMENTS+1))
fi

if [ -f "Backend-app/.env.production" ] && grep -q "change..." Backend-app/.env.production; then
    echo "⚠️  Backend-app/.env.production contains placeholder secrets"
    PLACEMENTS=$((PLACEMENTS+1))
fi

if [ $PLACEMENTS -eq 0 ]; then
    echo "✅ No placeholder secrets found (or files not created)"
fi

echo ""

# Show example templates
echo "📖 Template files available:"
if [ -f ".env.example" ]; then
    echo "✅ .env.example (copy to .env.production)"
fi

if [ -f "Backend-app/.env.example" ]; then
    echo "✅ Backend-app/.env.example (copy to Backend-app/.env.production)"
fi

if [ -f "Frontend-app/.env.example" ]; then
    echo "✅ Frontend-app/.env.example (copy to Frontend-app/.env.local)"
fi

echo ""

# Docker status
echo "🐳 Docker service status:"
if docker info > /dev/null 2>&1; then
    echo "✅ Docker is running"
else
    echo "❌ Docker is NOT running"
fi

echo ""

# Quick test - check if containers would conflict
PORTS=(3000 3001 80)
echo "🚪 Port availability check:"
for port in "${PORTS[@]}"; do
    if ss -tln | grep -q ":$port "; then
        echo "⚠️  Port $port is in use"
        ss -tln | grep ":$port "
    else
        echo "✅ Port $port is free"
    fi
done

echo ""
print_success "Verification complete!"
echo ""
print_info "Next steps:"
print_info "1. Edit .env.production with real secrets"
print_info "2. Edit Backend-app/.env.production with real secrets"
print_info "3. Run: ./deploy.sh"
echo ""
print_info "Or use: docker-compose up --build -d"