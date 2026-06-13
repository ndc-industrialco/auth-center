# Auth Domain — Backend

## Service Map

### `permissionService`
Resolves effective roles and permissions for a `(userId, appId)` pair.
Computes `permVersion` as a SHA-256 hash of sorted role+permission strings (first 12 hex chars).
- **Must not** call other services.
- **May** call `roleGrantRepository` and `permissionGrantRepository`.

### `tokenService`
Issues and verifies Auth Center JWTs using `jose` (HS256, `AUTH_SECRET`).
Assembles all `AuthCenterTokenClaims` from a provided `AuthUser` + `appId` + `sessionId`.
- **Always** sets `canSendDelegatedMail = false` when `authMethod !== 'ENTRA'`.
- **Must not** call repositories directly — receives `AuthUser` as input.
- Depends on `permissionService` for claim resolution.

### `sessionService`
Creates and revokes `UserSession` records.
Dual-writes revocation to Redis (fast path) and PostgreSQL (authoritative).
Fails open on Redis errors — DB is the source of truth.
- TTL: 8 hours per session.

### `localAuthService`
Handles `employeeId + password` login.
- Rate limits per `employeeId` key (not IP) to protect accounts without enabling user enumeration.
- Locks accounts after 5 failed attempts for 15 minutes.
- Always audits every attempt via `loginAuditRepository`.
- Delegates session creation to `sessionService`.
- Delegates token issuance to `tokenService`.

### `entraAuthService`
Handles Entra ID post-sign-in processing.
- Matches Entra profile to a User by `entraObjectId` link, then email fallback.
- Auto-creates User if `employeeId` is present in the Entra profile.
- Manages `ExternalIdentityLink` and `IdentityAccount` records.
- Supports admin-triggered link and unlink flows.

### `appRegistrationService`
Admin-only. Manages the `AppRegistration` registry and grants/revocations.
Validates that both user and app exist before creating any grant.

### `authService`
Public orchestrator. The only service that route handlers should import.
- `loginLocal` → delegates to `localAuthService`
- `logout` → delegates to `sessionService`
- `refreshToken` → validates session, re-issues token
- `getMe` → resolves user profile + current roles/permissions

## Repository Contract

Repositories expose domain-meaningful method names. No raw Prisma queries in services.
All repositories accept an optional `tx?: Prisma.TransactionClient` for transaction participation.
`loginAuditRepository` exposes no `update` or `delete` methods — append-only.
