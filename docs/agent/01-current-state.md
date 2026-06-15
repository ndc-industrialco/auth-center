# Auth Center — Current State

Last updated: 2026-06-15 (consumer session registry pass)

## Phase Status (AUTH-CENTER-PHASE-PLAN.md)

| Phase | Name | Status | Exit Criteria Met |
|-------|------|--------|-------------------|
| 1 | Core Completion | **Complete** | ✅ Both auth methods work; claims contract frozen; no auth-core gap |
| 2 | Admin Completion | **Complete** | ✅ Admin can manage all user access without DB edits |
| 3 | Security & Session Hardening | **Complete** | ✅ No unresolved critical security issue; session revocation correct; audit explicit |
| 4 | HR Boundary Readiness | Not started | — |
| 5 | Notification Capability | Not started | — |
| 6 | Standalone Operations | Partial | Health endpoint done; rotation runbook done; full observability/alerting not yet |
| 7 | Consumer App Integration | Not started | — |

## What Exists

### Schema (5 migrations)
- `20260611070802_init_auth_schema` — 10 models
- `20260611072841_add_admin_audit` — AdminAudit
- `20260611074443_add_request_id_to_audits` — requestId correlation field
- `20260611075928_add_admin_action_values` — extended AdminAction enum (credential, session, local login actions)
- `20260615101500_add_consumer_app_sessions` — consumer app active session registry

### API Routes (complete for Phases 1–3)
- Auth: login/local, login/entra, logout, refresh (rate-limited, 30/min/IP), me, permissions, link/entra, unlink/entra, issuer
- Admin (all require ADMIN role): apps, role-grants, permission-grants, credentials (POST=set password, PATCH=enable/disable)
- `GET /api/health` — checks DB latency + Redis liveness; returns 503 if DB down
- Internal consumer session registry:
  - `POST /api/internal/consumer-sessions/register`
  - `POST /api/internal/consumer-sessions/heartbeat`
  - `POST /api/internal/consumer-sessions/revoke`
  - authenticated by consumer app id + secret

### Services (complete)
- `credentialService` — admin password set/reset, enable/disable local login, proper AdminAudit records
- `sessionService` — `revokeAllForUser()` added; Redis TTL now uses remaining session TTL
- `consumerAppSessionService` — centralized visibility layer for consumer-app-owned sessions
- All services stabilized from stabilization pass

### Admin UI (complete — all Phase 2 workflows)
- `/admin/users` — full-text search (employeeId/name/email), Manage → drilldown
- `/admin/users/[userId]` — identity management hub:
  - Entra link/unlink with confirm dialog
  - Local login enable/disable with confirm dialog
  - Admin password set/reset modal
  - Active sessions list: per-session + Revoke All with confirm
  - Last 10 login audit records inline
- `/admin/consumer-sessions` â€” consumer-app-reported active/historical session visibility with app/status/search filters
- All admin pages have `loading.tsx` Suspense skeletons
- `/auth/error` — Auth.js error codes with human messages
- `/auth/unauthorized` — ADMIN role required page

### Docs
- `docs/domains/auth/claims-contract.md` — JWT v1.0 frozen; breaking-change policy
- `docs/risks/risk-register.md` — 16 risks; 2 open pre-production items
- `docs/ops/secret-rotation-runbook.md` — AUTH_SECRET, Entra, DB, Redis rotation steps
- `docs/domains/auth/consumer-integration.md` — consumer-app onboarding + roleVersion guidance

## Open Items (R-15, R-16 from risk register)

1. Full observability/alerting baseline — Phases 6 scope
2. Rate limiting on additional auth endpoints (beyond login + refresh) — Phase 6 scope

## Next Phases
- Phase 4: HR Boundary Readiness — employee master ownership, sync model, inactive-employee handling
- Phase 5: Notification Capability — `canSendDelegatedMail` enforcement, delegated vs local mail routing
- Phase 6: Standalone Operations — alerting, backup story, incident response, deployment separation
