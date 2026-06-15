# Auth Center Manual

This manual is for both:

- Auth Center administrators
- consumer application developers

## Reading Order

1. [01-step-by-step-connect-auth-center.md](./01-step-by-step-connect-auth-center.md)
2. [02-why-auth-center-before-car-sprint.md](./02-why-auth-center-before-car-sprint.md)
3. [03-m365-manual-sync-push-spec.md](./03-m365-manual-sync-push-spec.md)
4. [04-ปัญหาที่พบบ่อย.md](./04-ปัญหาที่พบบ่อย.md)

## What This Manual Covers

- What Auth Center owns
- How a new consumer app connects to Auth Center
- How consuming apps should verify JWTs
- How to enforce `appRoles`
- When delegated Microsoft Graph is allowed
- How manual M365 sync works
- How to troubleshoot stale role/session issues

## Current Integration Rules

- Production integrations should verify tokens with `JWKS`
- Consumer apps should trust `appRoles` from the token
- Current role freshness marker claim is `roleVersion`
- Users must refresh or sign in again after role changes to receive a new token

## Related Documents

- [AUTH-CENTER-INTEGRATION-MANUAL.md](../AUTH-CENTER-INTEGRATION-MANUAL.md)
- [AUTH-CENTER-SUMMARY.md](../AUTH-CENTER-SUMMARY.md)
- [DEPLOY-CHECKLIST.md](../DEPLOY-CHECKLIST.md)
- [docs/domains/auth/claims-contract.md](../docs/domains/auth/claims-contract.md)
