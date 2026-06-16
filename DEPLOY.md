# Admin-Records

Document & inventory management system for an office/administrative environment.

## Auto-Deploy (Vercel-style)

Every push to `main` automatically rebuilds and redeploys the local Docker stack
via the `post-push` git hook. No `docker compose up` needed.

### How it works

1. You commit + push: `git push origin main`
2. The `post-push` hook fires locally (after the push to GitHub completes)
3. `scripts/deploy.sh` runs:
   - `docker compose up -d --build --force-recreate --no-deps frontend backend`
   - waits for backend health
   - waits for frontend health
   - runs a login smoke test
   - prunes dangling images
4. Deploy log: `/root/tmp/deploy.log`

### When the hook is installed

Already done — `.git/hooks/post-push` is executable. Verify with:
```bash
ls -la .git/hooks/post-push
# -rwxr-xr-x ... post-push
```

If you ever need to re-install (e.g. after a fresh clone), the Makefile target:
```bash
make install-hooks
```

### Bypassing auto-deploy

```bash
SKIP_AUTO_DEPLOY=1 git push
```

### Manual deploy

```bash
make deploy          # full deploy + smoke test
make deploy-fg       # frontend-only fast rebuild
make smoke           # smoke test only
make logs            # tail container logs
make status          # show running containers
```

### Logs

- Deploy log:  `/root/tmp/deploy.log`
- Container logs:  `make logs`  or  `docker compose logs -f --tail=200`

### Adding it to a new machine

1. Clone the repo
2. `make install-hooks`
3. Push — deploy will run automatically

## Local dev

```bash
# Terminal 1 — backend
cd Backend-app && npm run dev

# Terminal 2 — frontend
cd Frontend-app && npm run dev
# → http://localhost:3000 (proxies /api, /auth, /audit-logs, etc. to :4000)
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

The local `post-push` hook is the **dev / local-stack** equivalent of the
GitHub Actions deploy job.
