# Auth Center — Manual

This manual covers Auth Center for both system administrators and consumer application developers.

## Reading Order

1. [01-step-by-step-connect-auth-center.md](./01-step-by-step-connect-auth-center.md) — How to integrate a new app
2. [02-why-auth-center-before-app-sprint.md](./02-why-auth-center-before-car-sprint.md) — Why centralized auth first
3. [03-m365-manual-sync-push-spec.md](./03-m365-manual-sync-push-spec.md) — Microsoft 365 sync & push
4. [04-role-session-troubleshooting.md](./04-role-session-troubleshooting.md) — Debugging role and session issues

## What This Manual Covers

- What Auth Center is and why it exists as a separate service
- Step-by-step integration for a new consumer application
- How consumer apps should verify tokens and enforce roles
- When Microsoft Graph access is permitted and when it is not
- How to sync users, departments, and email groups with Microsoft 365
- How to debug access-denied issues caused by stale tokens or incorrect role grants

## Related Documents

- System overview: [AUTH-CENTER-SUMMARY.md](../AUTH-CENTER-SUMMARY.md)
- Full integration reference: [AUTH-CENTER-INTEGRATION-MANUAL.md](../AUTH-CENTER-INTEGRATION-MANUAL.md)
- Pre-production checklist: [DEPLOY-CHECKLIST.md](../DEPLOY-CHECKLIST.md)
- JWT claims contract: [docs/domains/auth/claims-contract.md](../docs/domains/auth/claims-contract.md)
