# 01 — ลงทะเบียน App และตั้งค่าระบบ (Onboarding)

ก่อนที่ Consumer App จะเรียก Auth Center API ได้ ต้องทำขั้นตอนต่อไปนี้ให้ครบ

---

## ขั้นตอนที่ 1: ลงทะเบียน App กับ Auth Center Admin

ติดต่อผู้ดูแล Auth Center เพื่อลงทะเบียน Consumer App ใหม่ Admin จะสร้าง App record และแจ้งข้อมูลต่อไปนี้:

| รายการ | ตัวอย่าง | ใช้ทำอะไร |
|--------|---------|-----------|
| `appId` | `qms`, `hr-center`, `pr-system` | ตัวระบุ App — ใส่เป็น `appId` ใน query string ทุก request |
| `appSecret` | `secret_xxxxx` | ใช้เฉพาะ Internal API (`/api/internal/consumer-sessions/*`) เท่านั้น |

> **หมายเหตุ:** `appSecret` ไม่ได้ใช้เพื่อเรียก Consumer API ทั่วไป — Consumer API ใช้ JWT ของ User โดยตรง (ดู [README.md](README.md) เรื่อง User Token Forwarding)

---

## ขั้นตอนที่ 2: ตั้งค่า Environment Variables

เพิ่มค่าต่อไปนี้ใน `.env` ของ Consumer App:

```env
# URL ของ Auth Center
AUTH_CENTER_URL=https://auth.ndc.co.th

# appId ที่ได้จากการลงทะเบียน
AUTH_CENTER_APP_ID=qms

# JWKS URL สำหรับตรวจสอบ JWT signature
AUTH_CENTER_JWKS_URL=https://auth.ndc.co.th/.well-known/jwks.json

# (ใช้เฉพาะ Internal API เท่านั้น)
AUTH_CENTER_APP_SECRET=secret_xxxxx
```

---

## ขั้นตอนที่ 3: ติดตั้ง `jose` Library

```bash
npm install jose
```

---

## ขั้นตอนที่ 4: สร้าง `verifyToken()` Function

สร้างไฟล์ `lib/authCenter.ts` ใน Consumer App:

```typescript
import { createRemoteJWKSet, jwtVerify } from 'jose';

const jwks = createRemoteJWKSet(
  new URL(process.env.AUTH_CENTER_JWKS_URL!)
);

// ครบทุก claim ตาม JWT v1.1 contract ของ Auth Center
export interface AuthCenterClaims {
  // Standard JWT claims
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  // Auth Center custom claims
  userId: string;
  employeeId: string;
  authMethod: 'ENTRA' | 'LOCAL_PASSWORD' | 'LOCAL_OTP';
  m365Linked: boolean;
  canSendDelegatedMail: boolean;
  departmentId: string | null;
  appRoles: string[];
  roleVersion: string;
  sessionId: string;
}

export async function verifyToken(token: string): Promise<AuthCenterClaims> {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: 'auth-center',
    audience: process.env.AUTH_CENTER_APP_ID!,
  });
  return payload as unknown as AuthCenterClaims;
}
```

**สิ่งที่ `verifyToken()` ตรวจสอบ:**
- Signature ด้วย RS256 + JWKS public key
- `iss` ต้องเป็น `auth-center`
- `aud` ต้องตรงกับ `AUTH_CENTER_APP_ID`
- `exp` ยังไม่หมดอายุ

---

## ขั้นตอนที่ 5: ทดสอบ Issuer Endpoint

เรียก Issuer endpoint เพื่อตรวจสอบว่าเชื่อมต่อ Auth Center ได้:

```bash
curl https://auth.ndc.co.th/api/auth/issuer
```

ผลลัพธ์ที่ควรได้:

```json
{
  "issuer": "auth-center",
  "issuer_url": "https://auth.ndc.co.th",
  "algorithm": "RS256",
  "jwks_uri": "https://auth.ndc.co.th/.well-known/jwks.json",
  "token_endpoint": "https://auth.ndc.co.th/api/auth/login/local",
  "refresh_endpoint": "https://auth.ndc.co.th/api/auth/refresh",
  "revocation_endpoint": "https://auth.ndc.co.th/api/auth/logout"
}
```

ตรวจสอบ JWKS endpoint:

```bash
curl https://auth.ndc.co.th/.well-known/jwks.json
```

---

## Checklist

- [ ] ได้รับ `appId` จาก Auth Center Admin แล้ว
- [ ] ตั้งค่า `AUTH_CENTER_URL`, `AUTH_CENTER_APP_ID`, `AUTH_CENTER_JWKS_URL` ใน `.env` แล้ว
- [ ] ติดตั้ง `jose` แล้ว
- [ ] สร้าง `verifyToken()` พร้อม `AuthCenterClaims` interface ครบทุก claim แล้ว
- [ ] เรียก `/api/auth/issuer` แล้วได้ response ถูกต้อง
- [ ] เรียก `/.well-known/jwks.json` แล้วได้ key set

---

ขั้นตอนถัดไป: [02-login.md](02-login.md)
