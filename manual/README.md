# Auth Center — คู่มือสำหรับนักพัฒนา

Auth Center คือระบบ Authentication & Authorization กลางสำหรับ NDC Enterprise ทำหน้าที่ออก JWT token ให้แก่ Consumer App ทุกตัว และจัดการ User, Role, Department, Profile แบบรวมศูนย์

---

## สารบัญ

| ไฟล์ | เนื้อหา |
|------|---------|
| [01-onboarding.md](01-onboarding.md) | ลงทะเบียน App, ตั้งค่า env, สร้าง `verifyToken()` |
| [02-login.md](02-login.md) | Local login, Entra SSO, Refresh, Logout, /me |
| [03-user-management.md](03-user-management.md) | Consumer API: จัดการ User และ Role |
| [04-department.md](04-department.md) | Consumer API: จัดการ Department |
| [05-profile.md](05-profile.md) | อัปเดต Profile (ตัวเอง / Admin) |
| [06-send-mail.md](06-send-mail.md) | ส่งอีเมลแบบ Delegated ผ่าน Auth Center |
| [07-admin-ui.md](07-admin-ui.md) | คู่มือการใช้ Admin UI |

---

## ภาพรวมระบบ

Auth Center ทำหน้าที่เป็น Identity Provider กลาง:

- ออก JWT (RS256, 8 ชั่วโมง) ให้ Consumer App ทุกตัว
- รองรับ **Microsoft Entra (M365)** และ **Local Password** login
- จัดการ User / Role / Department / Profile รวมศูนย์
- มี Admin UI ที่ `/admin/` สำหรับ Admin ของระบบ

---

## แนวคิดหลัก: User Token Forwarding

Auth Center ใช้รูปแบบ **User Token Forwarding** — Consumer App **ไม่ต้องใช้ App Secret** เพื่อเรียก Consumer API

```
[User]
  │
  │ 1. Login ที่ Auth Center
  ▼
[Auth Center]
  │
  │ 2. ออก JWT (aud = appId ของ Consumer App)
  ▼
[Consumer App]
  │  เก็บ JWT ใน httpOnly cookie
  │
  │ 3. เมื่อต้องการเรียก Auth Center API
  │    → ส่ง JWT ของ User ใน Authorization: Bearer {token}
  ▼
[Auth Center Consumer API]
  │
  │ 4. ตรวจสอบ appRoles ใน JWT
  │    ADMIN / IT = สิทธิ์ Admin
  ▼
[Response]
```

- JWT มี `aud` เป็น `appId` ของ Consumer App — Auth Center ตรวจสอบ `appRoles` จาก JWT ของ User โดยตรง
- ไม่มี App Secret สำหรับ Consumer API

---

## Endpoint พื้นฐาน

| Endpoint | คำอธิบาย |
|----------|----------|
| `GET {AUTH_CENTER_URL}/api/auth/issuer` | Metadata ของ issuer (algorithm, jwks_uri, endpoints) |
| `GET {AUTH_CENTER_URL}/.well-known/jwks.json` | Public key สำหรับตรวจสอบ JWT |

---

## สรุปสิทธิ์ที่ต้องการ

| กลุ่ม Endpoint | สิทธิ์ที่ต้องการ |
|----------------|-----------------|
| `POST /api/auth/login/local`, `GET /api/auth/login/entra` | ไม่ต้องการ (public) |
| `GET /api/auth/me` | Bearer token ที่ยังใช้ได้ |
| `POST /api/auth/refresh`, `POST /api/auth/logout` | Bearer token ที่ยังใช้ได้ + `sessionId` ใน body |
| `GET /api/auth/consumer/app-members` | Bearer token ใดก็ได้ (authenticated user) |
| `GET /api/auth/consumer/departments` | Bearer token ใดก็ได้ (authenticated user) |
| `PATCH /api/auth/profile/me` | Bearer token ของตัวเอง |
| `GET/POST /api/auth/consumer/users` | appRoles ต้องมี `ADMIN` หรือ `IT` |
| `GET/POST/PATCH/DELETE /api/auth/consumer/departments` (write) | appRoles ต้องมี `ADMIN` หรือ `IT` |
| `GET/POST/DELETE /api/auth/consumer/role-grants` | appRoles ต้องมี `ADMIN` หรือ `IT` |
| `GET/PATCH /api/auth/consumer/users/{userId}/profile` | appRoles ต้องมี `ADMIN` หรือ `IT` |
| `POST /api/auth/mail/send` | `canSendDelegatedMail: true` ใน JWT + authMethod ต้องเป็น `ENTRA` |
| `/api/internal/consumer-sessions/*` | App Secret (Internal — ไม่ใช่ Consumer API) |
| `/admin/*` | ADMIN role บน auth-center app |

---

## JWT Claims ที่ออกให้

```typescript
{
  sub: string                                           // User.id
  userId: string                                        // alias of sub
  employeeId: string                                    // รหัสพนักงาน
  authMethod: "ENTRA" | "LOCAL_PASSWORD" | "LOCAL_OTP"
  m365Linked: boolean    // เชื่อมต่อ Entra หรือไม่
  canSendDelegatedMail: boolean  // false เสมอสำหรับ LOCAL session
  departmentId: string | null
  appRoles: string[]     // roles ที่ได้รับสำหรับ app นี้ (aud)
  roleVersion: string    // 12-char hash ของ role set
  sessionId: string
  iss: "auth-center"
  aud: string            // appId ของ Consumer App
  iat: number
  exp: number            // iat + 28800 (8 ชั่วโมง)
}
```

---

## Algorithm และ TTL

| รายการ | ค่า |
|--------|-----|
| Algorithm | **RS256** (production) / HS256 (non-production เท่านั้น) |
| TTL | **8 ชั่วโมง** (28,800 วินาที) |
| Issuer | `auth-center` |
| Audience | `appId` ที่ระบุตอน login |
