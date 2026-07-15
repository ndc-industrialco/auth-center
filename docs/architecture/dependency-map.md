# Auth Center — Dependency Map

## Runtime Dependencies

| Package | Purpose | Config |
|---------|---------|--------|
| `next` 16.2.9 | Framework (App Router) | `next.config.ts` |
| `react` 19 | UI runtime | — |
| `next-auth@beta` (v5) | Auth.js v5 — Entra SSO | `auth.ts`, `lib/auth.config.ts` |
| `@auth/prisma-adapter` | Auth.js Prisma session adapter | `auth.ts` |
| `prisma` / `@prisma/client` 7 | ORM + schema management | `prisma/schema.prisma`, `prisma.config.ts` |
| `@prisma/adapter-pg` | PostgreSQL driver adapter for Prisma 7 | `lib/db.ts` |
| `pg` | PostgreSQL client | `lib/db.ts` |
| `ioredis` | Redis client | `lib/redis.ts` |
| `jose` | JWT signing and verification | `services/tokenService.ts` |
| `bcryptjs` | Password hashing | `services/localAuthService.ts` |
| `zod` | Input validation | `schemas/` |
| `dotenv` | Environment loading | `prisma.config.ts` |

## Dev Dependencies

| Package | Purpose |
|---------|---------|
| `vitest` | Unit test runner |
| `@vitest/coverage-v8` | Coverage reports |
| `typescript` | Type checking |
| `tailwindcss` v4 | CSS |
| `eslint` | Linting |
| `prisma` CLI | Schema/migration management |

## External Services

| Service | Used For | Env Vars |
|---------|----------|----------|
| PostgreSQL | Primary data store | `DATABASE_URL`, `DIRECT_URL` |
| Redis | Session revocation, rate limiting | `REDIS_URL` |
| Microsoft Entra ID | Employee SSO | `AZURE_AD_TENANT_ID`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET` |
| Microsoft Graph | Employee profile enrichment and user-scoped CRM mail search | Uses Auth Center Graph app credentials; mailbox scope is derived from the authenticated Entra-linked user |

## Internal Service Dependencies

```
authService
  ├── localAuthService
  │     ├── userRepository
  │     ├── localCredentialRepository
  │     ├── loginAuditRepository
  │     ├── sessionService → sessionRepository, lib/sessionRevocation (Redis)
  │     └── tokenService → permissionService → roleGrantRepository, permissionGrantRepository
  └── entraAuthService
        ├── userRepository
        ├── externalIdentityLinkRepository
        ├── identityAccountRepository
        └── loginAuditRepository

appRegistrationService
  ├── appRegistrationRepository
  ├── roleGrantRepository
  ├── permissionGrantRepository
  ├── userRepository
  └── adminAuditRepository

mail search API
  └── mailService
        └── graphAdminClient → Microsoft Graph mail folders/messages
```
