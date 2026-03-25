# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && echo '{"type":"commonjs"}' > dist/package.json

# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine

# curl is needed for the HEALTHCHECK below
RUN apk add --no-cache curl

WORKDIR /app
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/knexfile.cjs ./knexfile.cjs
COPY --from=builder /app/migrate.cjs  ./migrate.cjs
COPY --from=builder /app/src          ./src

# Create upload and log directories; drop to least-privilege user
RUN mkdir -p uploads logs && chown -R node:node /app
USER node

EXPOSE 5000

# ECS / ALB target-group health checks poll this endpoint every 30 s.
# The container is marked unhealthy if it fails 3× in a row.
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Run Knex migrations then start the server.
# Set SKIP_MIGRATIONS=true to skip (useful for debugging or re-deploys).
CMD ["sh", "-c", \
    "if [ \"$SKIP_MIGRATIONS\" != 'true' ]; then npm run migrate; fi && node dist/app.js"]
