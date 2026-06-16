# 07 — Admin UI Guide

Admin UI คือหน้าจัดการระบบ Auth Center ที่ path `/admin/` ใช้สำหรับ Admin จัดการ User, App, Role, Department และ Session โดยไม่ต้องแก้ไข database โดยตรง

---

## เงื่อนไขการเข้าถึง

ต้องมี **ADMIN role บน auth-center app** เท่านั้น — ไม่ใช่ ADMIN ของ Consumer App ใดๆ

หากเข้า `/admin/` แล้วไม่มีสิทธิ์ → ระบบ redirect ไป `/auth/unauthorized`

---

## หน้าหลักใน Admin UI

| Path | ทำอะไร |
|------|--------|
| `/admin/users` | ค้นหา User, คลิกเพื่อดูรายละเอียด |
| `/admin/users/[userId]` | จัดการ User แบบละเอียด |
| `/admin/apps` | รายการ App ที่ลงทะเบียน, ลงทะเบียน App ใหม่ |
| `/admin/apps/[appId]` | จัดการ Role และ User Roster ต่อ App |
| `/admin/role-grants` | มุมมองรวม Role Grants ทุก App |
| `/admin/departments` | จัดการแผนก (Department master data) |
| `/admin/consumer-sessions` | ดู Active Session ของ Consumer App ทั้งหมด |

---

## /admin/users — ค้นหาและจัดการ User

- ค้นหาได้ด้วย: employeeId, ชื่อ, อีเมล
- คลิก "Manage" ที่แต่ละ User → ไป `/admin/users/[userId]`

### /admin/users/[userId] — หน้าจัดการ User แบบละเอียด

หน้านี้รวมทุกอย่างที่เกี่ยวกับ User คนเดียวไว้ในที่เดียว:

**Identity Management:**
- **Entra Link/Unlink** — เชื่อมหรือยกเลิกการเชื่อม Microsoft 365 account (มี confirm dialog)
- **Local Login Enable/Disable** — เปิด/ปิดการ Login ด้วย password แบบ local (มี confirm dialog)
- **Set/Reset Password** — ตั้งรหัสผ่านใหม่ผ่าน modal

**Profile Edit:** แก้ไข displayName, jobTitle, officeLocation, mobilePhone, department

**Role Grants:** ดูและจัดการ Role ที่ User นี้มีในแต่ละ App

**Active Sessions:** รายการ session ที่กำลัง active — ยกเลิกได้ทีละ session หรือ "Revoke All" (มี confirm dialog)

**Login Audit:** 10 รายการล่าสุดของ login history (append-only, ไม่สามารถแก้ไขหรือลบได้)

---

## /admin/apps — ลงทะเบียนและดู App

- แสดงรายการ App ทั้งหมดพร้อม Grant counts (จำนวน User ที่มี role)
- ปุ่ม **"Register App"** — ลงทะเบียน Consumer App ใหม่
- คลิกชื่อ App → ไป `/admin/apps/[appId]`

---

## /admin/apps/[appId] — จัดการ Role ต่อ App

หน้านี้สำคัญที่สุดสำหรับ Admin ที่ Onboard Consumer App ใหม่

### Stats ด้านบน

| ตัวเลข | ความหมาย |
|--------|---------|
| Total Users | จำนวน User ทั้งหมดใน Auth Center |
| Have Access | มี role อย่างน้อย 1 role ใน App นี้ |
| No Access | ยังไม่มี role ใน App นี้ |
| Defined Roles | จำนวน role ที่กำหนดสำหรับ App นี้ |

---

### Available Roles Editor — กำหนด Role สำหรับ App

**วิธีใช้ (step-by-step):**

1. มองหา section **"Available Roles"** ใต้ stats
2. พิมพ์ชื่อ role ใน tag input เช่น `QMS_USER` → กด **Enter**
3. Role ใหม่ปรากฏเป็น tag สีฟ้า — ระบบแปลงเป็นตัวพิมพ์ใหญ่ให้อัตโนมัติ
4. คลิก **×** ที่ tag เพื่อลบ role
5. การเปลี่ยนแปลงบันทึกทันที (**auto-save**)

**ตัวอย่าง Role สำหรับ QMS App:**

```
QMS_USER    — ผู้ใช้ทั่วไป สามารถดูและสร้างเอกสาร
QMS_IT      — IT Admin จัดการระบบและ user
QMS_MR      — Management Representative อนุมัติเอกสาร
```

> Role names ควรใช้ format `{APP}_{FUNCTION}` และตัวพิมพ์ใหญ่เสมอ

---

### User Roster — จัดการ Role ทีละ User

User Roster แสดง User ทุกคนใน Auth Center พร้อม dropdown สำหรับเลือก role ใน App นี้

**วิธีใช้:**

