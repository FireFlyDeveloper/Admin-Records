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

# Build main app
RUN npx tsc -p tsconfig.build.json

# Build scripts separately (using a different tsconfig that compiles to dist/scripts)
RUN mkdir -p dist/scripts && \
    mkdir -p /tmp/tsc_temp && \
    npx tsc scripts/migrate.ts scripts/seed.ts scripts/migrationHelpers.ts --outDir /tmp/tsc_temp --target ES2022 --module commonjs --esModuleInterop --skipLibCheck --ignoreConfig && \
    find /tmp/tsc_temp -name "*.js" -exec mv {} dist/scripts/ \; 2>/dev/null && \
    rm -rf /tmp/tsc_temp

# Storage
RUN mkdir -p /app/storage

EXPOSE 3000 3001

# Run migrations, seed, then start (using compiled JavaScript)
CMD sh -c "node dist/scripts/migrate.js && node dist/scripts/seed.js && node dist/index.js"
