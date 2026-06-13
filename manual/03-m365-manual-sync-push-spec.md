# Microsoft 365 Manual Sync & Push Specification

This document describes how Auth Center synchronizes directory data with Microsoft 365 and how changes are pushed back.

## Purpose

Auth Center acts as a directory hub for a subset of organizational data:

- Users and employee profiles
- Departments
- Email groups
- Email group memberships

The current approach is **manual sync** (admin-triggered), not real-time sync.

---

## Why Not Real-Time Sync?

Real-time sync introduces immediate complexity that is not yet warranted:

- Requires webhook subscriptions and lifecycle management
- Requires retry logic and out-of-order update handling
- Requires a conflict resolution strategy
- Requires additional monitoring and alerting

Manual sync keeps the system predictable and auditable at this stage.

---

## Supported Directions

### Pull (M365 → Auth Center)

Read data from Microsoft 365 into Auth Center. Triggered by an administrator.

### Push (Auth Center → M365)

Write changes made in Auth Center back to Microsoft 365. Requires admin confirmation.

---

## Pull: User Data from M365

Fields synchronized from Microsoft Graph:

| Field | Graph Property |
|-------|---------------|
| Display name | `displayName` |
| Email | `mail` |
| Job title | `jobTitle` |
| Office location | `officeLocation` |
| Mobile phone | `mobilePhone` |
| Department | `department` |
| Entra Object ID | `id` |

---

## Pull: Group Data from M365

Fields synchronized from Microsoft Graph:

| Field | Graph Property |
|-------|---------------|
| Display name | `displayName` |
| Email address | `mail` |
| Description | `description` |
| Security-enabled | `securityEnabled` |
| Mail-enabled | `mailEnabled` |
| Group type | `groupTypes` |
| Member list | `/members` |

---

## Push: Profile Fields Back to M365

Only safe, controllable fields are written back:

| Field | Notes |
|-------|-------|
| `displayName` | Visible name in M365 |
| `jobTitle` | HR-managed title |
| `officeLocation` | Physical location |
| `mobilePhone` | Contact number |
| `department` | Department name |

Do not push fields that M365 owns exclusively (e.g., `mail`, `userPrincipalName`).

---

## Push: Group Membership Back to M365

Supported operations:

- Add a member to an email group
- Remove a member from an email group

**Constraints:**

- The target user must have an `entraObjectId` in Auth Center
- Users with only a LOCAL auth account (no Entra link) cannot be pushed to M365 groups via Graph
- Always verify `m365Linked === true` before attempting membership push

---

## Logging and Audit Requirements

Every sync and push operation must record:

| Field | Description |
|-------|-------------|
| Actor | Which administrator triggered the operation |
| Operation | What was synced or pushed |
| Outcome | `SUCCESS` or `FAILURE` |
| Error detail | Error message if the operation failed |

Models used:

- `DirectorySyncLog` — records each sync event
- `AdminAudit` — records admin-initiated actions for compliance

---

## Summary

Auth Center uses the most pragmatic approach for this stage:

- **Pull** from M365 when an administrator requests a sync
- **Push** back to M365 when an administrator confirms a profile or membership change
- Real-time sync is explicitly deferred to reduce operational complexity

All operations are auditable and admin-gated.