1. ใช้ช่อง **Search** เพื่อค้นหา User ด้วยชื่อ, employeeId, หรือแผนก
2. แต่ละ User มี dropdown แสดง role ปัจจุบัน (หรือ "No Access" ถ้าไม่มี role)
3. เปลี่ยน dropdown → ระบบบันทึกทันที (**optimistic UI** — เปลี่ยนทันทีก่อนรอ response)
4. ถ้า save ไม่สำเร็จ → dropdown กลับค่าเดิมอัตโนมัติ

**Dropdown options:**
- `No Access` — ถอน role ทั้งหมดออก (User ไม่มีสิทธิ์ใน App นี้)
- ชื่อ role ที่กำหนดไว้ใน Available Roles เช่น `QMS_USER`, `QMS_IT`, `QMS_MR`

---

### Bulk Assign — กำหนด Role ทีเดียวทั้งหมด

ใช้เมื่อต้องการกำหนด role เดียวกันให้ User ทุกคนพร้อมกัน เช่น ตอน Onboard App ใหม่

**วิธีใช้ (step-by-step):**

1. มองหา section **"Bulk Assign"** ด้านบนของ User Roster
2. เลือก role จาก dropdown เช่น `QMS_USER`
3. คลิปปุ่ม **"Apply to all N users"** (N = จำนวน User ทั้งหมด)
4. **Confirm dialog** ปรากฏ — แสดงจำนวน User ที่จะได้รับผลกระทบ
5. คลิก **"Confirm"** เพื่อยืนยัน → ระบบ set role นั้นให้ User ทุกคนพร้อมกัน

> Bulk Assign **เขียนทับ** role เดิมของทุกคน — ใช้ด้วยความระมัดระวัง

---

## /admin/role-grants — Global View

แสดง Role Grants ทั้งหมดข้ามทุก App — ใช้สำหรับ:
- ตรวจสอบว่า User คนใดมี role อะไรในระบบใดบ้าง
- Audit การได้รับสิทธิ์

---

## /admin/departments — จัดการ Department

- สร้างแผนกใหม่: ระบุ code (ตัวพิมพ์ใหญ่) และชื่อแผนก
- แก้ไขชื่อแผนก (code เปลี่ยนไม่ได้)
- ลบแผนกที่ไม่มี User อยู่

> Department เป็น master data กลาง — กระทบทุก Consumer App ดู [04-department.md](04-department.md)

---

## /admin/consumer-sessions — Active Session Registry

แสดง session ที่ Consumer App รายงานไว้ผ่าน Internal API กรองได้ด้วย:
- App ที่ต้องการดู
- Status (active / expired / revoked)
- ค้นหา User

ใช้สำหรับ debug ปัญหา session หรือตรวจสอบว่า User กำลัง active อยู่ใน App ใด

---

## Use Cases หลัก

### Onboard Consumer App ใหม่

1. `/admin/apps` → คลิก "Register App" → กรอก appId และชื่อ
2. ไป `/admin/apps/[appId]` → กำหนด Available Roles (เช่น `QMS_USER`, `QMS_IT`, `QMS_MR`)
3. ใช้ Bulk Assign ตั้ง role default ให้ทุกคน (เช่น `QMS_USER`)
4. ใช้ User Roster ปรับ role เฉพาะบุคคล (เช่น เปลี่ยน IT team เป็น `QMS_IT`)

### เพิ่ม/เปลี่ยน Role ทีละคน

1. `/admin/apps/[appId]` → ค้นหา User ใน User Roster
2. เปลี่ยน dropdown เป็น role ที่ต้องการ → บันทึกอัตโนมัติ

### Reset Password พนักงาน

1. `/admin/users` → ค้นหาพนักงาน → คลิก "Manage"
2. ใน Identity Management → คลิก "Set Password" → ใส่รหัสผ่านใหม่ → ยืนยัน

### Revoke Session ฉุกเฉิน

1. `/admin/users/[userId]` → เลื่อนลงส่วน Active Sessions
2. คลิก "Revoke All" → ยืนยัน → session ทุกตัวของ User นั้นถูก revoke ทันที

---

## Best Practices สำหรับ Admin

- **Role naming:** ใช้ format `{APP}_{FUNCTION}` เสมอ เช่น `QMS_USER`, `QMS_IT` — ไม่ใช้ generic เช่น `ADMIN` ยกเว้น auth-center app เอง
- **Bulk Assign:** ใช้เป็นจุดเริ่มต้นเท่านั้น แล้วค่อยปรับ User Roster ทีละคนตาม role จริง
- **ก่อนลบ Department:** ตรวจสอบ userCount = 0 ก่อนเสมอ — ย้าย User ออกด้วย `/admin/users/[userId]` profile edit
- **Login Audit:** ตรวจสอบที่ `/admin/users/[userId]` ถ้า User แจ้งปัญหา login — ดู 10 รายการล่าสุด
- **Entra Unlink:** ทำเมื่อพนักงานลาออกหรือเปลี่ยน M365 account เท่านั้น — หลัง unlink ผู้ใช้ต้อง login ด้วย local password แทน
