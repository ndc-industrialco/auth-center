-- Add departmentId to default_role_policies (reconcile drift)
ALTER TABLE "default_role_policies" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

DROP INDEX IF EXISTS "default_role_policies_appId_role_applyTo_key";

CREATE UNIQUE INDEX IF NOT EXISTS "default_role_policies_appId_role_applyTo_departmentId_key"
  ON "default_role_policies"("appId", "role", "applyTo", "departmentId");

CREATE INDEX IF NOT EXISTS "default_role_policies_departmentId_idx"
  ON "default_role_policies"("departmentId");
