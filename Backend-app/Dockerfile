FROM node:22-alpine

WORKDIR /app

# Install all deps
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

# Copy source
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY scripts/ ./scripts/
COPY tsconfig.json tsconfig.build.json ./

# Copy scripts temporarily to src for compilation
RUN cp -R scripts/ src/scripts/

# Build with scripts included
RUN npx tsc -p tsconfig.build.json

# Compile migration .ts files to dist/migrations/ with shared migration helpers.
RUN npx tsc migrations/*.ts \
    --outDir dist \
    --target ES2022 \
    --module commonjs \
    --esModuleInterop \
    --skipLibCheck \
    --ignoreConfig

# Move compiled scripts to organized location  
RUN mkdir -p dist/scripts && \
    find dist/src/scripts -name "*.js" -exec mv {} dist/scripts/ \; 2>/dev/null || true

# Clean up source scripts
RUN rm -rf src/scripts/

# Create uploads directory
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

EXPOSE 3000 3001

# Run migrations, seed, then start
CMD sh -c "node dist/scripts/migrate.js && node dist/scripts/seed.js && node dist/index.js"