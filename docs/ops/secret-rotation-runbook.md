# Auth Center — Secret Rotation Runbook

Last updated: 2026-06-11

---

## Secrets Inventory

| Secret | Env Var | Scope | Rotation Impact |
|--------|---------|-------|-----------------|
| JWT signing key | `AUTH_SECRET` | Auth Center + all consuming apps | All active tokens invalidated; all sessions end |
| Entra client secret | `AZURE_AD_CLIENT_SECRET` | Auth Center only | Entra sign-in breaks until updated |
| Database password | `DATABASE_URL` | Auth Center only | Service down until updated |
| Redis password | `REDIS_URL` | Auth Center only | Redis fail-open; service degrades gracefully |
| App secrets | `AUTH_CENTER_SECRET` (consumer apps) | Must match `AUTH_SECRET` | Same as AUTH_SECRET rotation |

---

## AUTH_SECRET Rotation (High Impact)

**Impact:** All existing JWT access tokens and Auth.js sessions are immediately invalidated. All users must re-authenticate.

**Pre-rotation checklist:**
- [ ] Schedule during low-traffic window (e.g. 22:00–02:00 weekday)
- [ ] Notify app owners of consuming apps (QMS, HR Center, etc.)
- [ ] Verify `GET /api/health` is green before starting
- [ ] Ensure rollback procedure is ready

**Rotation steps:**

1. Generate a new secret:
   ```bash
   openssl rand -base64 32
   ```

2. Update `AUTH_SECRET` in the deployment secrets manager (do NOT commit to git).

3. Update `AUTH_CENTER_SECRET` in every consuming app's deployment secrets with the same value.

4. Deploy Auth Center with the new secret. All new tokens will be signed with the new key.

5. All existing tokens become invalid immediately. Users will see auth errors and must re-login.

6. Monitor `GET /api/health` and login error rates for 15 minutes post-deployment.

**Rollback:** Restore the previous `AUTH_SECRET` value and redeploy. Users who logged in with the new key will be re-invalidated.

**Post-rotation:**
- [ ] Confirm login works for both Entra and local users
- [ ] Confirm consuming apps can verify new tokens
- [ ] Update `AUTH_CENTER_SECRET` documentation in affected apps

---

## AZURE_AD_CLIENT_SECRET Rotation (Medium Impact)

**Impact:** Entra sign-in breaks until the new secret is deployed. Local login is unaffected.

**Rotation steps:**

1. In Azure Portal → App Registrations → Your App → Certificates & Secrets → New client secret.
2. Copy the new secret value immediately (only shown once).
3. Update `AZURE_AD_CLIENT_SECRET` in deployment secrets.
4. Deploy Auth Center. Zero downtime for local login; Entra login restored within seconds.
5. Delete the old secret in Azure Portal after confirming Entra sign-in works.

---

## DATABASE_URL Rotation

**Impact:** Service down until updated.

**Steps:** Update credentials in PostgreSQL, update `DATABASE_URL`, redeploy, verify `GET /api/health`.

---

## REDIS_URL Rotation

**Impact:** Graceful degradation only (Auth Center fails open on Redis errors). Session revocation fast-path temporarily unavailable; DB remains authoritative.

**Steps:** Update Redis credentials, update `REDIS_URL`, redeploy. No user-visible disruption expected.

---

## Rotation Schedule Recommendation

| Secret | Rotation Frequency |
|--------|-------------------|
| `AUTH_SECRET` | Every 6–12 months, or immediately on suspected compromise |
| `AZURE_AD_CLIENT_SECRET` | Per Azure expiry policy (max 2 years) |
| `DATABASE_URL` | Per security policy (annually recommended) |
| `REDIS_URL` | Per security policy |

---

## Emergency Rotation (Suspected Compromise)

If any secret is suspected compromised:

1. **AUTH_SECRET compromised:** Rotate immediately. All sessions invalidated. Audit `LoginAudit` for unexpected access patterns.
2. **AZURE_AD_CLIENT_SECRET compromised:** Rotate in Azure Portal immediately. Monitor Entra sign-in audit logs.
3. **DATABASE_URL compromised:** Rotate immediately. Audit DB access logs for unauthorized queries.

Contact: NDC IT Security team. Log incident in the incident response system.
