FROM node:22-alpine

WORKDIR /app

# Install all deps (devDeps needed for migrations)
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

# Copy source + build
COPY tsconfig.json tsconfig.build.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY migrations/ ./migrations/

# Build everything (including scripts)
RUN npx tsc -p tsconfig.build.json

# Storage
RUN mkdir -p /app/storage

EXPOSE 3000 3001

# Run migrations, seed, then start (using compiled JavaScript)
CMD sh -c "node dist/scripts/migrate.js && node dist/scripts/seed.js && node dist/index.js"
