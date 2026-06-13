# Auth Domain — API Reference

All endpoints return `{ success: boolean, message: string, data?: T }`.
Error responses include `{ success: false, error: { message, code, details? } }`.

## Auth Endpoints

### POST /api/auth/login/local
Login with employeeId + password.

**Request body**: `{ employeeId: string, password: string, appId?: string }`
**Query**: `?appId=qms`
**Response**: `{ accessToken, expiresAt, sessionId }`
**Auth required**: No

### POST /api/auth/logout
Revoke the current session.

**Headers**: `Authorization: Bearer <token>`
**Request body**: `{ sessionId: string }`
**Auth required**: Yes (Bearer token)

### POST /api/auth/refresh
Issue a new access token for an active session.

**Request body**: `{ sessionId: string, appId?: string }`
**Response**: `{ accessToken, expiresAt, sessionId }`
**Auth required**: No (sessionId is the credential)

### GET /api/auth/me
Get the current user's profile and effective roles/permissions.

**Headers**: `Authorization: Bearer <token>`
**Query**: `?appId=qms`
**Response**: `{ id, employeeId, displayName, m365Linked, roles[], permissions[] }`
**Auth required**: Yes (Bearer token)

### GET /api/auth/permissions
Get effective roles and permissions for current session.

**Headers**: `Authorization: Bearer <token>`
**Query**: `?appId=qms`
**Response**: `{ roles[], permissions[], permVersion }`
**Auth required**: Yes (Bearer token)

### POST /api/auth/link/entra
Link a Microsoft Entra identity to the current user.

**Headers**: `Authorization: Bearer <token>`
**Request body**: `{ entraObjectId: string, entraUpn?: string }`
**Auth required**: Yes (Bearer token)

### POST /api/auth/unlink/entra
Remove the Entra identity link from the current user.

**Headers**: `Authorization: Bearer <token>`
**Auth required**: Yes (Bearer token)

## Admin Endpoints

> These endpoints currently have no auth guard. A ADMIN role check must be added before production use.

### GET /api/auth/admin/apps
List all registered apps.

### POST /api/auth/admin/apps
Register a new consumer app.
**Request body**: `{ appId: string, displayName: string, description?: string }`

### POST /api/auth/admin/role-grants
Grant a role to a user for an app.
**Request body**: `{ userId, appId, role, expiresAt? }`

### DELETE /api/auth/admin/role-grants
Revoke a role grant.
**Request body**: `{ grantId: string }`

### POST /api/auth/admin/permission-grants
Grant a permission to a user for an app.
**Request body**: `{ userId, appId, permission, expiresAt? }`

### DELETE /api/auth/admin/permission-grants
Revoke a permission grant.
**Request body**: `{ grantId: string }`
