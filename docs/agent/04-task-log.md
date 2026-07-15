# Task Log

## 2026-06-12 - Manual Folder For Integration And Sprint Rationale

### Delivered
- Added `manual/README.md` as the manual entry point
- Added step-by-step integration guide for all consumer apps
- Added rationale document explaining why Auth Center should come before CAR implementation-heavy sprint work
- Linked the manual folder from `README.md`

### Notes
- This manual set is written for both implementation and stakeholder explanation
- The sprint rationale document is intended to support planning discussions, not only coding tasks

## 2026-06-12 - Consumer Integration Manual

### Delivered
- Added `AUTH-CENTER-INTEGRATION-MANUAL.md` for new app onboarding
- Replaced outdated consumer integration note that still referenced shared `AUTH_SECRET`
- Linked the new manual from `README.md`

### Notes
- Manual reflects the current token-redirect integration flow
- Longer-term production direction remains authorization-code exchange

## 2026-06-12 - Consumer App Redirect Handoff

### Delivered
- Added consumer-app redirect helper with `redirectUri` validation
- Updated `/auth/login` to preserve `redirectUri` and `state`
- Updated local login flow to redirect back to the consumer app with `token` and `state`
- Updated Entra login flow to redirect back to the consumer app with `token` and `state`

### Verification
- `npm test` passed
- `npm run build` passed
- `npm run lint` still has the same 2 React Compiler warnings unrelated to auth handoff

## 2026-06-12 - Deploy Checklist Kickoff

### Delivered
- Added `.env.example` with deploy-safe placeholders
- Added `npm run keys:generate` helper for RSA signing key generation
- Verified `prisma generate`, `prisma migrate deploy`, `npm test`, and `npm run build`
- Verified `/api/health` responds successfully from runtime

### Findings
- Health check reached `ok` with DB and Redis healthy on rerun
- Admin bootstrap already exists in the database with active `ADMIN` grants
- `npm run lint` still reports 2 React Compiler compatibility warnings in form components

## 2026-06-12 - Documentation Refresh For Auth Center Handoff

### Delivered
- Created `AUTH-CENTER-SUMMARY.md` as the main implementation and integration summary
- Replaced scaffold `README.md` with project-specific startup and document links
- Added `DEPLOY-CHECKLIST.md` for production readiness and go-live checks

### Notes
- Documentation now points to the current integration/testing status instead of generic Next.js scaffold content
- Production checklist covers env, DB, Redis, JWKS, Entra/Graph, admin bootstrap, and consumer-app onboarding

## 2026-06-11 - Auth Center Bootstrap

**Phases completed:** 0 (Design), 1 (Schema), 2 (Auth Runtime), 3 (Permission Engine), 4 (Mail Capability), 5 (Consumer Contract)

### Delivered
- Prisma schema: 11 models (including AdminAudit), 2 migrations
- Auth.js v5 Entra sign-in with Graph API employeeId resolution
- Local login (bcrypt, rate limit, account lockout)
- JWT issuance (HS256, jose), session revocation (Redis + DB dual-write)
- Admin APIs with `requireAdmin` guard (ADMIN role check)
- `proxy.ts` (Next.js 16 replacement for middleware.ts) - admin route protection
- Login page UI (Server Action -> httpOnly cookie)
- Consumer SDK (`lib/consumerSdk.ts`)
- Issuer metadata endpoint (`GET /api/auth/issuer`)
- 15 unit tests (vitest), TypeScript clean

### Rules compliance fixes (2026-06-11)
- Removed unused `LOGIN_API_PREFIX` from `proxy.ts`
- Login page token storage moved from `sessionStorage` -> `httpOnly cookie` via Server Action
- Added `AdminAudit` model and repository - audit trail for all admin actions
- `appRegistrationService` now records audit on every grant/revoke/register
- Fixed `entraAuthService.handleEntraSignIn` concurrency race (unique constraint retry pattern)
- Created missing architecture docs: api-map, database-map, dependency-map

### Known gaps / future work
- Integration/E2E tests
- Admin UI pages
- Production deployment config
- `AUTH_CENTER_SECRET` env var documented for consuming apps but not in this repo's `.env.example`

## 2026-06-13 - Container Revision Labeling

### Delivered
- Added `ARG GIT_SHA` and `org.opencontainers.image.revision` label to the production image
- Updated GitHub Actions image build step to pass `${{ github.sha }}` as a Docker build arg

### Notes
- Running containers can now be mapped back to an exact commit via `docker inspect`

## 2026-06-15 - Consumer Documentation Alignment

### Delivered
- Added `AUTH-CENTER-INTEGRATION-MANUAL.md` as the canonical self-service consumer-app entrypoint
- Rewrote consumer-facing contract docs to match the current `RS256 + JWKS` production model
- Updated consumer-facing claim naming from `permVersion` references to `roleVersion`
- Fixed manual entry links and aligned issuer metadata TTL documentation to the current 8-hour token lifetime

### Notes
- The documentation set now points teams toward one integration model instead of mixed `HS256` and `JWKS` guidance

## 2026-06-15 - Common Problems Manual

### Delivered
- Renamed the troubleshooting manual entry to `manual/04-ปัญหาที่พบบ่อย.md`
- Reframed the content around the most common integration failures: stale roles, wrong audience, wrong app grant, and wrong redirect/callback flow
- Updated document links from README and integration manual

## 2026-06-15 - Consumer Session Registry

### Delivered
- Added `ConsumerAppSession` schema and migration for consumer-app-reported active session tracking
- Added internal session registry API routes:
  - `POST /api/internal/consumer-sessions/register`
  - `POST /api/internal/consumer-sessions/heartbeat`
  - `POST /api/internal/consumer-sessions/revoke`
- Added `consumerAppSessionService`, repository, validation schemas, and `requireConsumerApp` app-secret authentication helper
- Updated current-state and domain-map docs to include consumer-app session visibility

### Notes
- These endpoints are authenticated by `X-Consumer-App-Id` + `X-Consumer-App-Secret`
- Intended for QMS and future consumer apps to report app-owned session lifecycle back to Auth Center

## 2026-06-15 - Consumer Session Admin UI

### Delivered
- Added `/admin/consumer-sessions` for admin visibility into consumer-app-reported sessions
- Added sidebar navigation entry to separate Auth Center sessions from consumer app sessions
- Extended DB Viewer to include `ConsumerAppSession`

### Notes
- The new page is read-only and intended for operational visibility/troubleshooting
- Filters currently support search, app, status, and pagination
- [x] Added delegated consumer-app authorization improvements: `requireAppAdmin()` now accepts generic app-scoped IT/admin roles (for example `QMS_IT`, `HR_CENTER_IT`), and `GET /api/auth/consumer/departments` now allows any authenticated app member token while keeping write operations app-admin-only.

## 2026-07-15 - Consumer Mail Search Gateway

### Delivered
- Added `POST /api/auth/consumer/mail/search` for CRM consumer apps
- Added allowlisted folder, sender, keyword, date-range, and result-limit validation
- Added user-scoped Graph mail search with pagination and normalized message fields
- Enforced app-scoped JWT, Entra-linked account, and mailbox ownership from token claims; no raw Graph URL or caller-supplied user ID is accepted
- Added unit coverage for request validation and Graph query/pagination behavior

### Notes
- Auth Center fetches mail through its existing Graph application credential and returns the result; CRM remains responsible for persistence
- Production Azure app configuration must include the required Graph mail-read application permission and Exchange mailbox scoping before enabling the endpoint
