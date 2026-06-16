# 02 — Login และ Token Management

Auth Center รองรับการ Login 2 แบบ:

| แบบ | เมื่อใช้ |
|-----|---------|
| **Local Password** | พนักงานที่ไม่มี M365 หรือใช้ในระบบ Dev/Test |
| **Microsoft Entra (M365)** | พนักงานที่ใช้บัญชี NDC M365 — แนะนำสำหรับ Production |

---

## 1. Login ด้วย Local Password

### Endpoint

```
POST {AUTH_CENTER_URL}/api/auth/login/local?appId={appId}
Content-Type: application/json
```

### Request Body

```json
{
  "employeeId": "EMP001",
  "password": "รหัสผ่าน"
}
```

### Response (สำเร็จ)

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiJ9...",
    "sessionId": "sess_abc123",
    "expiresAt": "2026-06-17T08:00:00.000Z",
    "user": {
      "userId": "usr_xxx",
      "employeeId": "EMP001",
      "displayName": "สมชาย ใจดี",
      "appRoles": ["USER"]
    }
  }
}
```

### ตัวอย่างโค้ด (Next.js Server Action)

```typescript
'use server';
import { cookies } from 'next/headers';

export async function loginWithPassword(employeeId: string, password: string) {
  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/login/local?appId=${process.env.AUTH_CENTER_APP_ID}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, password }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'Login failed');
  }

  const { data } = await res.json();
  // { accessToken, sessionId, expiresAt, user }

  // เก็บ token ใน httpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set('access_token', data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 ชั่วโมง
  });
  cookieStore.set('session_id', data.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  return data.user;
}
```

---

## 2. Login ด้วย Microsoft Entra (M365)

ระบบ Consumer App ไม่จัดการ Entra flow เอง — เพียงแค่ **redirect** ผู้ใช้ไปที่ Auth Center

### Endpoint (Redirect)

```
GET {AUTH_CENTER_URL}/api/auth/login/entra?appId={appId}&callbackUrl={callbackUrl}
```

| Parameter | คำอธิบาย |
|-----------|---------|
| `appId` | App ID ของ Consumer App |
| `callbackUrl` | URL ที่ Auth Center จะ redirect กลับพร้อม token (ต้อง URL-encode) |

### Flow

```
1. ผู้ใช้คลิก "เข้าสู่ระบบด้วย Microsoft"
2. Consumer App redirect → Auth Center /api/auth/login/entra?appId=qms&callbackUrl=https://qms.ndc.co.th/auth/callback
3. Auth Center → Microsoft Login Page
4. ผู้ใช้ Login สำเร็จ → Auth Center ออก JWT
5. Auth Center redirect → https://qms.ndc.co.th/auth/callback?token=eyJ...&sessionId=sess_xxx
6. Consumer App รับ token จาก query string แล้วเก็บใน httpOnly cookie
```

### Redirect จาก Consumer App

```typescript
// app/login/page.tsx หรือ login button handler
import { redirect } from 'next/navigation';

