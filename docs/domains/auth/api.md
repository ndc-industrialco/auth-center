# Auth Domain API Reference

All endpoints return `{ success: boolean, message: string, data?: T }`.
Error responses include `{ success: false, error: { message, code, details? } }`.

## Auth Endpoints

### POST /api/auth/login/local

Request body:

`{ employeeId: string, password: string, appId?: string }`

Response:

`{ accessToken, expiresAt, sessionId }`

### POST /api/auth/logout

Headers:

`Authorization: Bearer <token>`

Request body:

`{ sessionId: string }`

### POST /api/auth/refresh

Request body:

`{ sessionId: string, appId?: string }`

Response:

`{ accessToken, expiresAt, sessionId }`

### GET /api/auth/me

Headers:

`Authorization: Bearer <token>`

Query:

`?appId=qms`

Response:

`{ id, employeeId, displayName, m365Linked, roles[] }`

### GET /api/auth/issuer

Issuer metadata for consuming apps.

## Admin Endpoints

These are protected admin surfaces.

### GET /api/auth/admin/apps

List registered apps.

### POST /api/auth/admin/apps

Register a new consumer app.

Request body:

`{ appId: string, displayName: string, description?: string }`

### POST /api/auth/admin/role-grants

Grant a role to a user for an app.

Request body:

`{ userId, appId, role, expiresAt? }`

### DELETE /api/auth/admin/role-grants

Revoke a role grant.

Request body:

`{ grantId: string }`
