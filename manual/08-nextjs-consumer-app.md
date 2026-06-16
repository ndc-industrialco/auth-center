# 08 — สร้าง Next.js Consumer App ใหม่ (แบบ QMS)

คู่มือนี้ครอบคลุมการสร้างแอป Next.js ใหม่ที่ใช้ Auth Center เป็น Identity Provider
รูปแบบนี้เหมือนกับ QMS System ทุกอย่าง — user login ผ่าน Auth Center แล้วได้ JWT กลับมา

---

## สิ่งที่ต้องมีก่อน

- Auth Center รันอยู่และเข้าถึงได้
- มีสิทธิ์ Admin ใน Auth Center (`/admin/`)
- Next.js 15+ พร้อม App Router

---

## ขั้นตอนที่ 1 — ลงทะเบียน App ใน Auth Center

ไปที่ **Auth Center Admin UI** → `/admin/apps` → คลิก **Register App**

| Field | ตัวอย่าง |
|-------|---------|
| App ID | `hr-system` (lowercase, hyphens only) |
| Display Name | `HR System` |
| Description | (optional) |

> App ID นี้จะเป็น `aud` ใน JWT และใช้เป็น `AUTH_CENTER_APP_ID` ในแอปใหม่

---

## ขั้นตอนที่ 2 — ตั้ง App Secret ใน Database

Auth Center ยังไม่มี UI สำหรับตั้ง secret — ต้อง set โดยตรงผ่าน DB หรือ script

secret ใช้สำหรับ **Internal API เท่านั้น** (`/api/internal/consumer-sessions/*`) เพื่อ register session หลัง login สำเร็จ

```bash
# generate secret แบบ random
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# ผลลัพธ์ตัวอย่าง: IyCxMLfCkRdOa1k2o4bsbvycN6ck84i99Lfy3ET8bVo=
```

จากนั้น hash แล้วบันทึกลง DB:

```ts
// script/set-app-secret.ts (รันครั้งเดียว)
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

const appId = 'hr-system';
const plainSecret = 'IyCxMLfCkRdOa1k2o4bsbvycN6ck84i99Lfy3ET8bVo=';
const hash = await bcrypt.hash(plainSecret, 12);
await db.appRegistration.update({ where: { appId }, data: { secretHash: hash } });
console.log('Done');
```

เก็บ `plainSecret` ไว้ใส่ในตัวแปร `AUTH_CENTER_CLIENT_SECRET` ของแอปใหม่

---

## ขั้นตอนที่ 3 — Grant Role ให้ User

ไปที่ `/admin/apps/hr-system` → ตั้ง Available Roles แล้ว Grant Role ให้ user ที่ต้องการ

---

## ขั้นตอนที่ 4 — สร้างแอป Next.js ใหม่

```bash
npx create-next-app@latest hr-system --typescript --tailwind --app
cd hr-system
npm install next-auth@beta jose bcryptjs
```

---

## ขั้นตอนที่ 5 — Copy ไฟล์จาก QMS

ไฟล์เหล่านี้ copy มาได้เลย **ไม่ต้องแก้อะไร** (อ่าน env เอง):

```
lib/auth-center-client.ts          ← build login URL, redirect ไป Auth Center
lib/auth-center-token.ts           ← verify JWT ด้วย JWKS หรือ shared secret
lib/auth-center-session-registry.ts ← register session กับ Auth Center หลัง login
lib/auth-node.ts                   ← handleAuthCenterCallback(), NextAuth export
app/api/auth/center/callback/route.ts ← รับ ?token= จาก Auth Center แล้วสร้าง session cookie
```

---

## ขั้นตอนที่ 6 — แก้ Cookie Name (3 จุด สำคัญมาก)

ทุกแอปต้องมีชื่อ cookie ของตัวเอง ไม่งั้นจะทับกันเมื่อรันหลายแอปบน localhost

### 6.1 `lib/auth.config.ts`

```ts
import type { NextAuthConfig } from "next-auth";

const isProduction = process.env.NODE_ENV === "production";

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/auth/login" },
  session: { strategy: "jwt" },
  providers: [],
  // ← เปลี่ยน hr-system ให้ตรงกับชื่อแอป
  cookies: {
    sessionToken: {
      name: isProduction ? "__Secure-hr-system.session-token" : "hr-system.session-token",
      options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure: isProduction },
    },
  },
};
```

### 6.2 `app/api/auth/center/callback/route.ts`

บรรทัด cookieName ต้องตรงกัน:

```ts
const cookieName = isProduction
  ? "__Secure-hr-system.session-token"   // ← เปลี่ยน
  : "hr-system.session-token";           // ← เปลี่ยน
```