export function loginWithEntra() {
  const callbackUrl = encodeURIComponent('https://qms.ndc.co.th/auth/callback');
  const entraUrl = `${process.env.AUTH_CENTER_URL}/api/auth/login/entra?appId=${process.env.AUTH_CENTER_APP_ID}&callbackUrl=${callbackUrl}`;
  redirect(entraUrl);
}
```

### รับ Token ที่ Callback URL

```typescript
// app/auth/callback/page.tsx
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function CallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; sessionId?: string; error?: string }>;
}) {
  const { token, sessionId, error } = await searchParams;

  if (error) redirect(`/login?error=${error}`);
  if (!token || !sessionId) redirect('/login?error=no_token');

  const cookieStore = await cookies();
  cookieStore.set('access_token', token, {
    httpOnly: true,
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  cookieStore.set('session_id', sessionId, {
    httpOnly: true,
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  redirect('/dashboard');
}
```

---

## 3. ตรวจสอบ Token (Verify JWT)

ใช้ `verifyToken()` ที่สร้างจาก [01-onboarding.md](01-onboarding.md):

```typescript
import { verifyToken } from '@/lib/authCenter';
import { cookies } from 'next/headers';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;

  try {
    return await verifyToken(token);
    // return type: AuthCenterClaims
  } catch {
    return null; // Token หมดอายุหรือ signature ไม่ถูกต้อง
  }
}
```

ตัวอย่างการใช้งานใน Server Component:

```typescript
import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <div>สวัสดี {user.employeeId}</div>;
}
```

---

## 4. Refresh Token

เรียก Refresh เมื่อ Token ใกล้หมดอายุ (แนะนำก่อนหมด 30 นาที)

### Endpoint

```
POST {AUTH_CENTER_URL}/api/auth/refresh?appId={appId}
Authorization: Bearer {currentToken}
Content-Type: application/json
```

### Request Body

```json
{
  "sessionId": "sess_abc123"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiJ9...(ใหม่)",
    "sessionId": "sess_abc123",
    "expiresAt": "2026-06-17T16:00:00.000Z"
  }
}
```

### ตัวอย่างโค้ด

```typescript
'use server';
import { cookies } from 'next/headers';

export async function refreshAccessToken() {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get('access_token')?.value;
  const sessionId = cookieStore.get('session_id')?.value;
  if (!currentToken || !sessionId) throw new Error('No active session');

  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/refresh?appId=${process.env.AUTH_CENTER_APP_ID}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    }
  );

  if (!res.ok) throw new Error('Token refresh failed — กรุณา login ใหม่');

  const { data } = await res.json();

  cookieStore.set('access_token', data.accessToken, {
    httpOnly: true,
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  return data;
}
```

> Rate limit: 30 requests / นาที / IP

---

## 5. Logout

### Endpoint

```
POST {AUTH_CENTER_URL}/api/auth/logout
Authorization: Bearer {token}
Content-Type: application/json
```

### Request Body

```json
{
  "sessionId": "sess_abc123"
}
```

### ตัวอย่างโค้ด

```typescript
'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  const sessionId = cookieStore.get('session_id')?.value;

  if (token && sessionId) {
    // แจ้ง Auth Center ให้ revoke session
    await fetch(`${process.env.AUTH_CENTER_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {}); // ลบ cookie ไม่ว่าจะสำเร็จหรือไม่
  }

  // ลบ cookies ในฝั่ง Consumer App
  cookieStore.delete('access_token');
  cookieStore.delete('session_id');

  redirect('/login');
}
```

---

## 6. ดูข้อมูลผู้ใช้ปัจจุบัน (/me)

### Endpoint

```
GET {AUTH_CENTER_URL}/api/auth/me?appId={appId}
Authorization: Bearer {token}
```

### Response

```json
{
  "success": true,
  "data": {
    "userId": "usr_xxx",
    "employeeId": "EMP001",
    "displayName": "สมชาย ใจดี",
    "email": "somchai@ndc.co.th",
    "departmentId": "IT",
    "appRoles": ["USER", "ADMIN"],
    "roleVersion": "a1b2c3d4e5f6",
    "authMethod": "LOCAL_PASSWORD",
    "m365Linked": false,
    "canSendDelegatedMail": false
  }
}
```

### ตัวอย่างโค้ด

```typescript
async function getMe(token: string) {
  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/me?appId=${process.env.AUTH_CENTER_APP_ID}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }
  );
  if (!res.ok) throw new Error('Failed to fetch user info');
  const { data } = await res.json();
  return data;
}
```

> ใช้ endpoint นี้เมื่อต้องการข้อมูล user ล่าสุดจาก server — สำหรับ token verification ทั่วไปให้ใช้ `verifyToken()` แทน (ไม่ต้องเรียก network)

---

## หมายเหตุด้านความปลอดภัย

- เก็บ `accessToken` ใน **httpOnly cookie เท่านั้น** — ห้ามเก็บใน `localStorage` หรือ `sessionStorage`
- `canSendDelegatedMail` จะเป็น `false` เสมอสำหรับ `LOCAL_PASSWORD` และ `LOCAL_OTP` — ห้ามส่งเมล Delegated ในกรณีนี้
- Rate limit: 30 requests / นาที / IP สำหรับ login และ refresh
- ตรวจสอบ JWT ด้วย JWKS public key เสมอ — ห้ามใช้ HS256 shared secret ใน production
