# ===================================================
# REVITEST BACKEND DOCKERFILE (Multi-Stage Production)
# ===================================================

# Stage 1: Build & Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app

# Install security patches & build essentials if required
RUN apk update && apk upgrade && apk add --no-cache dumb-init

COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Final Minimal Runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Run as non-privileged user for container security
USER node

# Copy dumb-init for proper signal forwarding
COPY --from=dependencies /usr/bin/dumb-init /usr/bin/dumb-init
COPY --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src/ ./src/

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Native container healthcheck via API endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/server.js"]
