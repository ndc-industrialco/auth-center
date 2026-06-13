# Step-by-Step: Connecting a Consumer App to Auth Center

This guide explains how to build a new application that authenticates through Auth Center.

## 1. Understand the Boundary

Auth Center owns:

- Login, session lifecycle, JWT issuance
- Role and permission grants per application
- Directory data (employee profiles, departments, M365 links)

Your consumer app owns:

- Business logic
- Page-level and API-level authorization (using claims from the token)
- Any domain-specific rules that go beyond role checks

Key constraints:

- One user has **one active role per application** at a time
- Roles are stored in Auth Center, not in your app's database
- Your app must trust token claims — never hardcode role logic independently

---

## 2. Prerequisites in Auth Center

Before writing any integration code, an administrator must set up the following in Auth Center:

1. Create an **App Registration** for your application
2. Assign a unique `appId` (e.g., `qms-system`)
3. Define the roles your app uses (e.g., `QMS_ADMIN`, `QMS_USER`)
4. Grant at least one test user a role for your app

**Role naming guidance:**

- Use business-level role names (`QMS_ADMIN`, `HR_VIEWER`)
- Avoid overly granular roles in the first iteration
- If you do not yet need fine-grained permissions, use role-only access for now

---

## 3. Consumer App Environment Variables

Minimum required configuration:

```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3002

AUTH_MODE=auth_center

AUTH_CENTER_URL=http://localhost:3001
AUTH_CENTER_ISSUER=http://localhost:3001
AUTH_CENTER_AUDIENCE=your-app-id
AUTH_CENTER_JWKS_URL=http://localhost:3001/.well-known/jwks.json

AUTH_CENTER_CLIENT_ID=your-app-id
AUTH_CENTER_CLIENT_SECRET=replace-with-secret
AUTH_CENTER_REDIRECT_URI=http://localhost:3002/api/auth/callback

APP_CODE=your-app-id
```

Replace `your-app-id` with the `appId` registered in Auth Center.

---

## 4. Login Flow

1. User clicks login in your app
2. Your app redirects to Auth Center
3. User authenticates with either **Microsoft 365 (Entra ID)** or **Employee ID + Password**
4. Auth Center issues a signed JWT scoped to your application
5. Auth Center redirects back to your callback URL with the token
6. Your app verifies the token
7. Your app stores its own session
8. Your app uses `appRoles` from the token for all authorization decisions

---

## 5. Token Verification

```ts
import { createRemoteJWKSet, jwtVerify } from 'jose';

const jwks = createRemoteJWKSet(new URL(process.env.AUTH_CENTER_JWKS_URL!));

export async function verifyAuthCenterToken(token: string) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: process.env.AUTH_CENTER_ISSUER!,
    audience: process.env.AUTH_CENTER_AUDIENCE!,
  });

  return payload;
}
```

Always verify both `issuer` and `audience`. A token issued for a different app must be rejected.

---

## 6. Available Claims

| Claim | Description |
|-------|-------------|
| `userId` | Internal Auth Center user ID |
| `employeeId` | Canonical employee identifier |
| `email` | User email address |
| `displayName` | Full name |
| `authMethod` | `ENTRA` or `LOCAL` |
| `m365Linked` | Whether the user has a linked Entra account |
| `canSendDelegatedMail` | `true` only for Entra-linked users |
| `department` | Department name |
| `departmentId` | Department ID |
| `employmentStatus` | Employment status |
| `appRoles` | Array of roles granted for your app |
| `sessionId` | Session ID for revocation tracking |

---

## 7. Enforcing Authorization in Your App

Apply role checks at every enforcement point:

- Route guard (middleware / proxy)
- Page-level check (server component or layout)
- Server Action / API route handler

**Do not** rely only on hiding UI elements. Always enforce on the server side.

Example pattern:

```ts
import { verifyAuthCenterToken } from '@/lib/auth';

export async function GET(request: Request) {
  const token = extractBearerToken(request);
  const claims = await verifyAuthCenterToken(token);

  if (!claims.appRoles.includes('QMS_ADMIN')) {
    return new Response('Forbidden', { status: 403 });
  }

  // proceed with handler
}
```

---

## 8. Microsoft Graph Access Policy

| Auth Method | Graph Access |
|-------------|-------------|
| Entra ID (M365) | May have delegated Graph access (`canSendDelegatedMail`) |
| Employee ID + Password | **No Graph access** — user has no M365 identity in this session |

Never call Microsoft Graph on behalf of a LOCAL session user. Check `authMethod === 'ENTRA'` and `canSendDelegatedMail === true` before making delegated Graph calls.

---

## 9. Integration Checklist

- [ ] App Registration created in Auth Center
- [ ] Role list defined
- [ ] At least one test user has a role grant
- [ ] Callback route implemented
- [ ] Token verification implemented with correct issuer and audience
- [ ] Session/cookie strategy decided
- [ ] Route-level, page-level, and API-level authorization enforced
- [ ] Unauthorized page or response implemented

---

## 10. Summary

The minimal integration path:

1. Register your app in Auth Center
2. Define your roles
3. Grant a test user a role
4. Redirect to Auth Center for login
5. Verify the returned JWT using JWKS
6. Use `appRoles` from the token to control access in your app
