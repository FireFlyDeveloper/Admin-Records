#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Admin-Records Monitoring Setup${NC}"
echo "================================"

# Check if services are running
echo -e "${YELLOW}Checking service status...${NC}"
docker-compose -f docker-compose.prod.yml ps

# Function to wait for service
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}Waiting for $service to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:$port > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $service is ready${NC}"
            return 0
        fi
        echo -n "."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}✗ $service failed to start${NC}"
    return 1
}

# Wait for all monitoring services
echo -e "${YELLOW}Starting monitoring services...${NC}"
docker-compose -f docker-compose.prod.yml up -d prometheus grafana loki alertmanager cadvisor node-exporter

wait_for_service "Prometheus" "9090"
wait_for_service "Grafana" "3001"
wait_for_service "Loki" "3100"
wait_for_service "Alertmanager" "9093"
wait_for_service "cAdvisor" "8080"
wait_for_service "Node Exporter" "9100"

echo -e "${GREEN}"
echo "====================================="
echo "Monitoring Setup Complete!"
echo "====================================="
echo ""
echo "Access Points:"
echo "  Grafana: http://localhost:3001 (admin/admin123)"
echo "  Prometheus: http://localhost:9090"
echo "  Alertmanager: http://localhost:9093"
echo "  cAdvisor: http://localhost:8080"
echo "  Node Exporter: http://localhost:9100"
echo "  Loki: http://localhost:3100"
echo ""
echo "Next Steps:"
echo "  1. Log into Grafana at http://localhost:3001"
echo "  2. Import dashboard ID: 1860 (Node Exporter Full)"
echo "  3. Import dashboard ID: 13646 (Docker Containers)"
echo "  4. Create custom dashboards for your application"
echo ""
echo "Alerting:"
echo "  - Email alerts configured for: administrativerecordsystem@gmail.com"
echo "  - Critical alerts trigger immediate notifications"
echo "  - Warning alerts trigger periodic summaries"
echo "${NC}"

# Create sample dashboards
echo -e "${YELLOW}Creating sample dashboards...${NC}"
cat > /tmp/dashboard.yml <<'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF

echo -e "${GREEN}✓ Monitoring setup complete${NC}"