### 6.3 `middleware.ts`

```ts
const cookieName = isProduction
  ? "__Secure-hr-system.session-token"   // ← เปลี่ยน
  : "hr-system.session-token";           // ← เปลี่ยน
const token = await getToken({ req, secret: process.env.AUTH_SECRET!, cookieName, salt: cookieName });
```

> **กฎ:** ทั้ง 3 จุดต้องใช้ชื่อเดียวกันเสมอ ถ้าเปลี่ยนที่หนึ่งต้องเปลี่ยนทั้งหมด

---

## ขั้นตอนที่ 7 — ตั้งค่า Environment Variables

### `.env.local` (development)

```env
# Auth Center
AUTH_CENTER_URL=http://localhost:3000
AUTH_CENTER_APP_ID=hr-system
AUTH_CENTER_CLIENT_ID=hr-system
AUTH_CENTER_CLIENT_SECRET=<plain secret จาก Step 2>
AUTH_CENTER_REDIRECT_URI=http://localhost:3001/api/auth/center/callback

# Dev: verify JWT ด้วย shared secret (HS256 fallback)
# ใส่ค่าเดียวกับ AUTH_SECRET ของ auth-center
AUTH_CENTER_SECRET=<ค่าเดียวกับ AUTH_SECRET ใน auth-center/.env>

# NextAuth
AUTH_SECRET=<random string ใหม่ สำหรับ encrypt session cookie ของแอปนี้>
NEXTAUTH_URL=http://localhost:3001
```

### `.env.production`

```env
AUTH_CENTER_URL=https://auth.ndcindustrial.co.th
AUTH_CENTER_APP_ID=hr-system
AUTH_CENTER_CLIENT_ID=hr-system
AUTH_CENTER_CLIENT_SECRET=<plain secret จาก Step 2>
AUTH_CENTER_REDIRECT_URI=https://hr.ndcindustrial.co.th/api/auth/center/callback

# Production: verify JWT ด้วย JWKS (RS256) — ไม่ต้องใช้ shared secret
AUTH_CENTER_JWKS_URL=https://auth.ndcindustrial.co.th/.well-known/jwks.json

AUTH_SECRET=<random string สำหรับแอปนี้>
NEXTAUTH_URL=https://hr.ndcindustrial.co.th
```

> **สังเกต:** Dev ใช้ `AUTH_CENTER_SECRET` (shared secret), Production ใช้ `AUTH_CENTER_JWKS_URL` (public key) — ไม่ต้องการทั้งสองพร้อมกัน

---

## สรุป: อะไรเปลี่ยน อะไรไม่เปลี่ยน

| รายการ | เปลี่ยนไหม | ค่า |
|--------|-----------|-----|
| Cookie name (3 จุด) | ✅ ต้องเปลี่ยน | `hr-system.session-token` |
| `AUTH_CENTER_APP_ID` | ✅ ต้องเปลี่ยน | `hr-system` |
| `AUTH_CENTER_CLIENT_ID` | ✅ ต้องเปลี่ยน | `hr-system` |
| `AUTH_CENTER_CLIENT_SECRET` | ✅ ต้องเปลี่ยน | secret ใหม่จาก Step 2 |
| `AUTH_SECRET` | ✅ ต้องเปลี่ยน | random string ใหม่ |
| `AUTH_CENTER_URL` | อาจเปลี่ยน | URL ของ Auth Center |
| `AUTH_CENTER_JWKS_URL` | อาจเปลี่ยน | ถ้า domain เปลี่ยน |
| โค้ดใน lib files | ❌ ไม่ต้องเปลี่ยน | copy มาวางได้เลย |
| Auth Center โค้ด | ❌ ไม่ต้องแตะเลย | แค่ register ใน Admin UI |

---

## Checklist

- [ ] Register App ใน `/admin/apps` แล้ว
- [ ] ตั้ง `secretHash` ใน DB แล้ว (Step 2)
- [ ] Grant Role ให้ user ที่ `/admin/apps/hr-system` แล้ว
- [ ] Copy lib files ครบ 5 ไฟล์แล้ว
- [ ] เปลี่ยน cookie name ครบ 3 จุดแล้ว
- [ ] ตั้ง `.env` ครบแล้ว
- [ ] รันแอปแล้ว login ได้ (callback redirect สำเร็จ)
- [ ] ตรวจสอบ `session.user` มี `employeeId`, `role`, `jti` ครบ

---

ขั้นตอนถัดไป: ดู [02-login.md](02-login.md) สำหรับวิธีเรียก Auth Center API จากในแอปใหม่
