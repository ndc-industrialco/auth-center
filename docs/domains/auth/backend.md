# Auth Domain Backend

## permissionService

Resolves effective roles for a `(userId, appId)` pair.

It computes `roleVersion` as a SHA-256 hash of the sorted granted-role set, truncated to 12 hex characters.

## tokenService

Issues and verifies Auth Center JWTs using `jose`.

Current behavior:

- production signing uses `RS256`
- non-production may fallback to `HS256`
- tokens contain `appRoles` and `roleVersion`
- verification also checks live session validity

## authService

Top-level orchestrator for public auth workflows such as:

- local login
- token refresh
- current-user resolution
- audience checks
