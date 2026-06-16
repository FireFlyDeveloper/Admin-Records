# Admin-Records

Document & inventory management system for an office/administrative environment.

## Auto-Deploy (Vercel-style)

Every push to `main` automatically rebuilds and redeploys the local Docker
stack. No `docker compose up` needed.

### How it works

1. You commit + push
2. `scripts/git-push` runs the real `git push`
3. If push succeeded, `scripts/deploy.sh` runs:
   - `docker compose up -d --build --force-recreate --no-deps frontend backend`
   - waits for backend health (up to 60s)
   - waits for frontend health (up to 60s)
   - runs a login smoke test (5 retries)
   - prunes dangling images
4. Deploy log: `/root/tmp/deploy.log`

### Two ways to use it

**Option A — `make push` (zero install, per-repo):**
```bash
make push        # pushes to origin with current branch
make push BRANCH=develop
```

**Option B — `make install-hooks` once, then plain `git push` everywhere:**
```bash
make install-hooks
# Symlinks scripts/git-push to /usr/local/bin/git-push so plain `git push`
# triggers a deploy. Re-runnable, idempotent.
git push origin main    # auto-deploys on success
```

### Bypassing auto-deploy

```bash
SKIP_AUTO_DEPLOY=1 git push
```

### Manual deploy (no push)

```bash
make deploy          # full deploy + smoke test
make deploy-fg       # frontend-only fast rebuild
make smoke           # smoke test only (no rebuild)
make logs            # tail container logs
make status          # show running containers
make stop            # stop all containers (data preserved)
make clean           # stop + remove containers + local images
```

### Logs

- Deploy log:  `/root/tmp/deploy.log`
- Container logs:  `make logs`  or  `docker compose logs -f --tail=200`

### Adding it to a new machine

```bash
git clone <repo>
cd Admin-Records
make install-hooks    # one-time: install the git-push wrapper
make push             # deploys on every push
```

## Local dev (no deploy)

```bash
# Terminal 1 — backend (port 4000)
cd Backend-app && npm run dev

# Terminal 2 — frontend (port 3000, proxies /api, /auth, etc. to :4000)
cd Frontend-app && npm run dev
```

## Test login

```
email:    admin@local
password: testpass
```

## CI/CD (production deploy to remote host)

`.github/workflows/ci-cd.yml` handles deploy to the production server on every
push to `main`. Required GitHub secrets:
- `SERVER_HOST`, `SERVER_USERNAME`, `SERVER_SSH_KEY`, `SERVER_PORT`
- `SNYK_TOKEN`
- `SLACK_WEBHOOK`

The local `git-push` wrapper is the **dev / local-stack** equivalent of the
GitHub Actions deploy job — same behaviour, no GitHub secrets required.
