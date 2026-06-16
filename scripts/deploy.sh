#!/usr/bin/env bash
# scripts/deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
# Vercel/Render-style auto-deploy for Admin-Records.
#
# Triggered automatically by .git/hooks/post-push on every successful
# `git push` to any branch. Can also be run manually:  `make deploy`
#
# What it does:
#   1. Records the commit SHA being deployed.
#   2. Rebuilds + recreates the frontend & backend containers.
#   3. Waits for the new containers to be healthy.
#   4. Runs a smoke test (login API) to confirm the new code is live.
#   5. Logs everything to /root/tmp/deploy.log.
#
# Exit codes:
#   0  → deploy succeeded, smoke test passed
#   1  → build/rollout failed
#   2  → smoke test failed (containers up but app not responding)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="docker-compose.yml"
LOG_FILE="/root/tmp/deploy.log"
HEALTH_TIMEOUT=60   # seconds to wait for containers
SMOKE_RETRIES=5
SMOKE_DELAY=3

cd "$REPO_ROOT"

# ── 1. Identify the commit we're deploying ───────────────────────────────────
SHA="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'detached')"
TS="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

log() { echo "[$TS] $*" | tee -a "$LOG_FILE" ; }

log "════════════════════════════════════════════════════════════════════"
log "  DEPLOY  branch=$BRANCH  sha=$SHA"
log "════════════════════════════════════════════════════════════════════"

# ── 2. Rebuild + recreate containers ────────────────────────────────────────
# `--force-recreate` ensures running containers are always replaced even if
# the image hash didn't change (Docker Compose's default skip behavior would
# otherwise leave stale containers serving old code).
# `--no-deps` prevents unrelated services from being restarted.
log "▶ docker compose -f $COMPOSE_FILE up -d --build --force-recreate --no-deps frontend backend"
if ! docker compose -f "$COMPOSE_FILE" up -d --build --force-recreate --no-deps frontend backend >> "$LOG_FILE" 2>&1; then
  log "✖ docker compose up failed — see $LOG_FILE"
  exit 1
fi
log "✔ containers recreated"

# ── 3. Wait for backend health ──────────────────────────────────────────────
log "▶ waiting up to ${HEALTH_TIMEOUT}s for backend health…"
elapsed=0
while [ $elapsed -lt $HEALTH_TIMEOUT ]; do
  if curl -fsS -o /dev/null http://localhost:3000/health 2>/dev/null; then
    log "✔ backend healthy after ${elapsed}s"
    break
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done
if [ $elapsed -ge $HEALTH_TIMEOUT ]; then
  log "✖ backend did not become healthy within ${HEALTH_TIMEOUT}s"
  exit 1
fi

# ── 4. Wait for frontend health ─────────────────────────────────────────────
log "▶ waiting up to ${HEALTH_TIMEOUT}s for frontend health…"
elapsed=0
while [ $elapsed -lt $HEALTH_TIMEOUT ]; do
  if curl -fsS -o /dev/null http://localhost:8180/ 2>/dev/null; then
    log "✔ frontend healthy after ${elapsed}s"
    break
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done
if [ $elapsed -ge $HEALTH_TIMEOUT ]; then
  log "✖ frontend did not become healthy within ${HEALTH_TIMEOUT}s"
  exit 1
fi

# ── 5. Smoke test: login API round-trip ─────────────────────────────────────
log "▶ smoke test: POST /auth/login"
attempt=0
login_ok=0
while [ $attempt -lt $SMOKE_RETRIES ]; do
  attempt=$((attempt + 1))
  if curl -fsS -X POST http://localhost:3000/auth/login \
       -H 'Content-Type: application/json' \
       -d '{"email":"admin@local","password":"testpass"}' \
       -o /tmp/deploy-smoke.json 2>/dev/null; then
    if grep -q '"token"' /tmp/deploy-smoke.json; then
      login_ok=1
      log "✔ login succeeded on attempt $attempt"
      break
    fi
  fi
  log "  attempt $attempt failed, retrying in ${SMOKE_DELAY}s…"
  sleep $SMOKE_DELAY
done

if [ $login_ok -eq 0 ]; then
  log "✖ smoke test failed after $SMOKE_RETRIES attempts"
  exit 2
fi

# ── 6. Image cleanup ────────────────────────────────────────────────────────
log "▶ pruning dangling images"
docker image prune -f >> "$LOG_FILE" 2>&1 || true

log "════════════════════════════════════════════════════════════════════"
log "  ✓ DEPLOY OK  branch=$BRANCH  sha=$SHA"
log "════════════════════════════════════════════════════════════════════"
