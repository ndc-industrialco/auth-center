# Auth Domain - Database

## Enums

| Enum | Values |
|------|--------|
| `IdentityType` | `ENTRA`, `LOCAL` |
| `EmploymentStatus` | `ACTIVE`, `INACTIVE`, `SUSPENDED`, `TERMINATED` |
| `AuthMethod` | `ENTRA`, `LOCAL_PASSWORD`, `LOCAL_OTP` |
| `SessionStatus` | `ACTIVE`, `REVOKED`, `EXPIRED` |
| `LoginOutcome` | `SUCCESS`, `FAILED_CREDENTIALS`, `FAILED_RATE_LIMIT`, `FAILED_ACCOUNT_LOCKED`, `FAILED_NOT_FOUND`, `FAILED_ENTRA_ERROR` |
| `DirectorySyncEntityType` | `USER`, `DEPARTMENT`, `GROUP`, `GROUP_MEMBERS` |
| `DirectorySyncDirection` | `PULL`, `PUSH` |
| `DirectorySyncStatus` | `SUCCESS`, `FAILED`, `PARTIAL` |

## Models

### User
Canonical identity. One record per employee.
- `employeeId` `@unique` enforces one-employee-one-identity at DB level
- `email` `@unique` is used for Entra email-based user matching
- `m365Linked`, `canSendDelegatedMail` are computed from Entra link state

### EmployeeProfile
HR display data linked 1:1 to User. `departmentId` is indexed for team-scoped queries.

### Department
Normalized department catalog used by employee profiles. `source`, `userCount`, and `syncedAt` support directory sync reporting.

### IdentityAccount
Sign-in channel record. `@@unique([userId, type])` allows at most one ENTRA and one LOCAL account per user.

### ExternalIdentityLink
Maps `entraObjectId` `@unique` to a User. Prevents two users from sharing the same Entra identity.

### LocalCredential
Hashed password for LOCAL users only. Tracks `failedAttempts` and `lockedUntil` for brute-force protection. Never populated for ENTRA-only users.

### AppRegistration
Registry of consumer apps. `appId` is a short stable slug such as `"qms"` or `"hr-center"`.

### RoleGrant
Per-`(userId, appId, role)` grant. `@@unique` prevents duplicate grants. Supports soft expiry via `expiresAt`.

### PermissionGrant
Per-`(userId, appId, permission)` grant. Same structure as `RoleGrant`.

### EmailGroup
Cached Microsoft 365 group metadata. Stores mail/group identity and latest sync timestamp.

### EmailGroupMember
Cached membership rows for M365 groups. `userId` is nullable because some members may not exist as local Auth Center users.

### UserSession
Active and historical sessions. `sessionId` is embedded in the JWT `sessionId` claim. Revocation sets `status = REVOKED`.

### LoginAudit
Append-only record of every login attempt, successful or failed.

### DefaultRolePolicy
Rule template for auto-granting app roles to matching users by auth type and optional department.

### AdminAudit
Append-only admin action log for security-sensitive mutations such as grants, revocations, user management, and directory actions.

### DirectorySyncLog
Append-only operational log for manual directory pull/push actions.
- `entityType` identifies the sync target such as `USER` or `GROUP_MEMBERS`
- `direction` distinguishes `PULL` from `PUSH`
- `status` captures `SUCCESS`, `FAILED`, or `PARTIAL`
- `summaryJson` stores structured result details for preview/summary use cases
- `errorMessage` stores top-level failure information when applicable

## Migration Notes

- Run `npx prisma migrate dev --name add_directory_sync_log` after reviewing the new model
- `DirectorySyncLog` is intentionally standalone for low-friction operational logging and does not require foreign keys to specific resource tables
- Existing login and admin audit tables remain append-only and should not be repurposed for directory sync job history
