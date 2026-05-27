# 🚀 Docker Deployment Setup Guide

## ✅ Prerequisites Met

- Both Docker builds working (backend & frontend)
- TypeScript errors resolved
- Environment files configured
- .gitignore secured
- docker-compose.yml ready

---

## 🔐 Step 1: Configure Environment Variables

### Backend Configuration
Create `Backend-app/.env.production`:

```bash
cd /root/tmp/Admin-Records/Backend-app
cp .env.example .env.production
```

**Edit `.env.production` and change ALL secrets:**
- `DB_PASSWORD` - Your PostgreSQL password
- `JWT_SECRET` - Generate random string (32+ chars)
- `JWT_REFRESH_SECRET` - Generate different random string
- `JWT_REFRESH_EXPIRY_SECONDS` - 604800 (7 days) recommended
- `EMAIL_HOST` / `EMAIL_USER` / `EMAIL_PASS` - Your SMTP credentials

**Generate JWT secrets:**
```bash
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
```

### Root Configuration
Create production environment file:

```bash
cd /root/tmp/Admin-Records
cp .env.example .env.production
```

**Edit `.env.production` and change:**
- `DB_USER` - PostgreSQL username
- `DB_PASSWORD` - PostgreSQL password (match Backend-app value)
- `GRAFANA_ADMIN_PASSWORD` - Grafana admin password (optional)
- `API_KEY_SECRET` - API key secret for external APIs

### Frontend Configuration
Frontend uses `.env.local` (no secrets needed):

```bash
cd /root/tmp/Admin-Records/Frontend-app
cp .env.example .env.local
```

**Edit `.env.local`:**
- `VITE_APP_NAME` - Your app name
- `VITE_MAX_UPLOAD_SIZE` - Max file upload size (bytes)
- `VITE_DEFAULT_PAGE_SIZE` - Items per page (default: 25)

---

## 🔧 Step 2: Verify .gitignore Security

✅ **Already configured** - but verify:

```bash
cat /root/tmp/Admin-Records/.gitignore | grep -A5 "Environment files"
```

Should show:
```
# Environment files (contain secrets)
.env
.env.production
.env.local
.env.*.local
```

**Verify .env files are ignored:**
```bash
cd /root/tmp/Admin-Records
git status | grep .env
```

Expected: **NO output** (files properly ignored)

---

## 🐳 Step 3: Docker Compose Up

### Option A: Full Build (includes multi-stage builds)

```bash
cd /root/tmp/Admin-Records

# Pull base images and build
docker-compose pull

# Build and start services
docker-compose up --build -d

# Or if .env.production exists:
docker-compose --env-file .env.production up --build -d
```

### Option B: Use Pre-built Images (faster)

If you built images separately:
```bash
cd /root/tmp/Admin-Records

# Start services
docker-compose up -d
```

---

## ✅ Step 4: Verify Services

### Check service status
```bash
# List running containers
docker ps

# Expected output:
# admin-records-backend   running  (ports 3000, 3001)
# admin-records-frontend  running  (port 80)
```

### Check backend health
```bash
# Test backend API
curl http://localhost:3000/health

# Expected: {"status":"ok","timestamp":"..."}

# Check logs
docker logs admin-records-backend --tail 20
```

### Check frontend
```bash
# Open browser: http://localhost
# Should show: Admin Records Frontend

# Check logs
docker logs admin-records-frontend --tail 20
```

### Check database/migrations
```bash
# Backend container runs migrations on start
docker logs admin-records-backend | grep -i migration

# Expected: "Database migrations completed successfully"
```

---

## 🏥 Step 5: Health Monitoring

The docker-compose.yml includes health checks:

### Backend health check
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

**Manual health check:**
```bash
docker exec admin-records-backend wget --quiet --tries=1 --spider http://localhost:3000/health && echo "✅ Backend healthy" || echo "❌ Backend unhealthy"
```

---

## 🐛 Troubleshooting

### If backend fails to start:

```bash
# Check logs
docker logs admin-records-backend

# Common issues:
# 1. Database not found → Verify DATABASE_URL in Backend-app/.env.production
# 2. Port already in use → Check: lsof -i :3000
# 3. Missing migrations → Run: docker exec admin-records-backend npx ts-node scripts/migrate.ts
```

### If frontend fails to start:

```bash
# Check logs
docker logs admin-records-frontend

# Common issues:
# 1. Backend not ready → Wait for backend health check to pass
# 2. Nginx config error → Check docker logs for nginx errors
# 3. Build failed → Rebuild: docker-compose up --build
```

### If ports are already in use:

```bash
# Find what's using the ports
sudo lsof -i :3000  # Backend API
sudo lsof -i :3001  # Backend WebSocket
sudo lsof -i :80    # Frontend

# Kill processes if needed
sudo kill -9 <PID>

# Or change ports in docker-compose.yml
# Change "3000:3000" to "3005:3000" etc.
```

---

## 🔄 Step 6: Update Services

### To update with new changes:

```bash
cd /root/tmp/Admin-Records

# Pull latest changes (if using git)
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up --build -d

# Or just restart without rebuild:
docker-compose restart
```

---

## 🗑️ Step 7: Cleanup

### View logs
```bash
# All service logs
docker-compose logs

# Backend only
docker-compose logs backend

# Frontend only
docker-compose logs frontend

# Follow logs
docker-compose logs -f backend
```

### Stop services
```bash
# Stop but keep containers
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop + remove containers + volumes
docker-compose down -v
```

### Remove images (to force rebuild)
```bash
docker rmi backend-app frontend-app
# Or
docker-compose build --no-cache
```

---

## 📊 Complete Verification Checklist

- [x] Both Docker images build successfully
- [x] `.env.production` created with secrets
- [x] Backend-app/.env.production created
- [x] Frontend-app/.env.local created (optional)
- [x] `.gitignore` configured to ignore .env files
- [ ] Environment variables configured with real values
- [ ] `docker-compose up --build -d` starts both services
- [ ] Backend health check passes: `curl http://localhost:3000/health`
- [ ] Frontend accessible at http://localhost
- [ ] Database migrations complete
- [ ] Logs show no errors
- [ ] All ports available: 3000, 3001, 80
- [ ] can login/create account (test in browser)

---

## 🔄 Quick Commands Reference

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# Rebuild
docker-compose up --build -d

# Logs
docker-compose logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Status
docker ps
docker stats

# Shell into container
docker exec -it admin-records-backend sh
docker exec -it admin-records-frontend sh
```

---

## 🎯 Deployment Complete

Once everything is running:

1. **Open browser**: http://localhost
2. **Backend API**: http://localhost:3000
3. **Backend health**: http://localhost:3000/health
4. **Backend docs**: http://localhost:3000/api-docs (if available)

**You're ready to use the Admin Records platform!** 🚀

---

**Need help?** Check logs with:
```bash
docker-compose logs | grep -i error
docker logs admin-records-backend --tail 50
docker logs admin-records-frontend --tail 50
```