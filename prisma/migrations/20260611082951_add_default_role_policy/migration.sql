-- CreateEnum
CREATE TYPE "DefaultRolePolicyApplyTo" AS ENUM ('ALL', 'ENTRA_ONLY', 'LOCAL_ONLY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminAction" ADD VALUE 'DEFAULT_GRANT_POLICY_CREATED';
ALTER TYPE "AdminAction" ADD VALUE 'DEFAULT_GRANT_POLICY_DEACTIVATED';

-- CreateTable
CREATE TABLE "default_role_policies" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "applyTo" "DefaultRolePolicyApplyTo" NOT NULL DEFAULT 'ALL',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "default_role_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "default_role_policies_appId_idx" ON "default_role_policies"("appId");

-- CreateIndex
CREATE INDEX "default_role_policies_isActive_idx" ON "default_role_policies"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "default_role_policies_appId_role_applyTo_key" ON "default_role_policies"("appId", "role", "applyTo");

-- AddForeignKey
ALTER TABLE "default_role_policies" ADD CONSTRAINT "default_role_policies_appId_fkey" FOREIGN KEY ("appId") REFERENCES "app_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
