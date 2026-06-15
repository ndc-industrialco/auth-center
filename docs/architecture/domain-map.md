# Auth Center — Domain Map

## Domains

Auth Center has one domain: **auth**

## Auth Domain Boundary

### Owns
- Employee identity records
- Entra ID ↔ employee linking
- Local credential storage (hashed only)
- Session lifecycle
- Role and permission grants (centralized)
- JWT access token issuance
- Login audit log

### Does NOT Own
- Record ownership within consuming apps
- Workflow-state authorization in consuming apps
- Department/resource scoping in consuming apps
- Business logic specific to QMS, HR Center, etc.

## Entity Map

```
User (canonical identity, keyed by employeeId)
  └── EmployeeProfile (HR display data)
  └── IdentityAccount (ENTRA | LOCAL channel)
  └── ExternalIdentityLink (Entra objectId → User)
  └── LocalCredential (bcrypt hash, lockout state)
  └── RoleGrant[] (per-app role assignments)
  └── PermissionGrant[] (per-app permission assignments)
  └── UserSession[] (active/revoked sessions)
  └── ConsumerAppSession[] (consumer-app reported sessions)
  └── LoginAudit[] (immutable audit records)

AppRegistration (registered consumer apps)
  └── RoleGrant[] (grants issued for this app)
  └── PermissionGrant[] (grants issued for this app)
  └── ConsumerAppSession[] (active sessions reported by this app)
```

## Service Boundaries

| Service | Responsibility |
|---------|---------------|
| `localAuthService` | Local login, bcrypt verify, lockout, audit |
| `entraAuthService` | Entra callback, account linking/unlinking |
| `sessionService` | Create/revoke/validate sessions |
| `tokenService` | Issue and verify Auth Center JWTs |
| `permissionService` | Resolve effective roles and compute roleVersion |
| `appRegistrationService` | Manage app registry, role/permission grants (admin) |
| `authService` | Top-level orchestrator, public API surface |

## API Surface

See `docs/domains/auth/api.md` for full API documentation.
