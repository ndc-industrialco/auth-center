# ── Stage 1: Install all dependencies ──────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

# ── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build

# ── Stage 3: Production runner ──────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=7777
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# App files
COPY --from=builder --chown=nextjs:nodejs /app/package.json       ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules       ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next              ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public             ./public

# Prisma — needed for migrations and the Prisma driver at runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma             ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts   ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/app/generated      ./app/generated

USER nextjs
EXPOSE 3001

CMD ["npm", "start"]
