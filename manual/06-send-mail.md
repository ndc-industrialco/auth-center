# 06 — ส่งอีเมลผ่าน Auth Center (Delegated Mail)

Auth Center ให้บริการส่งอีเมล **ในนามของผู้ใช้** ผ่าน Microsoft 365 Delegated Permission — Consumer App ไม่ต้องมี Mail Server เป็นของตัวเอง

---

## เงื่อนไขที่ต้องตรวจสอบก่อนส่ง

| เงื่อนไข | วิธีตรวจสอบจาก JWT |
|---------|-------------------|
| ผู้ใช้มีสิทธิ์ส่งเมล | `canSendDelegatedMail === true` |
| Login ด้วย M365 เท่านั้น | `authMethod === "ENTRA"` |
| บัญชี M365 เชื่อมต่อแล้ว | `m365Linked === true` |

> **สำคัญ:** `canSendDelegatedMail` จะเป็น `false` **เสมอ** สำหรับ `LOCAL_PASSWORD` และ `LOCAL_OTP`
> Auth Center จะ reject อยู่แล้ว แต่ Consumer App ควรตรวจสอบก่อนแสดง UI เพื่อ UX ที่ดีกว่า

---

## Endpoint

```
POST {AUTH_CENTER_URL}/api/auth/mail/send
Authorization: Bearer {userToken}
Content-Type: application/json
```

### Request Body

```json
{
  "toEmail": "recipient@ndc.co.th",
  "toName": "ชื่อผู้รับ",
  "subject": "หัวข้ออีเมล",
  "htmlBody": "<p>เนื้อหาอีเมลในรูปแบบ HTML</p>"
}
```

### ตาราง Field

| Field | จำเป็น | คำอธิบาย |
|-------|--------|---------|
| `toEmail` | ✅ | อีเมลผู้รับ — ต้องเป็น format ที่ถูกต้อง |
| `toName` | — | ชื่อผู้รับ (ไม่บังคับ) |
| `subject` | ✅ | หัวข้ออีเมล (1–200 ตัวอักษร) |
| `htmlBody` | ✅ | เนื้อหาอีเมล HTML (สูงสุด 50,000 ตัวอักษร) |

### Response (สำเร็จ)

```json
{
  "success": true,
  "message": "Mail sent"
}
```

### Error ที่อาจพบ

| HTTP Status | Error Code | สาเหตุ |
|-------------|------------|--------|
| 401 | UNAUTHORIZED | ไม่มี Token หรือ Token ไม่ถูกต้อง |
| 403 | FORBIDDEN | `canSendDelegatedMail` เป็น `false` |
| 422 | VALIDATION_ERROR | request body ไม่ถูกต้อง (เช่น email format ผิด) |

---

## Pattern: ตรวจสอบสิทธิ์ก่อนแสดง UI

```typescript
import { verifyToken, AuthCenterClaims } from '@/lib/authCenter';

// ตรวจสอบว่า user คนนี้ส่งเมลได้หรือไม่
function canSendMail(claims: AuthCenterClaims): boolean {
  return (
    claims.canSendDelegatedMail === true &&
    claims.authMethod === 'ENTRA' &&
    claims.m365Linked === true
  );
}

// ใช้ใน Server Component
export default async function SendMailButton() {
  const token = /* ดึงจาก cookie */;
  const claims = await verifyToken(token);

  if (!canSendMail(claims)) {
    return <p>บัญชีนี้ไม่สามารถส่งอีเมลได้ กรุณาเข้าสู่ระบบด้วยบัญชี Microsoft 365</p>;
  }

  return <button>ส่งอีเมล</button>;
}
```

---

## ตัวอย่างโค้ด: ฟังก์ชันส่งเมล

```typescript
interface SendMailOptions {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlBody: string;
}

async function sendMailAsUser(
  token: string,
  options: SendMailOptions
): Promise<void> {
  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/mail/send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'Send mail failed');
  }
}
```

---

## ตัวอย่างโค้ด: Server Action ใน Next.js

```typescript
'use server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/authCenter';

export async function sendNotificationEmail(
  recipientEmail: string,
  recipientName: string,
  subject: string,
  bodyContent: string
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) throw new Error('กรุณาเข้าสู่ระบบก่อน');

  // ตรวจสิทธิ์ก่อนส่ง
  const claims = await verifyToken(token);
  if (!claims.canSendDelegatedMail) {
    throw new Error('บัญชีนี้ไม่สามารถส่งอีเมลได้ กรุณาใช้บัญชี Microsoft 365');
  }

  const htmlBody = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2>${subject}</h2>
      <div>${bodyContent}</div>
      <hr style="margin: 20px 0;" />
      <small style="color: #888;">
        ส่งโดย: ${claims.employeeId} ผ่านระบบ NDC
      </small>
    </div>
  `;

  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/mail/send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toEmail: recipientEmail,
        toName: recipientName,
        subject,
        htmlBody,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'ส่งอีเมลไม่สำเร็จ');
  }
}
```

---

## Pattern: ดึงรายชื่อผู้รับก่อนส่ง

ใช้ `app-members` endpoint เพื่อให้ผู้ใช้เลือกผู้รับ (ดู [03-user-management.md](03-user-management.md)):

```typescript
async function getMailableMembers(token: string) {
  const res = await fetch(
    `${process.env.AUTH_CENTER_URL}/api/auth/consumer/app-members?appId=${process.env.AUTH_CENTER_APP_ID}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const { data } = await res.json();

  // กรองเฉพาะคนที่มี email (สามารถส่งเมลได้)
  return (data as { id: string; displayName: string | null; email: string | null; m365Linked: boolean }[])
    .filter((u) => u.email !== null);
}
```

ขั้นตอนการใช้งาน:
1. เรียก `getMailableMembers()` เพื่อแสดง dropdown/search รายชื่อผู้รับ
2. ผู้ใช้เลือกผู้รับ กรอก subject และ body
3. เรียก `sendNotificationEmail()` ใน Server Action

---

## หมายเหตุ

- อีเมลถูกส่งในนาม **ผู้ใช้ที่ Login** — ผู้รับจะเห็น sender เป็นอีเมล M365 ของพนักงานคนนั้น
- Auth Center เก็บ audit ว่าใครส่งเมื่อไหร่ แต่**ไม่เก็บเนื้อหา** อีเมล
- `htmlBody` สูงสุด 50,000 ตัวอักษร — สำหรับอีเมลขนาดใหญ่ให้แนบไฟล์แทน
- หากต้องการส่งเมลแบบ **system notification** ที่ไม่ผูกกับ User ให้ติดต่อ Auth Center Admin เพื่อใช้ Service Account
