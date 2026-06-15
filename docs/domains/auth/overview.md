# Auth Domain Overview

## Purpose

Auth Center is the identity and authorization hub for NDC enterprise applications.

## Identity Model

Two identity types are supported:

### ENTRA

- Sign in via Microsoft Entra ID / Microsoft 365
- Linked through Entra object ID to the Auth Center user
- May receive `canSendDelegatedMail = true` if business policy allows

### LOCAL

- Sign in with `employeeId + password`
- Password is stored as a bcrypt hash
- Can never receive delegated mail capability

## Token Model

Auth Center issues app-scoped JWTs to consuming apps.

Production model:

- signing algorithm is `RS256`
- consuming apps verify via `JWKS`

Non-production fallback:

- `HS256` with `AUTH_SECRET`

Important claims:

- `sub`
- `userId`
- `employeeId`
- `authMethod`
- `m365Linked`
- `canSendDelegatedMail`
- `departmentId`
- `appRoles`
- `roleVersion`
- `sessionId`

## Session Revocation

Revocation is dual-write:

1. Redis fast path
2. PostgreSQL `UserSession` authoritative record

## Centralized Authorization

Roles and permissions are granted per `(userId, appId)` pair.

Consumer apps should use:

- `appRoles` for authorization
- `roleVersion` to detect stale role state
