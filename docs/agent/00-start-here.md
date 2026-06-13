# Auth Center — Agent Start Here

This repository is the **Auth Center** for NDC Enterprise.

It is a standalone Next.js 16 (App Router) application responsible for:
- Microsoft Entra ID (M365) and local employee authentication
- JWT access token issuance for all enterprise apps
- Centralized role and permission grants
- Session lifecycle and revocation
- Login audit trail

## Single Domain

There is one domain: **auth**. All work lives under this domain.

## Required Reading Order

1. This file
2. `docs/agent/01-current-state.md`
3. `docs/architecture/domain-map.md`
4. `docs/architecture/tech-stack.md`
5. `rules/architecture-api.md`
6. `rules/folder-structure-naming.md`
7. `rules/prisma-database.md`
8. `rules/authz-permission-matrix.md`
9. `rules/security-review.md`

## Key Constraints

- Never import `@prisma/client` directly — use `@/app/generated/prisma`
- Never import Prisma or `db` inside `app/api/`
- All Prisma access goes through `repositories/`
- Business logic stays in `services/`
- Route handlers must stay under ~30 lines
- LOCAL sessions must never get `canSendDelegatedMail = true`
- `LoginAudit` is append-only — no update or delete
