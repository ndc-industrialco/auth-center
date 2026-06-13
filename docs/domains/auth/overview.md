# Auth Domain — Overview

## Purpose

Auth Center is the identity and authorization hub for all NDC enterprise applications.

## Identity Model

Two identity types are supported:

### ENTRA (Microsoft Entra ID / M365)
- Signs in via Microsoft SSO
- Has an `ExternalIdentityLink` linking Entra `objectId` to `User.employeeId`
- Can receive `canSendDelegatedMail = true` if business policy allows
- Auth.js v5 handles the Entra OAuth flow

### LOCAL
- Signs in with `employeeId + password`
- Password stored as bcrypt hash in `LocalCredential`
- Can never receive delegated mail capability
- Subject to brute-force lockout (5 failed attempts → 15-minute lock)

## Token Contract

Auth Center issues HS256 JWTs to consuming apps. Each token is scoped to one `appId`.

Key claims: `sub`, `userId`, `employeeId`, `authMethod`, `m365Linked`, `canSendDelegatedMail`, `departmentId`, `appRoles`, `permVersion`, `sessionId`

Consuming apps validate tokens locally using `AUTH_SECRET` without roundtripping to Auth Center on every request.

## Session Revocation

Revocation is dual-write:
1. Redis key `session:revoked:{sessionId}` — fast path, fail-open
2. `UserSession.status = REVOKED` in PostgreSQL — authoritative audit record

## Centralized Authorization

Roles and permissions are granted per `(userId, appId)` pair via `RoleGrant` and `PermissionGrant`.
The `permVersion` claim lets consuming apps detect stale permission caches without a live lookup.
