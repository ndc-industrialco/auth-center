# Auth Center API Map

All routes are under `/api/auth/`.
All responses follow `{ success, message, data?, meta?, error? }`.

## Public Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login/local` | None | Local employeeId + password login |
| GET | `/api/auth/login/entra` | Auth.js session | Exchange Entra session for Auth Center JWT |
| POST | `/api/auth/logout` | Bearer JWT | Revoke session |
| POST | `/api/auth/refresh` | None (sessionId) | Refresh access token |
| GET | `/api/auth/me` | Bearer JWT | Current user profile + roles |
| GET | `/api/auth/issuer` | None | Issuer metadata for consuming apps |
| GET/POST | `/api/auth/[...nextauth]` | N/A | Auth.js v5 Entra OAuth handler |

## Admin Endpoints

These are protected admin surfaces.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/admin/apps` | List registered apps |
| POST | `/api/auth/admin/apps` | Register a new consumer app |
| POST | `/api/auth/admin/role-grants` | Grant a role to a user |
| DELETE | `/api/auth/admin/role-grants` | Revoke a role grant |
| POST | `/api/auth/admin/permission-grants` | Grant a permission to a user |
| DELETE | `/api/auth/admin/permission-grants` | Revoke a permission grant |

## Consumer Mail Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/consumer/mail/search` | App-scoped Bearer JWT | Search the authenticated Entra-linked user's mailbox by allowlisted folder, sender, keyword, and received-date range; Auth Center fetches Microsoft Graph data and does not persist CRM mail |

## Token Contract Summary

- Claims: `sub`, `userId`, `employeeId`, `authMethod`, `m365Linked`, `canSendDelegatedMail`, `departmentId`, `appRoles`, `roleVersion`, `sessionId`, `iss`, `aud`, `iat`, `exp`
- Production signing: `RS256`
- Non-production fallback: `HS256`
- TTL: `28800` seconds
