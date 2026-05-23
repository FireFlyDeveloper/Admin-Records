# ---- Build stage ----
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

COPY tsconfig.json tsconfig.app.json tsconfig.node.json* vite.config.ts index.html ./
COPY tailwind.config.ts postcss.config.js ./
COPY src/ ./src/
COPY public/ ./public/

RUN npm run build

# ---- Serve stage ----
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
