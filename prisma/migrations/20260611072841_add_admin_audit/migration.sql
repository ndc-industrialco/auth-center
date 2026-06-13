-- CreateEnum
CREATE TYPE "AdminAction" AS ENUM ('APP_REGISTERED', 'APP_DEACTIVATED', 'ROLE_GRANTED', 'ROLE_REVOKED', 'PERMISSION_GRANTED', 'PERMISSION_REVOKED', 'ENTRA_LINKED', 'ENTRA_UNLINKED', 'SESSION_REVOKED_BY_ADMIN');

-- CreateTable
CREATE TABLE "admin_audits" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AdminAction" NOT NULL,
    "targetUserId" TEXT,
    "targetAppId" TEXT,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "detail" TEXT,
    "ipAddress" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_audits_actorId_idx" ON "admin_audits"("actorId");

-- CreateIndex
CREATE INDEX "admin_audits_targetUserId_idx" ON "admin_audits"("targetUserId");

-- CreateIndex
CREATE INDEX "admin_audits_action_idx" ON "admin_audits"("action");

-- CreateIndex
CREATE INDEX "admin_audits_performedAt_idx" ON "admin_audits"("performedAt");
