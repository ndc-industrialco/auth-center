# Auth Center — Database Map

PostgreSQL, managed via Prisma 7 with `@prisma/adapter-pg`.

## Tables

| Table | Model | Purpose |
|-------|-------|---------|
| `users` | User | Canonical identity record, keyed by `employeeId` |
| `employee_profiles` | EmployeeProfile | HR display data (1:1 with User) |
| `identity_accounts` | IdentityAccount | Sign-in channel per user (ENTRA or LOCAL) |
| `external_identity_links` | ExternalIdentityLink | Entra objectId ↔ User mapping |
| `local_credentials` | LocalCredential | bcrypt password hash for LOCAL users |
| `app_registrations` | AppRegistration | Registered consumer apps |
| `role_grants` | RoleGrant | Per-(userId, appId, role) grant |
| `permission_grants` | PermissionGrant | Per-(userId, appId, permission) grant |
| `user_sessions` | UserSession | Active/revoked session records |
| `login_audits` | LoginAudit | Immutable login attempt log |
| `admin_audits` | AdminAudit | Immutable admin action log |

## Migrations

| Migration | Description |
|-----------|-------------|
| `20260611070802_init_auth_schema` | Initial schema — all tables except AdminAudit |
| `20260611072841_add_admin_audit` | Added `AdminAudit` table and `AdminAction` enum |

## Key Constraints

- `User.employeeId` — `@unique` (one canonical identity per employee)
- `ExternalIdentityLink.entraObjectId` — `@unique` (one Entra identity per User)
- `IdentityAccount` — `@@unique([userId, type])` (one ENTRA + one LOCAL per user)
- `RoleGrant` — `@@unique([userId, appId, role])` (no duplicate grants)
- `PermissionGrant` — `@@unique([userId, appId, permission])`
- `UserSession.sessionId` — `@unique` (maps to JWT `sessionId` claim)
- Both audit tables are append-only — no update/delete methods in repositories
