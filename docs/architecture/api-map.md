# Auth Center — API Map

All routes are under `/api/auth/`. All responses follow `{ success, message, data?, meta?, error? }`.

## Public Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login/local` | None | Local employeeId + password login |
| GET | `/api/auth/login/entra` | Auth.js session | Exchange Entra session for Auth Center JWT |
| POST | `/api/auth/logout` | Bearer JWT | Revoke session |
| POST | `/api/auth/refresh` | None (sessionId) | Refresh access token |
| GET | `/api/auth/me` | Bearer JWT | Current user profile + roles |
| GET | `/api/auth/permissions` | Bearer JWT | Effective roles and permissions |
| POST | `/api/auth/link/entra` | Bearer JWT | Link Entra identity to user |
| POST | `/api/auth/unlink/entra` | Bearer JWT | Unlink Entra identity |
| GET | `/api/auth/issuer` | None | Issuer metadata for consuming apps |
| GET/POST | `/api/auth/[...nextauth]` | N/A | Auth.js v5 Entra OAuth handler |

## Admin Endpoints (ADMIN role required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/admin/apps` | List registered apps |
| POST | `/api/auth/admin/apps` | Register a new consumer app |
| POST | `/api/auth/admin/role-grants` | Grant a role to a user |
| DELETE | `/api/auth/admin/role-grants` | Revoke a role grant |
| POST | `/api/auth/admin/permission-grants` | Grant a permission to a user |
| DELETE | `/api/auth/admin/permission-grants` | Revoke a permission grant |

## Token Contract

JWT HS256. Claims: `sub`, `userId`, `employeeId`, `authMethod`, `m365Linked`, `canSendDelegatedMail`, `departmentId`, `appRoles`, `permVersion`, `sessionId`, `iss`, `aud`, `iat`, `exp`. TTL: 3600s.
