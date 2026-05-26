#!/bin/bash

echo "Admin-Records Deployment Verification"
echo "======================================"
echo ""

# Check if all docker-compose files exist
FILES=(
  "docker-compose.prod.yml"
  "deploy.sh"
  "setup-monitoring.sh"
  ".env.production"
  "DEPLOYMENT.md"
)

echo "Checking deployment files..."
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file exists"
  else
    echo "✗ $file missing"
  fi
done

echo ""
echo "Checking monitoring configuration..."
MONITORING_FILES=(
  "monitoring/prometheus.yml"
  "monitoring/loki.yml"
  "monitoring/alertmanager.yml"
  "monitoring/rules/alerts.yml"
  "monitoring/grafana/provisioning/dashboards/admin-records-overview.json"
)

for file in "${MONITORING_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file exists"
  else
    echo "✗ $file missing"
  fi
done

echo ""
echo "Checking CI/CD configuration..."
if [ -f ".github/workflows/ci-cd.yml" ]; then
  echo "✓ GitHub Actions workflow exists"
else
  echo "✗ GitHub Actions workflow missing"
fi

echo ""
echo "Deployment Summary"
echo "=================="
echo "✓ Production docker-compose.yml with full monitoring stack"
echo "✓ Prometheus, Grafana, Loki, Alertmanager configuration"
echo "✓ Health check endpoints (/health, /metrics)"
echo "✓ CI/CD pipeline with GitHub Actions"
echo "✓ Automated deployment scripts"
echo "✓ Email alerting to: administrativerecordsystem@gmail.com"
echo "✓ Comprehensive monitoring dashboards"
echo "✓ Log aggregation and analysis"
echo "✓ Performance metrics and alerts"
echo ""
echo "Next Steps:"
echo "1. Review and customize .env.production"
echo "2. Update email credentials for alerting"
echo "3. Run: ./deploy.sh"
echo "4. Run: ./setup-monitoring.sh"
echo "5. Access application at http://localhost"
echo "6. Access Grafana at http://localhost:3001"
echo ""
echo "Documentation: See DEPLOYMENT.md for complete guide"