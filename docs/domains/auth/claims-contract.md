# Auth Center JWT Claims Contract

Version: **1.1**  
Last updated: **2026-06-15**  
Issuer: **`auth-center`**  
Production algorithm: **`RS256`**  
Non-production fallback: **`HS256`**  
TTL: **28800 seconds** (8 hours)

Breaking changes to this contract require a version bump and a migration path for consuming apps.

## Standard Claims

| Claim | Type | Required | Description |
|-------|------|----------|-------------|
| `iss` | string | Yes | Always `auth-center` |
| `aud` | string | Yes | The target `appId` |
| `sub` | string | Yes | Auth Center `User.id` |
| `iat` | number | Yes | Issued-at Unix timestamp |
| `exp` | number | Yes | Expiry Unix timestamp |

## Auth Center Claims

| Claim | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Alias of `sub` |
| `employeeId` | string | Yes | Canonical employee identifier |
| `authMethod` | `"ENTRA" \| "LOCAL_PASSWORD" \| "LOCAL_OTP"` | Yes | Login method used for this session |
| `m365Linked` | boolean | Yes | Whether the user has a linked Entra identity |
| `canSendDelegatedMail` | boolean | Yes | Always `false` for LOCAL sessions |
| `departmentId` | string \| null | Yes | Department identifier if available |
| `appRoles` | string[] | Yes | Role names granted for the `aud` app |
| `roleVersion` | string | Yes | 12-character hash of the granted role set |
| `sessionId` | string | Yes | Auth Center session identifier |

## Consumer-App Rules

1. Always validate `aud`
2. Always validate `iss`
3. Verify production tokens using `JWKS`
4. Use `appRoles` for authorization
5. Treat `roleVersion` as the freshness marker for role changes
6. Do not use `employeeId` as the security principal
7. Never treat `canSendDelegatedMail = true` as valid for LOCAL sessions

## Validation Reference

```ts
import { createRemoteJWKSet, jwtVerify } from 'jose';

const jwks = createRemoteJWKSet(new URL(process.env.AUTH_CENTER_JWKS_URL!));

const { payload } = await jwtVerify(token, jwks, {
  issuer: 'auth-center',
  audience: 'qms',
});
```

## Important Notes

- Production integrations should not use a shared secret as the main verification model
- `HS256` with `AUTH_SECRET` is a non-production fallback only
- New consumer apps should build against `roleVersion`, not `permVersion`
