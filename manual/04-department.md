# 04 — จัดการแผนก (Department Management)

Department ใน Auth Center เป็น **master data กลาง** — ทุก Consumer App ใช้ข้อมูลชุดเดียวกัน การสร้าง/แก้ไข/ลบจาก Consumer App ใดจะกระทบทุก App ที่ใช้ Auth Center

Consumer API ใช้ **JWT ของ User ที่ Login อยู่** — Auth Center ตรวจ `appRoles` ใน JWT โดยตรง ไม่ต้องใช้ App Secret

| Operation | สิทธิ์ที่ต้องการ |
|-----------|----------------|
| GET รายการแผนก | ผู้ใช้ที่ Login แล้วทุกคน |
| POST / PATCH / DELETE | appRoles ต้องมี `ADMIN` หรือ `IT` |
| GET สมาชิกในแผนก | appRoles ต้องมี `ADMIN` หรือ `IT` |

---

## 1. ดูรายชื่อแผนกทั้งหมด

### Endpoint

```
GET {AUTH_CENTER_URL}/api/auth/consumer/departments?appId={appId}
Authorization: Bearer {token}
```

### Response

```json
{
  "success": true,
  "data": [
    { "code": "IT",   "displayName": "ฝ่ายไอที",           "userCount": 5  },
    { "code": "QC",   "displayName": "ฝ่ายควบคุมคุณภาพ",   "userCount": 12 },
    { "code": "PROD", "displayName": "ฝ่ายผลิต",           "userCount": 30 },
    { "code": "HR",   "displayName": "ฝ่ายทรัพยากรบุคคล",  "userCount": 8  }
  ]
}
```

### ตัวอย่างโค้ด

```typescript
async function getDepartments(token: string) {
  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/consumer/departments?appId=${process.env.AUTH_CENTER_APP_ID}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }
  );
  if (!res.ok) throw new Error('Failed to fetch departments');
  const { data } = await res.json();
  return data as { code: string; displayName: string; userCount: number }[];
}
```

---

## 2. สร้างแผนกใหม่

ต้องการ `appRoles` ที่มี `ADMIN` หรือ `IT`

### Endpoint

```
POST {AUTH_CENTER_URL}/api/auth/consumer/departments
Authorization: Bearer {adminUserToken}
Content-Type: application/json
```

### Request Body

```json
{
  "appId": "qms",
  "code": "PROD",
  "displayName": "ฝ่ายผลิต"
}
```

| Field | จำเป็น | คำอธิบาย |
|-------|--------|---------|
| `appId` | ✅ | App ID ของ Consumer App |
| `code` | ✅ | รหัสแผนก — ตัวพิมพ์ใหญ่, ไม่มีช่องว่าง (ระบบแปลงให้อัตโนมัติ) เช่น `IT`, `QC`, `PROD` |
| `displayName` | ✅ | ชื่อแผนกที่แสดงผล |

### Response

```json
{
  "success": true,
  "data": {
    "code": "PROD",
    "displayName": "ฝ่ายผลิต",
    "userCount": 0
  }
}
```

### ตัวอย่างโค้ด

```typescript
async function createDepartment(
  adminToken: string,
  code: string,
  displayName: string
) {
  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/consumer/departments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appId: process.env.AUTH_CENTER_APP_ID,
        code,
        displayName,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'Create department failed');
  }
  return (await res.json()).data;
}
```

---

## 3. แก้ไขชื่อแผนก

ต้องการ `appRoles` ที่มี `ADMIN` หรือ `IT`

> `code` ของแผนก **เปลี่ยนไม่ได้** — เปลี่ยนได้เฉพาะ `displayName`

### Endpoint

```
PATCH {AUTH_CENTER_URL}/api/auth/consumer/departments
Authorization: Bearer {adminUserToken}
Content-Type: application/json
```

### Request Body

```json
{
  "appId": "qms",
  "code": "PROD",
  "displayName": "ฝ่ายผลิตและบรรจุภัณฑ์"
}
```

