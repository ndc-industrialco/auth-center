# 05 — จัดการ Profile ของ User

Auth Center เก็บ Profile ของพนักงานไว้กลาง ข้อมูลจากระบบใดระบบหนึ่งจะเห็นในทุก Consumer App

มี 2 แนวทางในการอัปเดต:

| แนวทาง | ใช้เมื่อ | Token ที่ส่ง |
|--------|---------|------------|
| **Self-update** | ผู้ใช้แก้ไข Profile ตัวเอง | JWT ของ User คนนั้น |
| **Admin-update** | Admin จัดการ Profile แทน User คนอื่น | JWT ของ User ที่มี appRoles `ADMIN` หรือ `IT` |

> Consumer App ส่ง JWT ของ User ที่ Login อยู่ไปใน Authorization header — Auth Center ตรวจ `appRoles` ในนั้นเอง ไม่ต้องใช้ App Secret

---

## 1. ผู้ใช้แก้ไข Profile ตัวเอง (Self-update)

### Endpoint

```
PATCH {AUTH_CENTER_URL}/api/auth/profile/me
Authorization: Bearer {userToken}
Content-Type: application/json
```

### Request Body

ส่งเฉพาะ field ที่ต้องการแก้ไข — ทุก field เป็น optional:

```json
{
  "displayName": "สมชาย ใจดีมาก",
  "jobTitle": "Senior Developer",
  "officeLocation": "อาคาร B ชั้น 2",
  "mobilePhone": "081-234-5678"
}
```

### ตาราง Field

| Field | ประเภท | คำอธิบาย |
|-------|--------|---------|
| `displayName` | string | ชื่อแสดง (1–200 ตัวอักษร) |
| `department` | string | ชื่อแผนกแบบ free text |
| `jobTitle` | string | ตำแหน่งงาน |
| `officeLocation` | string | ที่ตั้งสำนักงาน |
| `mobilePhone` | string | เบอร์โทรศัพท์มือถือ |

### Response

```json
{
  "success": true,
  "message": "Profile updated",
  "data": {
    "userId": "usr_xxx",
    "employeeId": "EMP001",
    "displayName": "สมชาย ใจดีมาก",
    "email": "somchai@ndc.co.th",
    "departmentId": "IT",
    "jobTitle": "Senior Developer",
    "officeLocation": "อาคาร B ชั้น 2",
    "appRoles": ["USER"],
    "roleVersion": "a1b2c3d4e5f6"
  }
}
```

### ตัวอย่างโค้ด (Next.js Server Action)

```typescript
'use server';
import { cookies } from 'next/headers';

export async function updateMyProfile(formData: {
  displayName?: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/profile/me`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'Update failed');
  }

  return (await res.json()).data;
}
```

---

## 2. Admin ดู Profile ของ User คนอื่น

ต้องการ `appRoles` ที่มี `ADMIN` หรือ `IT`

### Endpoint

```
GET {AUTH_CENTER_URL}/api/auth/consumer/users/{userId}/profile?appId={appId}
Authorization: Bearer {adminUserToken}
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "usr_xxx",
    "employeeId": "EMP001",
    "email": "somchai@ndc.co.th",
    "displayName": "สมชาย ใจดี",
    "department": "ฝ่ายไอที",
    "jobTitle": "นักพัฒนาซอฟต์แวร์",
    "officeLocation": "อาคาร A ชั้น 3",
    "mobilePhone": "081-234-5678"
  }
}
```

### ตัวอย่างโค้ด

```typescript
async function getUserProfile(adminToken: string, userId: string) {
  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/consumer/users/${userId}/profile?appId=${process.env.AUTH_CENTER_APP_ID}`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
      cache: 'no-store',
    }
  );
  if (!res.ok) throw new Error('Failed to fetch user profile');
  const { data } = await res.json();
  return data;
}
```

---

## 3. Admin แก้ไข Profile ของ User คนอื่น

ต้องการ `appRoles` ที่มี `ADMIN` หรือ `IT`

### Endpoint

```
PATCH {AUTH_CENTER_URL}/api/auth/consumer/users/{userId}/profile
Authorization: Bearer {adminUserToken}
Content-Type: application/json
```

### Request Body

> `appId` เป็น field **บังคับ** ในกรณีนี้ — ใช้ตรวจสอบสิทธิ์ Admin

```json
{
  "appId": "qms",
  "displayName": "สมชาย ใจดี (อัปเดต)",
  "jobTitle": "Lead Developer",
  "officeLocation": "อาคาร A ชั้น 4",
  "mobilePhone": "089-999-8888"
}
```

### Response

```json
{
  "success": true,
  "message": "Profile updated",
  "data": {
    "id": "usr_xxx",
    "displayName": "สมชาย ใจดี (อัปเดต)",
    "department": "ฝ่ายไอที",
    "jobTitle": "Lead Developer",
    "officeLocation": "อาคาร A ชั้น 4",
    "mobilePhone": "089-999-8888"
  }
}
```

### ตัวอย่างโค้ด

```typescript
async function adminUpdateUserProfile(
  adminToken: string,
  userId: string,
  updates: {
    displayName?: string;
    jobTitle?: string | null;
    officeLocation?: string | null;
    mobilePhone?: string | null;
  }
) {
  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/consumer/users/${userId}/profile`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appId: process.env.AUTH_CENTER_APP_ID,
        ...updates,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'Update failed');
  }

  return (await res.json()).data;
}
```

---

## 4. Pattern: GET แล้ว PATCH (Admin Edit Form)

```typescript
// ดึงข้อมูลก่อน → แสดง form → แก้ไข → บันทึก
async function editUserProfileFlow(adminToken: string, userId: string) {
  // 1. ดูข้อมูลปัจจุบัน
  const current = await getUserProfile(adminToken, userId);

  // 2. ... แสดง form ให้ Admin แก้ไข ...

  // 3. บันทึก
  const updated = await adminUpdateUserProfile(adminToken, userId, {
    displayName: current.displayName,
    jobTitle: 'New Title',
    officeLocation: current.officeLocation,
  });

  return updated;
}
```

---

## หมายเหตุ

- Profile ข้อมูลเป็น **shared** — การแก้ไขจากระบบใดจะเห็นในทุก Consumer App ที่ใช้ Auth Center
- ถ้าดึง Profile บ่อย ให้ cache ไว้ฝั่ง Consumer App และ invalidate เมื่อ `roleVersion` ใน JWT เปลี่ยน
- ผู้ใช้ที่มี `m365Linked: true` — `displayName` และ `email` อาจถูก sync จาก Entra ทับในบางกรณี (ขึ้นอยู่กับการตั้งค่า sync)
- field `department` ใน self-update เป็น free text — หากต้องการผูก User กับ Department code อย่างถูกต้องให้ใช้ Admin UI (ดู [07-admin-ui.md](07-admin-ui.md)) หรือ Admin API
