# 03 — จัดการ User (User Management)

Consumer API สำหรับจัดการ User ใช้ **JWT ของ User ที่ Login อยู่** — Auth Center ตรวจสอบ `appRoles` ใน JWT โดยตรง ไม่ต้องใช้ App Secret แยก

```
Consumer App  →  ส่ง JWT ของ User ใน Authorization: Bearer
                ↓
Auth Center  →  ตรวจ appRoles ใน JWT → ADMIN/IT = ผ่าน
```

---

## 1. ดูรายชื่อ User ทั้งหมด (สำหรับ Admin)

ต้องการ `appRoles` ที่มี `ADMIN` หรือ `IT`

### Endpoint

```
GET {AUTH_CENTER_URL}/api/auth/consumer/users?appId={appId}
Authorization: Bearer {adminUserToken}
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "usr_xxx",
      "employeeId": "EMP001",
      "email": "somchai@ndc.co.th",
      "displayName": "สมชาย ใจดี",
      "department": "ฝ่ายไอที",
      "jobTitle": "นักพัฒนาซอฟต์แวร์",
      "roles": ["USER", "ADMIN"]
    }
  ]
}
```

### ตัวอย่างโค้ด

```typescript
async function listUsers(adminToken: string) {
  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/consumer/users?appId=${process.env.AUTH_CENTER_APP_ID}`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
      cache: 'no-store',
    }
  );
  if (!res.ok) throw new Error('Failed to list users');
  const { data } = await res.json();
  return data;
}
```

---

## 2. ดูรายชื่อสมาชิก App ทั้งหมด (สำหรับ User ทั่วไป)

Endpoint นี้เปิดให้ **ผู้ใช้ที่ Login แล้วทุกคน** เรียกได้ ไม่ต้องการสิทธิ์ Admin ใช้สำหรับเลือกผู้รับในฟีเจอร์ต่างๆ เช่น เลือกผู้รับอีเมล เลือกผู้รับมอบหมายงาน

### Endpoint

```
GET {AUTH_CENTER_URL}/api/auth/consumer/app-members?appId={appId}
Authorization: Bearer {userToken}
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "usr_xxx",
      "employeeId": "EMP001",
      "displayName": "สมชาย ใจดี",
      "email": "somchai@ndc.co.th",
      "m365Linked": true
    }
  ]
}
```

> ข้อมูลที่คืนมาเป็น **ข้อมูลขั้นต่ำ** เท่าที่จำเป็น — ไม่มี role หรือข้อมูล sensitive

### ตัวอย่างโค้ด

```typescript
async function getAppMembers(token: string) {
  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/consumer/app-members?appId=${process.env.AUTH_CENTER_APP_ID}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }
  );
  if (!res.ok) throw new Error('Failed to fetch members');
  const { data } = await res.json();
  return data as {
    id: string;
    employeeId: string;
    displayName: string | null;
    email: string | null;
    m365Linked: boolean;
  }[];
}
```

---

## 3. สร้าง User ใหม่

ต้องการ `appRoles` ที่มี `ADMIN` หรือ `IT`

### Endpoint

```
POST {AUTH_CENTER_URL}/api/auth/consumer/users
Authorization: Bearer {adminUserToken}
Content-Type: application/json
```

### Request Body

```json
{
  "appId": "qms",
  "employeeId": "EMP002",
  "displayName": "สมหญิง รักดี",
  "email": "somying@ndc.co.th",
  "departmentCode": "IT",
  "department": "ฝ่ายไอที",
  "jobTitle": "UX Designer",
  "initialPassword": "Temp@1234"
}
```

### ตาราง Field

| Field | จำเป็น | คำอธิบาย |
|-------|--------|---------|
| `appId` | ✅ | App ID ของ Consumer App |
| `employeeId` | ✅ | รหัสพนักงาน — ตัวอักษร ตัวเลข `-` `_` เท่านั้น, unique ใน Auth Center |
| `displayName` | — | ชื่อแสดง (1–200 ตัวอักษร) |
| `email` | — | อีเมลงาน |
| `departmentCode` | — | รหัสแผนก — ต้องมีอยู่ใน Auth Center แล้ว (ดู [04-department.md](04-department.md)) |
| `department` | — | ชื่อแผนกแบบ free text (ใช้เมื่อยังไม่มี department code) |
| `jobTitle` | — | ตำแหน่งงาน |
| `initialPassword` | — | รหัสผ่านตั้งต้นสำหรับ Local login หากไม่ใส่ผู้ใช้ยังไม่สามารถ Local login ได้ |

### Response

```json
{
  "success": true,
  "data": {
    "id": "usr_yyy",
    "employeeId": "EMP002",
    "email": "somying@ndc.co.th",
    "displayName": "สมหญิง รักดี"
  }
}
```

### ตัวอย่างโค้ด

```typescript
async function createUser(
  adminToken: string,
  userData: {
    employeeId: string;
    displayName?: string;
    email?: string;
    departmentCode?: string;
    jobTitle?: string;
    initialPassword?: string;
  }
) {
  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/consumer/users`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appId: process.env.AUTH_CENTER_APP_ID,
        ...userData,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'Create user failed');
  }
  const { data } = await res.json();
  return data;
}
```

---

## 4. จัดการ Role ของ User

### 4.1 ดู Role Grants ทั้งหมดใน App

ต้องการ `appRoles` ที่มี `ADMIN` หรือ `IT`

```
GET {AUTH_CENTER_URL}/api/auth/consumer/role-grants?appId={appId}
Authorization: Bearer {adminUserToken}
```

### 4.2 มอบ Role ให้ User

```
POST {AUTH_CENTER_URL}/api/auth/consumer/role-grants
Authorization: Bearer {adminUserToken}
Content-Type: application/json
```

```json
{
  "userId": "usr_xxx",
  "appId": "qms",
  "role": "QMS_IT"
}
```

### ตัวอย่างโค้ด (Grant Role)

```typescript
async function grantRole(adminToken: string, userId: string, role: string) {
  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/consumer/role-grants`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        appId: process.env.AUTH_CENTER_APP_ID,
        role,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'Grant role failed');
  }
  return (await res.json()).data;
}
```

### 4.3 ถอน Role จาก User

```
DELETE {AUTH_CENTER_URL}/api/auth/consumer/role-grants
Authorization: Bearer {adminUserToken}
Content-Type: application/json
```

```json
{
  "userId": "usr_xxx",
  "appId": "qms",
  "role": "QMS_IT"
}
```

### ตัวอย่างโค้ด (Revoke Role)

```typescript
async function revokeRole(adminToken: string, userId: string, role: string) {
  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/consumer/role-grants`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        appId: process.env.AUTH_CENTER_APP_ID,
        role,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'Revoke role failed');
  }
}
```

> Role จะสะท้อนใน JWT ทันทีหลัง Refresh Token — ก่อนนั้น JWT เดิมยังใช้งานได้จนหมดอายุ

---

## 5. ตรวจสอบสิทธิ์ใน Consumer App จาก JWT

หลัง `verifyToken()` แล้ว ใช้ `appRoles` จาก claims ตัดสินสิทธิ์ภายใน App:

```typescript
import { verifyToken } from '@/lib/authCenter';

// ตรวจสอบว่าเป็น Admin หรือไม่
export async function requireAdmin(token: string) {
  const claims = await verifyToken(token);

  const isAdmin = claims.appRoles.some(
    (role) => role === 'ADMIN' || role === 'IT'
  );

  if (!isAdmin) throw new Error('ต้องการสิทธิ์ ADMIN หรือ IT');
  return claims;
}

// ตรวจสอบว่ามี role เฉพาะ
export function hasRole(appRoles: string[], role: string): boolean {
  return appRoles.includes(role);
}

// ตรวจสอบ roleVersion เพื่อ invalidate cache เมื่อ role เปลี่ยน
export function isRoleVersionChanged(
  cachedVersion: string,
  currentVersion: string
): boolean {
  return cachedVersion !== currentVersion;
}
```

---

## หมายเหตุ

- ใช้ `userId` (claim `sub`) เป็น primary key ของ User เสมอ — **ห้ามใช้ `employeeId`** เป็น security principal
- `employeeId` อาจเปลี่ยนได้ในบางกรณี (เช่น migration) ใช้เพื่อแสดงผลเท่านั้น
- Role สะท้อนใน JWT หลัง refresh — Consumer App สามารถใช้ `roleVersion` เพื่อตรวจสอบว่า role เปลี่ยนหรือไม่โดยไม่ต้อง verify network ทุก request
