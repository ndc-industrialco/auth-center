# Auth Domain Task Log

## 2026-06-12 - Manual Folder For Integration And Sprint Rationale

### Delivered
- Added `manual/` as a dedicated folder for Auth Center manuals
- Added a global step-by-step integration guide for all consumer apps
- Added a sprint-rationale document explaining why Auth Center should come before CAR-heavy sprint implementation

### Notes
- The manual set now supports both implementation work and planning discussions

## 2026-06-12 - Consumer Integration Manual

### Delivered
- Added a full manual for connecting new consumer apps to Auth Center
- Removed stale guidance that referenced symmetric shared-secret validation

### Notes
- Current documented flow matches the implemented token redirect handoff

## 2026-06-12 - Consumer App Redirect Handoff

### Delivered
- Added `redirectUri` + `state` handoff support for consumer-app login
- Entra callback can now redirect directly back to a consumer app with `token`
- Local login can now redirect directly back to a consumer app with `token`

### Notes
- This is a token-redirect handoff for integration progress
- A production-grade authorization-code exchange flow is still the preferred longer-term direction

## 2026-06-12 - Deploy Checklist Kickoff

### Delivered
- Added deploy-ready environment template for Auth Center
- Added RSA key generation helper for production JWT signing
- Verified health endpoint, migrations, tests, and production build

### Outstanding
- React Compiler warnings remain in two admin form components
- Production infra checks still require real deployment secret injection and Entra/Graph validation

## 2026-06-12 - Documentation Refresh For Handoff

### Delivered
- Added root summary document for Auth Center status and integration notes
- Added production deploy checklist for operational readiness
- Updated root README to point to the summary and deployment documents

### Impact
- New developers and consumer-app teams now have a clear entry point
- Production rollout requirements are documented in one place

## 2026-06-13 - Container Revision Labeling

### Delivered
- Added OCI revision labeling to the production Docker image
- Wired GitHub Actions image builds to inject the source commit SHA

### Impact
- Operations can identify the deployed commit directly from the running `auth-center` container