### ตัวอย่างโค้ด

```typescript
async function updateDepartment(
  adminToken: string,
  code: string,
  displayName: string
) {
  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/consumer/departments`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appId: process.env.AUTH_CENTER_APP_ID,
        code,
        displayName,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'Update department failed');
  }
  return (await res.json()).data;
}
```

---

## 4. ลบแผนก

ต้องการ `appRoles` ที่มี `ADMIN` หรือ `IT`

> **เงื่อนไข:** ลบได้เฉพาะแผนกที่ `userCount = 0` เท่านั้น — ต้องย้าย User ออกก่อน

### Endpoint

```
DELETE {AUTH_CENTER_URL}/api/auth/consumer/departments?appId={appId}&code={code}
Authorization: Bearer {adminUserToken}
```

### ตัวอย่าง

```bash
curl -X DELETE \
  "${AUTH_CENTER_URL}/api/auth/consumer/departments?appId=qms&code=OLD_DEPT" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

### ตัวอย่างโค้ด

```typescript
async function deleteDepartment(adminToken: string, code: string) {
  const params = new URLSearchParams({
    appId: process.env.AUTH_CENTER_APP_ID!,
    code,
  });
  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/consumer/departments?${params}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'Delete department failed');
  }
}
```

---

## 5. ดูสมาชิกในแผนก

ต้องการ `appRoles` ที่มี `ADMIN` หรือ `IT`

### Endpoint

```
GET {AUTH_CENTER_URL}/api/auth/consumer/departments/{code}/members?appId={appId}
Authorization: Bearer {adminUserToken}
```

### ตัวอย่าง URL

```
GET {AUTH_CENTER_URL}/api/auth/consumer/departments/IT/members?appId=qms
```

### Response

```json
{
  "success": true,
  "data": {
    "department": {
      "code": "IT",
      "displayName": "ฝ่ายไอที",
      "userCount": 5
    },
    "members": [
      {
        "id": "usr_xxx",
        "employeeId": "EMP001",
        "email": "somchai@ndc.co.th",
        "displayName": "สมชาย ใจดี",
        "jobTitle": "นักพัฒนาซอฟต์แวร์",
        "officeLocation": "อาคาร A ชั้น 3",
        "m365Linked": true,
        "roles": ["USER", "ADMIN"]
      }
    ],
    "source": "auth_center"
  }
}
```

### ตัวอย่างโค้ด

```typescript
async function getDepartmentMembers(adminToken: string, deptCode: string) {
  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/consumer/departments/${deptCode}/members?appId=${process.env.AUTH_CENTER_APP_ID}`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
      cache: 'no-store',
    }
  );
  if (!res.ok) throw new Error('Failed to fetch department members');
  const { data } = await res.json();
  return data as {
    department: { code: string; displayName: string; userCount: number } | null;
    members: {
      id: string;
      employeeId: string;
      email: string | null;
      displayName: string | null;
      jobTitle: string | null;
      officeLocation: string | null;
      m365Linked: boolean;
      roles: string[];
    }[];
    source: string;
  };
}
```

---

## หมายเหตุ

- `code` ของแผนกใช้ **ตัวพิมพ์ใหญ่เสมอ** — `IT` ไม่ใช่ `it` (ระบบแปลงให้อัตโนมัติตอนสร้าง)
- `code` เป็น **immutable** — ไม่สามารถเปลี่ยนได้หลังสร้าง หากต้องเปลี่ยน ต้องสร้าง Department ใหม่ แล้วย้าย User
- Department เป็น **shared master data** — การสร้าง/แก้ไข/ลบจะกระทบทุก Consumer App ที่ใช้ Auth Center
- ก่อนลบแผนก ต้องแก้ไข Profile ของ User แต่ละคนให้ออกจากแผนกนั้นก่อน (ดู [05-profile.md](05-profile.md))
