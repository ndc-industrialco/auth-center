# Why Auth Center Must Come Before Application Sprints

This document explains why building a centralized Auth Center before implementing business applications (such as QMS, HR, or CAR) saves significant effort in the long run.

## Short Answer

Without a shared auth foundation, each application accumulates the same problems independently:

- Inconsistent login methods across systems
- Roles and permissions scattered across multiple databases
- User profiles that diverge between systems
- Microsoft 365 and Graph integration duplicated in every app

---

## Benefits of Building Auth Center First

### 1. Single Source of Truth for User Identity

All identity data is centralized:

- Employee ID
- Microsoft 365 / Entra link
- Authentication method
- Department
- Email group memberships
- Per-application role grants

Every application reads from the same record. Profile changes propagate to all apps through token claims.

### 2. One Login Standard

Two supported methods, both handled centrally:

- **Microsoft Entra ID / M365** — SSO via OAuth 2.0 / OIDC
- **Employee ID + Password** — local credential, bcrypt-hashed

No application needs to implement its own login logic.

### 3. Centralized Role Model

Design principles:

- Roles are stored in Auth Center, not in individual apps
- One user has at most one active role per application
- Each app reads its own roles from the JWT claim `appRoles`
- Role changes take effect on the next session refresh

This eliminates role-duplication bugs and conflicting grant states across systems.

### 4. Microsoft Graph Integration Isolated in One Place

If every business app integrates directly with Microsoft Graph:

- Service account permissions become fragmented
- Configuration is repeated and diverges
- Debugging Graph-related failures is difficult

Auth Center is the only service that holds Graph credentials. Business apps request data through Auth Center or receive it via token claims.

### 5. Easier Onboarding for Future Applications

Once Auth Center is running:

- New apps register, define roles, and redirect to Auth Center for login — no auth code to write
- Legacy apps can migrate one at a time without breaking others
- Each app team focuses on its domain logic, not authentication plumbing

---

## Accepted Trade-offs

- Setup time is front-loaded before any business feature work
- Role and app contracts must be defined explicitly before development
- All teams need to understand the token and session model

---

## Conclusion

Building Auth Center before application sprints is not extra overhead — it is the shared infrastructure that prevents repeated authentication refactoring across every system that follows.
