# ===================================================
# REVITEST CLIENT DOCKERFILE (Multi-Stage Production)
# ===================================================

# Stage 1: Build Frontend Assets
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./
RUN npm run build

# Stage 2: Serve via High-Performance Nginx
FROM nginx:1.25-alpine AS runner

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy built production bundle
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy optimized SPA nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
