# Auth Center Secret Rotation Runbook

Last updated: 2026-06-15

## Secrets Inventory

| Secret | Env Var | Scope | Rotation Impact |
|--------|---------|-------|-----------------|
| Production JWT keypair | `AUTH_PRIVATE_KEY`, `AUTH_PUBLIC_KEY`, `AUTH_KEY_ID` | Auth Center only | New tokens are signed by the new keypair |
| Fallback JWT secret | `AUTH_SECRET` | Auth Center only in non-production fallback mode | Existing fallback-mode tokens become invalid |
| Entra client secret | `AZURE_AD_CLIENT_SECRET` | Auth Center only | Entra sign-in breaks until updated |
| Database password | `DATABASE_URL` | Auth Center only | Service down until updated |
| Redis password | `REDIS_URL` | Auth Center only | Revocation fast path degrades gracefully |

## Production JWT Key Rotation

Pre-rotation checklist:

- Schedule during low-traffic window
- Notify consuming app owners
- Verify `GET /api/health` is healthy
- Prepare rollback

Rotation steps:

1. Generate a new RSA keypair
2. Update `AUTH_PRIVATE_KEY`, `AUTH_PUBLIC_KEY`, and `AUTH_KEY_ID`
3. Deploy Auth Center
4. Confirm the JWKS endpoint exposes the new key
5. Confirm login still works
6. Confirm consuming apps still verify tokens

Rollback:

- restore the previous keypair and redeploy

## AUTH_SECRET Rotation

Use this only if the environment still runs in symmetric fallback mode.

Steps:

1. Generate a new secret
2. Update `AUTH_SECRET`
3. Redeploy the environment
4. Re-login active users in that environment

## Other Rotations

### AZURE_AD_CLIENT_SECRET

- rotate in Azure Portal
- update env
- redeploy
- verify Entra sign-in

### DATABASE_URL

- rotate DB credentials
- update env
- redeploy
- verify health

### REDIS_URL

- rotate Redis credentials
- update env
- redeploy
- verify health
