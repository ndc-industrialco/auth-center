-- CreateEnum
CREATE TYPE "ConsumerAppSessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED', 'LOGGED_OUT');

-- CreateTable
CREATE TABLE "consumer_app_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appRegistrationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "employeeId" TEXT,
    "appRoles" TEXT[],
    "effectiveRole" TEXT NOT NULL,
    "status" "ConsumerAppSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "loginAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumer_app_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consumer_app_sessions_userId_idx" ON "consumer_app_sessions"("userId");

-- CreateIndex
CREATE INDEX "consumer_app_sessions_appRegistrationId_idx" ON "consumer_app_sessions"("appRegistrationId");

-- CreateIndex
CREATE INDEX "consumer_app_sessions_status_idx" ON "consumer_app_sessions"("status");

-- CreateIndex
CREATE INDEX "consumer_app_sessions_userId_status_idx" ON "consumer_app_sessions"("userId", "status");

-- CreateIndex
CREATE INDEX "consumer_app_sessions_appRegistrationId_status_idx" ON "consumer_app_sessions"("appRegistrationId", "status");

-- CreateIndex
CREATE INDEX "consumer_app_sessions_lastSeenAt_idx" ON "consumer_app_sessions"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_app_sessions_appRegistrationId_sessionId_key" ON "consumer_app_sessions"("appRegistrationId", "sessionId");

-- AddForeignKey
ALTER TABLE "consumer_app_sessions" ADD CONSTRAINT "consumer_app_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_app_sessions" ADD CONSTRAINT "consumer_app_sessions_appRegistrationId_fkey" FOREIGN KEY ("appRegistrationId") REFERENCES "app_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
