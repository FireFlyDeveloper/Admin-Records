# Admin-Records Production Deployment Guide

## Overview

This guide covers the complete deployment pipeline and production monitoring setup for the Admin-Records Administrative Records Management System.

## Architecture

### Services

- **Backend API** (Port 3000): Node.js/Express API with PostgreSQL
- **Frontend** (Port 80/443): React/Vite application served via Nginx
- **PostgreSQL** (Port 5432): Primary database
- **Redis** (Port 6379): Caching and session storage
- **Prometheus** (Port 9090): Metrics collection
- **Grafana** (Port 3001): Metrics visualization
- **Loki** (Port 3100): Log aggregation
- **Alertmanager** (Port 9093): Alert routing
- **cAdvisor** (Port 8080): Container metrics
- **Node Exporter** (Port 9100): Host metrics

## Quick Start

### 1. Prerequisites

- Docker and Docker Compose
- Git
- SMTP credentials for email alerts
- SSL certificates (optional, for HTTPS)

### 2. Clone and Setup

```bash
git clone <repository-url>
cd Admin-Records
cp .env.production .env
# Edit .env with your configuration
```

### 3. Deploy

```bash
# Full deployment
./deploy.sh

# Setup monitoring only
./setup-monitoring.sh
```

### 4. Verify

```bash
docker-compose -f docker-compose.prod.yml ps

# Health checks
curl http://localhost:3000/health  # Backend
curl http://localhost/health         # Frontend
curl http://localhost:9090/-/healthy # Prometheus
```

## Configuration

### Environment Variables (.env)

```bash
# Database
DB_USER=admin
DB_PASSWORD=your-secure-password

# Email (Gmail SMTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Monitoring
GRAFANA_ADMIN_PASSWORD=your-grafana-password
JWT_SECRET=your-jwt-secret

# Security
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

### Email Setup

1. Use Gmail App Password for `EMAIL_PASS`
2. Two-factor authentication must be enabled
3. Configure alert routing in `monitoring/alertmanager.yml`

### SSL/TLS Setup

1. Place certificates in `./certs/` directory
2. Update `nginx.ssl.conf` with certificate paths
3. Set `SSL_CERT_PATH` and `SSL_KEY_PATH` in `.env`

## Monitoring

### Dashboards

Access Grafana at `http://localhost:3001` (admin/admin123)

**Recommended Dashboards:**
- Node Exporter Full (ID: 1860) - System metrics
- Docker Monitoring (ID: 13646) - Container metrics
- Application metrics (custom)

### Alerting

**Critical Alerts:**
- Backend/Frontend downtime
- Database connectivity loss
- High error rates (>5%)
- Critical disk space (<5%)

**Warning Alerts:**
- High latency (>500ms p95)
- High memory usage (>85%)
- High CPU usage (>80%)
- Low disk space (<15%)
- High database connections (>80)

**Notifications:**
- Email: administrativerecordsystem@gmail.com
- Webhook: Configurable in Alertmanager

### Log Analysis

Access Loki at `http://localhost:3100`

**Query examples:**
```
{job="backend"} |= "error"
{job="frontend"} |~ "5.."
rate({job="backend"}[5m])
```

## CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/ci-cd.yml`)

1. **Test**: Runs backend/frontend tests
2. **Security Scan**: Snyk vulnerability scanning
3. **Build**: Creates Docker images
4. **Deploy**: Pushes to production
5. **Smoke Tests**: Validates deployment
6. **Notify**: Slack notifications

### Manual Deployment

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Push to registry
docker-compose -f docker-compose.prod.yml push

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## Backup & Recovery

### Database Backup

```bash
# Manual backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U admin admin_records > backup_$(date +%Y%m%d).sql

# Automated backup (cron)
0 2 * * * cd /opt/admin-records && docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U admin admin_records > /backups/admin_records_$(date +\%Y\%m\%d).sql
```

### Restore

```bash
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U admin admin_records < backup.sql
```

## Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs postgres

# Verify environment variables
docker-compose -f docker-compose.prod.yml exec postgres env | grep POSTGRES
```

**Backend Won't Start**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Check if port is in use
netstat -tlnp | grep 3000
```

**SSL Certificate Errors**
```bash
# Verify certificate paths
docker-compose -f docker-compose.prod.yml exec frontend ls -la /etc/nginx/certs/

# Check nginx config
docker-compose -f docker-compose.prod.yml exec frontend nginx -t
```

**Alerts Not Sending**
```bash
# Check Alertmanager logs
docker-compose -f docker-compose.prod.yml logs alertmanager

# Test SMTP
telnet smtp.gmail.com 587
```

### Health Checks

```bash
# All services
for service in backend frontend postgres redis; do
  echo "Checking $service..."
  docker-compose -f docker-compose.prod.yml ps $service
  docker-compose -f docker-compose.prod.yml exec $service curl -f http://localhost:3000/health
done
```

## Performance Tuning

### Backend

```bash
# Increase connection pool
docker-compose -f docker-compose.prod.yml exec backend env PG_POOL_MAX=20

# Enable clustering (PM2)
npm install -g pm2
pm2 start dist/index.js -i max
```

### Database

```bash
# PostgreSQL tuning (add to docker-compose.prod.yml)
command: >
  postgres
  -c shared_buffers=256MB
  -c effective_cache_size=1GB
  -c work_mem=64MB
```

### Monitoring Retention

```bash
# Prometheus retention
docker-compose -f docker-compose.prod.yml exec prometheus --storage.tsdb.retention.time=30d

# Loki retention
# Update monitoring/loki.yml: retention_period: 720h
```

## Security

### Network Security

```bash
# Firewall rules (UFW)
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

### Container Security

```bash
# Scan images
docker scan admin-records-backend:latest

# Use read-only containers (where applicable)
read_only: true
tmpfs:
  - /tmp
```

## Scaling

### Horizontal Scaling

```bash
# Scale backend instances
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Load balancer (HAProxy/Nginx)
# Add to docker-compose.prod.yml
```

### Vertical Scaling

```bash
# Increase resources in docker-compose.prod.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

## Support

- **Email**: administrativerecordsystem@gmail.com
- **Monitoring**: http://localhost:3001 (Grafana)
- **Logs**: http://localhost:3100 (Loki)
- **Alerts**: Check Alertmanager at http://localhost:9093