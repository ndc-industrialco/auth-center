# Auth Center — JWT Claims Contract (Frozen)

Version: **1.0** — frozen 2026-06-11  
Algorithm: **HS256**  
Issuer: `"auth-center"`  
TTL: **3600 seconds** (1 hour)

Breaking changes to this contract require a version bump and a migration path for all consuming apps.

---

## Standard Claims

| Claim | Type | Required | Description |
|-------|------|----------|-------------|
| `iss` | string | Yes | Always `"auth-center"` |
| `aud` | string | Yes | The `appId` the token was issued for (e.g. `"qms"`) |
| `sub` | string | Yes | Auth Center `User.id` (cuid) |
| `iat` | number | Yes | Issued-at timestamp (Unix seconds) |
| `exp` | number | Yes | Expiry timestamp (Unix seconds, TTL = 3600) |

## Auth Center Claims

| Claim | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Alias for `sub`. Explicit for consuming app readability. |
| `employeeId` | string | Yes | Canonical business key. Stable across all enterprise apps. |
| `authMethod` | `"ENTRA"` \| `"LOCAL_PASSWORD"` \| `"LOCAL_OTP"` | Yes | Authentication method used for this session. |
| `m365Linked` | boolean | Yes | Whether the user has a linked Entra identity. |
| `canSendDelegatedMail` | boolean | Yes | **Always `false` for LOCAL sessions.** Only `true` for ENTRA sessions where business policy explicitly allows delegated mail. |
| `departmentId` | string \| null | Yes | User's HR department ID. May be null if not populated. |
| `appRoles` | string[] | Yes | Role names granted to this user for the `aud` app (e.g. `["QMS_ADMIN"]`). Empty array if no roles. |
| `permVersion` | string | Yes | 12-character hex hash of sorted role+permission set. Consuming apps cache this and trigger re-authentication when it changes. |
| `sessionId` | string | Yes | UUID mapping to `UserSession` record in Auth Center DB. Used for revocation checks. |

---

## Contract Rules for Consuming Apps

1. **Always validate `aud`** — reject tokens where `aud !== your_app_id`.
2. **Always validate `iss`** — reject tokens where `iss !== "auth-center"`.
3. **Never trust `canSendDelegatedMail = true` for LOCAL sessions** — this is enforced server-side but consuming apps must not assume it.
4. **Cache `permVersion`** — store with your session. If the value changes on refresh, consider forcing a full re-authentication.
5. **Do not use `employeeId` as a security principal** — it is a business key for display and correlation only. Use `userId` (`sub`) as the identity key.
6. **Token refresh** — issue a new token via `POST /api/auth/refresh` when `exp - now < 300` (5 minutes).

---

## Breaking Change Policy

These changes require a version bump and migration notice:

- Removing or renaming any claim
- Changing a claim's type
- Changing the issuer or algorithm
- Reducing the token TTL below 600 seconds

These changes are additive and do NOT require a version bump:

- Adding a new optional claim
- Extending enum values for `authMethod`

---

## Validation Reference (Node.js / jose)

```typescript
import { jwtVerify } from 'jose';

const { payload } = await jwtVerify(token, secret, {
  issuer: 'auth-center',
  audience: 'qms',         // your appId
});
// payload is AuthCenterTokenClaims
```

Secret = `AUTH_CENTER_SECRET` env variable (same value as Auth Center's `AUTH_SECRET`).
