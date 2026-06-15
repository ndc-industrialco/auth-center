# Auth Center Consumer Integration

Primary consumer-app integration documents:

- [AUTH-CENTER-INTEGRATION-MANUAL.md](/d:/NDC_042/NextJS/Auth-Center/AUTH-CENTER-INTEGRATION-MANUAL.md)
- [manual/01-step-by-step-connect-auth-center.md](/d:/NDC_042/NextJS/Auth-Center/manual/01-step-by-step-connect-auth-center.md)

Short summary:

- consumer app redirects the user to `Auth Center`
- `Auth Center` authenticates the user
- `Auth Center` issues an app-scoped JWT
- consumer app verifies the token with `JWKS`
- consumer app enforces authorization using `appRoles`
- consumer app can track token freshness using `roleVersion`

Important:

- production should not use shared-secret verification as the main integration model
- the private signing key stays only in `Auth Center`
- consumer apps use public keys from the `JWKS` endpoint
