# ============================================================
# Dockerfile - PRESTAP (Next.js 16 + TypeScript + Tailwind)
# Multi-stage build optimizado para Staging Puramente Local
# ============================================================

FROM node:22-alpine AS base

# --- Etapa 1: Dependencias ---
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN npm install -g pnpm@11.5.3

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --dangerously-allow-all-builds

# --- Etapa 2: Compilación (Builder) ---
FROM base AS builder
WORKDIR /app
RUN npm install -g pnpm@11.5.3

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm run build

# --- Etapa 3: Ejecución ligera (Runner) ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV APP_ENV=staging
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Usuario seguro no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Crear directorio de caché con permisos adecuados
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copiar artefactos standalone y estáticos generados por Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
