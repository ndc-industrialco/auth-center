-- CreateEnum
CREATE TYPE "DirectorySyncEntityType" AS ENUM ('USER', 'DEPARTMENT', 'GROUP', 'GROUP_MEMBERS');

-- CreateEnum
CREATE TYPE "DirectorySyncDirection" AS ENUM ('PULL', 'PUSH');

-- CreateEnum
CREATE TYPE "DirectorySyncStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "directory_sync_logs" (
    "id" TEXT NOT NULL,
    "entityType" "DirectorySyncEntityType" NOT NULL,
    "entityId" TEXT,
    "direction" "DirectorySyncDirection" NOT NULL,
    "status" "DirectorySyncStatus" NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "summaryJson" JSONB,
    "errorMessage" TEXT,

    CONSTRAINT "directory_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "directory_sync_logs_entityType_idx" ON "directory_sync_logs"("entityType");

-- CreateIndex
CREATE INDEX "directory_sync_logs_entityId_idx" ON "directory_sync_logs"("entityId");

-- CreateIndex
CREATE INDEX "directory_sync_logs_direction_idx" ON "directory_sync_logs"("direction");

-- CreateIndex
CREATE INDEX "directory_sync_logs_status_idx" ON "directory_sync_logs"("status");

-- CreateIndex
CREATE INDEX "directory_sync_logs_requestedBy_idx" ON "directory_sync_logs"("requestedBy");

-- CreateIndex
CREATE INDEX "directory_sync_logs_requestedAt_idx" ON "directory_sync_logs"("requestedAt");
