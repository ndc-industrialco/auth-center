# Auth Center Consumer Integration

เอกสารหลักสำหรับการเชื่อม consumer app กับ `Auth Center` อยู่ที่:

- [AUTH-CENTER-INTEGRATION-MANUAL.md](/d:/NDC_042/NextJS/Auth-Center/AUTH-CENTER-INTEGRATION-MANUAL.md)
- [manual/01-step-by-step-connect-auth-center.md](/d:/NDC_042/NextJS/Auth-Center/manual/01-step-by-step-connect-auth-center.md)

สรุปสั้น:

- consumer app พา user ไป login ที่ `Auth Center`
- `Auth Center` ออก token สำหรับ app เป้าหมาย
- consumer app verify token ด้วย `JWKS`
- consumer app ใช้ `appRoles` ทำ authorization ของตัวเอง

ข้อสำคัญ:

- ไม่แชร์ `AUTH_SECRET` ระหว่างระบบ
- private key อยู่เฉพาะ `Auth Center`
- consumer app ใช้ public keys จาก `JWKS`
