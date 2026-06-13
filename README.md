# Auth Center

Central authentication and role-management service for NDC internal applications.

## Purpose

`Auth Center` is responsible for:

- sign in with `Microsoft Entra ID / M365`
- sign in with `Employee ID + Password`
- issue app-scoped JWT access tokens
- manage centralized app roles
- manage sessions and revocation
- sync directory data from Microsoft Graph

## Current Documents

- Project summary: [AUTH-CENTER-SUMMARY.md]
- Production readiness: [DEPLOY-CHECKLIST.md]
- Consumer app manual: [AUTH-CENTER-INTEGRATION-MANUAL.md]
- Manual folder: [manual/README.md]
- Step-by-step app onboarding: [manual/01-step-by-step-connect-auth-center.md]
- Why Auth Center before business sprint: [manual/02-why-auth-center-before-car-sprint.md]
- M365 manual sync/push spec: [manual/03-m365-manual-sync-push-spec.md]
- Role/session troubleshooting: [manual/04-role-session-troubleshooting.md]
- Consumer integration notes: [docs/domains/auth/consumer-integration.md]
- Claims contract: [docs/domains/auth/claims-contract.md]
## Local Development

Run on `http://localhost:3001`.

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm test
npm run lint
npm run build
npm run keys:generate
npm run seed:admin
npm run seed:admin:reset-password
```

## Minimum Environment Variables

```env
DATABASE_URL=
DIRECT_URL=

NODE_ENV=development
AUTH_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3001
AUTH_TRUST_HOST=true
AUTH_SECRET=

REDIS_URL=redis://localhost:6379

AZURE_AD_TENANT_ID=
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
```

For production signing, also configure:

```env
AUTH_PRIVATE_KEY=
AUTH_PUBLIC_KEY=
AUTH_KEY_ID=
```

## Status

Current target state: ready for `development` and `internal integration testing`.

Before production deployment, complete the checklist in [DEPLOY-CHECKLIST.md]
