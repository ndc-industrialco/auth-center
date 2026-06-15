# Auth Center Tech Stack

## Runtime

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16.2.9 (App Router) | |
| Language | TypeScript 5 | Strict mode |
| React | 19.2.4 | |
| CSS | Tailwind CSS v4 | |

## Data

| Layer | Technology | Notes |
|-------|-----------|-------|
| ORM | Prisma 7.8.0 | |
| DB Adapter | `@prisma/adapter-pg` | |
| Database | PostgreSQL | |
| Cache / Revocation | Redis via `ioredis` | |

## Auth

| Layer | Technology | Notes |
|-------|-----------|-------|
| Entra SSO | `next-auth@beta` | Auth.js v5 |
| JWT | `jose` | Production `RS256` with public `JWKS`; non-production `HS256` fallback with `AUTH_SECRET` |
| Local Passwords | `bcryptjs` | |

## Validation

| Layer | Technology |
|-------|-----------|
| Schema validation | `zod` |

## Required Environment Variables

```env
DATABASE_URL=
DIRECT_URL=
REDIS_URL=
AUTH_SECRET=
AUTH_URL=
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
```

Production also requires:

```env
AUTH_PRIVATE_KEY=
AUTH_PUBLIC_KEY=
AUTH_KEY_ID=
```
