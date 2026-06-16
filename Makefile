# Admin-Records Makefile
# Convenience targets. Most things run automatically via the post-push git hook.

.PHONY: help deploy deploy-fg logs status smoke stop clean install-hooks

COMPOSE := docker compose -f docker-compose.yml

help:           ## Show this help.
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

deploy:         ## Run the deploy script (same as auto-deploy on push).
	./scripts/deploy.sh

deploy-fg:      ## Rebuild only the frontend container (faster inner-loop).
	$(COMPOSE) up -d --build --no-deps frontend

logs:           ## Tail logs from all services.
	$(COMPOSE) logs -f --tail=200

status:         ## Show running containers + health.
	@docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | \
	  grep -E "admin-records|NAMES" || true

smoke:          ## Run the login smoke test against the live stack.
	@bash -c '\
	  resp=$$(curl -fsS -X POST http://localhost:3000/auth/login \
	    -H "Content-Type: application/json" \
	    -d "{\"email\":\"admin@local\",\"password\":\"testpass\"}"); \
	  if echo "$$resp" | grep -q "\"token\""; then \
	    echo "✔ login OK"; \
	  else \
	    echo "✖ login FAILED: $$resp"; exit 1; \
	  fi'

stop:           ## Stop all admin-records containers (data preserved).
	$(COMPOSE) stop

clean:          ## Stop + remove containers + images (DB volumes preserved).
	$(COMPOSE) down --rmi local

install-hooks:  ## Re-install the post-push auto-deploy hook.
	@chmod +x .git/hooks/post-push
	@echo "✔ post-push hook installed"
