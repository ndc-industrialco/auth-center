# Role and Session Troubleshooting Guide

Use this guide when a user has been granted a role but the application still denies access, or when the displayed role does not match the effective permissions.

---

## Common Symptoms

- Role was granted in Auth Center admin UI, but the user cannot access the page
- `/api/auth/me` or the permissions API shows the correct role
- The session token does not contain the expected role
- The admin UI shows one role, but the app still shows "Access Denied"

---

## Root Cause

In most cases, the session token is **stale**.

How this system works:

- Roles are stored in Auth Center
- Consumer apps authorize based on JWT claims, not live database lookups
- A token already issued to the browser does not update automatically when a role changes
- The new role appears in the token only after the session is refreshed or the user logs in again

---

## Debugging Steps

Follow these in order:

### Step 1 — Verify the role grant in Auth Center

Check in the Auth Center admin UI (`/admin/users/[userId]`) that:

- The role is active
- It is granted for the correct application (`appId`)
- The grant has not been superseded by a different role

### Step 2 — Inspect the current session token

Decode the JWT the consumer app is using (e.g., from a cookie or `Authorization` header) and check the `appRoles` claim. If the role is missing here, the token was issued before the grant was applied — the user needs to re-authenticate.

Tools: `jwt.io`, browser devtools (Application → Cookies), or a token debug endpoint if your app exposes one.

### Step 3 — Verify the audience

Confirm `AUTH_CENTER_AUDIENCE` in the consumer app matches the `appId` registered in Auth Center. A mismatch causes token verification to fail silently or return no roles.

### Step 4 — Verify the correct app received the grant

An admin may have granted the role to a different app registration. In Auth Center admin, confirm the grant is attached to the exact `appId` your consumer app uses.

### Step 5 — Check the consumer app's route guard

Inspect the middleware or route guard code in the consumer app:

- Is it reading `appRoles` from the correct claim?
- Is the role name an exact match (case-sensitive)?
- Does the API handler also enforce the role, not just the frontend?

---

## Role System Rules

| Rule | Behavior |
|------|----------|
| One active role per user per application | Granting a new role replaces the previous one |
| Role changes are not retroactive | Existing tokens keep the old role until refreshed |
| Permissions are resolved at token issuance | Live permission lookups are not performed on every request |

---

## Resolving a Stale Token

To pick up a newly granted role, the user must do one of the following:

1. **Sign out and sign in again** — a new token is issued with the current role
2. **Use a refresh session action** — if the consumer app implements silent re-auth or a "refresh session" button
3. **Wait for session expiry** — the next login will include the updated role automatically

Administrators can also revoke all active sessions for a user from the Auth Center admin UI, which forces re-authentication on the next request.

---

## Access Denied Checklist

- [ ] User has an active role grant in Auth Center
- [ ] Grant is for the correct `appId`
- [ ] Consumer app `AUTH_CENTER_AUDIENCE` matches the `appId`
- [ ] User has re-authenticated since the role was granted
- [ ] Consumer app route guard checks the correct role name (case-sensitive)
- [ ] Backend API handler enforces the same role as the frontend guard

---

## Summary

If the role is correct in Auth Center but the app still denies access, the issue is almost always a stale token. Have the user sign out and sign in again, then verify the token claims.
