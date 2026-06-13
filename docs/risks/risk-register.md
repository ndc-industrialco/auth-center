# Auth Center — Risk Register

Last updated: 2026-06-11  
Status: Active — review at each phase release.

---

## Risk Matrix

| ID | Area | Risk | Likelihood | Impact | Mitigation | Status |
|----|------|------|-----------|--------|-----------|--------|
| R-01 | Identity | Two employees mapped to the same Entra objectId | Low | Critical | `ExternalIdentityLink.entraObjectId @unique` DB constraint; concurrent sign-in handled with retry | Mitigated |
| R-02 | Identity | Wrong Entra-to-employee mapping (email collision) | Medium | High | Email fallback only when no existing link; admin link/unlink audit trail; `ENTRA_LINKED` event in AdminAudit | Partially mitigated — manual verification recommended for email-based auto-link |
| R-03 | Token | Stale `appRoles` in token after grant revocation | High | Medium | `permVersion` claim; consuming apps must cache and detect change; refresh endpoint available | Accepted — token TTL is 1 hour maximum exposure |
| R-04 | Session | Redis revocation down — revoked session used briefly | Medium | Medium | DB is authoritative; isSessionValid() always falls back to DB; Redis failure only creates a brief window | Accepted — fail-open is explicit by design |
| R-05 | Session | Session fixation via refresh with known sessionId | Low | High | Refresh requires knowledge of sessionId only (no token required); sessionId is a UUID generated server-side; not exposed in URLs | Accepted — mitigated by UUID entropy and httpOnly cookie storage |
| R-06 | Credential | Brute-force on LOCAL accounts | High | Medium | Rate limit (10/5min per employeeId) + account lockout (5 failures, 15 min) | Mitigated |
| R-07 | Credential | Attacker triggers account lockout on legitimate users | Medium | Medium | Lockout is 15 minutes, not permanent; admin can see LoginAudit; no permanent account disable | Accepted — DoS risk acknowledged |
| R-08 | Authorization | Admin UI accessible to non-admin authenticated users | — | Critical | **Fixed** — `requireAdminPage()` checks ADMIN RoleGrant before rendering any admin page | Resolved (2026-06-11) |
| R-09 | Authorization | Over-centralization of app-specific authorization | Medium | Medium | Design intent: Auth Center owns coarse grants; apps own record/workflow checks | Accepted by design |
| R-10 | Key | AUTH_SECRET rotation disrupts all active sessions | Medium | High | All sessions become invalid on rotation; plan rotation for low-traffic window; document process in `rules/secrets-key-rotation.md` | Unmitigated — rotation procedure not yet written |
| R-11 | Integration | Entra objectId not available in OIDC profile | Medium | High | Graph API fallback fetches `onPremisesSamAccountName`; UPN prefix used as last resort | Mitigated — three-level fallback |
| R-12 | Integration | Graph API unavailable at sign-in time | Medium | Medium | `fetchGraphMe()` returns null; sign-in falls back to UPN prefix; employeeId matching may fail for new users | Accepted — documented in code |
| R-13 | Audit | No requestId in Entra callback audit records | High | Low | Auth.js callback doesn't surface request headers; `ipAddress: 'entra-callback'` placeholder used | Accepted — requestId added to schema; Entra path cannot easily provide it |
| R-14 | Compliance | LoginAudit and AdminAudit contain no PII beyond employeeId and IP | Low | Low | No passwords, tokens, or sensitive payload logged; audit records are append-only | Mitigated |
| R-15 | Deployment | No health check endpoint | Medium | Medium | No `/api/health` or `/api/ready` endpoint; load balancers cannot verify service state | Open — see Phase 5+ work |
| R-16 | Deployment | No rate limiting on non-login endpoints | Medium | Low | Only `POST /api/auth/login/local` has rate limiting; other endpoints rely on infrastructure-level controls | Open |

---

## Open Items (require action before production)

| ID | Action | Owner | Target |
|----|--------|-------|--------|
| R-10 | Write `AUTH_SECRET` rotation runbook | TBD | Before production |
| R-15 | Implement `GET /api/health` endpoint | TBD | Before production |
| R-16 | Add rate limiting to token refresh endpoint | TBD | Before production |

---

## Accepted Risks (no further action required at this phase)

R-03, R-04, R-05, R-07, R-09, R-12, R-13, R-16 (at current phase)
