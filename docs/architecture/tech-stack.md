# Auth Center — Tech Stack

## Runtime

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16.2.9 (App Router) | Breaking changes from Next 15 — read `node_modules/next/dist/docs/` |
| Language | TypeScript 5 | Strict mode |
| React | 19.2.4 | Server Components for any admin UI |
| CSS | Tailwind CSS v4 | Not primary concern for Phase 1-2 |

## Data

| Layer | Technology | Notes |
|-------|-----------|-------|
| ORM | Prisma 7.8.0 | Breaking: no `url` in schema, use `prisma.config.ts` |
| DB Adapter | `@prisma/adapter-pg` 7.8.0 | Driver adapter pattern, no legacy `DATABASE_URL` in schema |
| Database | PostgreSQL | Connection via `DATABASE_URL` env |
| Cache / Revocation | Redis via `ioredis` | `REDIS_URL` env — fail-open on errors |

## Auth

| Layer | Technology | Notes |
|-------|-----------|-------|
| Entra SSO | `next-auth@beta` (Auth.js v5) | App Router native, `AUTH_SECRET` env |
| Entra Provider | `@auth/prisma-adapter` | Account linking |
| JWT (internal) | `jose` | HS256 signed with `AUTH_SECRET` |
| Local Passwords | `bcryptjs` | 12 rounds recommended |

## Validation

| Layer | Technology |
|-------|-----------|
| Schema validation | `zod` |

## Prisma Client Import Path

```typescript
import { PrismaClient } from '@/app/generated/prisma';
import type { Prisma, User } from '@/app/generated/prisma';
```

Never import from `@prisma/client` directly.

## Environment Variables Required

```
DATABASE_URL=
DIRECT_URL=          # optional for Prisma Accelerate
REDIS_URL=
AUTH_SECRET=
AUTH_URL=
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
```
