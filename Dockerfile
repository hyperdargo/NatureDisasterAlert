# syntax=docker/dockerfile:1

# Multi-stage build. The final image carries the compiled app and nothing else:
# no source, no build tools, no dev dependencies.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# The postinstall step copies MapLibre's worker into public/, so scripts must
# run here. --ignore-scripts would produce a silently broken map.
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Baked into the client bundle at build time, so it must be present now rather
# than at run time.
ARG NEXT_PUBLIC_SITE_URL=https://disasteralert.ankitgupta.com.np
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user. If the process is ever compromised it should not own
# the filesystem it is standing on.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# `output: "standalone"` emits a minimal server with only the modules actually
# imported, which is a fraction of node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Hits a real route, so the container is only healthy when it can actually
# serve a page.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/prepare').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
