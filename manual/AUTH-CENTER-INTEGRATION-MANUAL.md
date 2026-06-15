# Auth Center Integration Manual

This is the canonical integration entrypoint for teams connecting a consumer app to `Auth Center`.

## Current Supported Integration Model

Current supported model:

- Consumer app redirects the user to `Auth Center`
- `Auth Center` authenticates the user
- `Auth Center` issues an app-scoped JWT
- `Auth Center` redirects back to the consumer app with the token
- Consumer app verifies the token locally
- Consumer app creates and manages its own session

This is currently a token-redirect handoff.

Longer-term preferred direction:

- authorization-code style exchange

That is not the primary documented integration path today.

## What Consumer Apps Must Trust

Consumer apps must trust these things from `Auth Center`:

- user identity
- application-scoped role claims in `appRoles`
- session identity in `sessionId`
- token freshness marker in `roleVersion`

Consumer apps must still own:

- business logic
- business-resource authorization
- page guards
- API guards
- local business data

## Token Verification Model

Production model:

- `Auth Center` signs JWTs with `RS256`
- consuming apps verify tokens using `JWKS`
- consuming apps must validate both `issuer` and `audience`

Development fallback:

- non-production environments may use `HS256` with `AUTH_SECRET`
- this is a local/dev fallback only
- do not use shared-secret verification as the recommended production pattern

## Current Claim Names That Consumer Apps Should Use

Current JWT claims used by consuming apps:

- `sub`
- `userId`
- `employeeId`
- `authMethod`
- `m365Linked`
- `canSendDelegatedMail`
- `departmentId`
- `appRoles`
- `roleVersion`
- `sessionId`
- `iss`
- `aud`
- `iat`
- `exp`

Important:

- the current implementation uses `roleVersion`
- do not build new consumer apps against `permVersion`

## Required Consumer App Environment Variables

```env
AUTH_MODE=auth_center

AUTH_CENTER_URL=http://localhost:3001
AUTH_CENTER_ISSUER=auth-center
AUTH_CENTER_AUDIENCE=your-app-id
AUTH_CENTER_JWKS_URL=http://localhost:3001/.well-known/jwks.json

AUTH_CENTER_CLIENT_ID=your-app-id
AUTH_CENTER_CLIENT_SECRET=replace-with-secret
AUTH_CENTER_REDIRECT_URI=http://localhost:3002/api/auth/callback
```

Notes:

- `AUTH_CENTER_AUDIENCE` must exactly match the `appId` registered in `Auth Center`
- `AUTH_CENTER_ISSUER` must match the token `iss` claim, which is currently `auth-center`
- `AUTH_CENTER_JWKS_URL` should point to the public JWKS endpoint of `Auth Center`

## Recommended Reading Order

1. [manual/01-step-by-step-connect-auth-center.md](./manual/01-step-by-step-connect-auth-center.md)
2. [docs/domains/auth/claims-contract.md](./docs/domains/auth/claims-contract.md)
3. [manual/04-ปัญหาที่พบบ่อย.md](./manual/04-ปัญหาที่พบบ่อย.md)
4. [DEPLOY-CHECKLIST.md](./DEPLOY-CHECKLIST.md)

## Fast Onboarding Checklist

- Register the consumer app in `Auth Center`
- Define the role names for that app
- Grant at least one test user a role
- Implement redirect to `Auth Center`
- Implement callback handling
- Verify JWT locally using `JWKS`
- Enforce roles from `appRoles`
- Test stale-role behavior by signing out and signing back in after a role change

## Important Warnings

- Do not share `AUTH_SECRET` between systems as the standard production model
- Do not treat hidden UI as authorization
- Do not assume role changes update old browser tokens automatically
- Do not call delegated Microsoft Graph for LOCAL sessions

## Related Documents

- [manual/README.md](./manual/README.md)
- [docs/domains/auth/consumer-integration.md](./docs/domains/auth/consumer-integration.md)
- [docs/domains/auth/claims-contract.md](./docs/domains/auth/claims-contract.md)
