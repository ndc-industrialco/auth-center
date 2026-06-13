-- CreateEnum
CREATE TYPE "IdentityType" AS ENUM ('ENTRA', 'LOCAL');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('ENTRA', 'LOCAL_PASSWORD', 'LOCAL_OTP');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LoginOutcome" AS ENUM ('SUCCESS', 'FAILED_CREDENTIALS', 'FAILED_RATE_LIMIT', 'FAILED_ACCOUNT_LOCKED', 'FAILED_NOT_FOUND', 'FAILED_ENTRA_ERROR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "m365Linked" BOOLEAN NOT NULL DEFAULT false,
    "canSendDelegatedMail" BOOLEAN NOT NULL DEFAULT false,
    "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "defaultAuthMethod" "AuthMethod" NOT NULL DEFAULT 'LOCAL_PASSWORD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT,
    "department" TEXT,
    "jobTitle" TEXT,
    "officeLocation" TEXT,
    "mobilePhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "IdentityType" NOT NULL,
    "providerAccountId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_identity_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entraObjectId" TEXT NOT NULL,
    "entraUpn" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedByMethod" TEXT NOT NULL,

    CONSTRAINT "external_identity_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "local_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_registrations" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "secretHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_grants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "role_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_grants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "grantedBy" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "permission_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "authMethod" "AuthMethod" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_audits" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "employeeId" TEXT,
    "authMethod" "AuthMethod" NOT NULL,
    "outcome" "LoginOutcome" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "failReason" TEXT,
    "sessionId" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeId_key" ON "users"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_employeeId_idx" ON "users"("employeeId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_employmentStatus_idx" ON "users"("employmentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_userId_key" ON "employee_profiles"("userId");

-- CreateIndex
CREATE INDEX "employee_profiles_departmentId_idx" ON "employee_profiles"("departmentId");

-- CreateIndex
CREATE INDEX "identity_accounts_userId_idx" ON "identity_accounts"("userId");

-- CreateIndex
CREATE INDEX "identity_accounts_type_idx" ON "identity_accounts"("type");

-- CreateIndex
CREATE UNIQUE INDEX "identity_accounts_userId_type_key" ON "identity_accounts"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "external_identity_links_entraObjectId_key" ON "external_identity_links"("entraObjectId");

-- CreateIndex
CREATE INDEX "external_identity_links_userId_idx" ON "external_identity_links"("userId");

-- CreateIndex
CREATE INDEX "external_identity_links_entraObjectId_idx" ON "external_identity_links"("entraObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "local_credentials_userId_key" ON "local_credentials"("userId");

-- CreateIndex
CREATE INDEX "local_credentials_userId_idx" ON "local_credentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "app_registrations_appId_key" ON "app_registrations"("appId");

-- CreateIndex
CREATE INDEX "app_registrations_appId_idx" ON "app_registrations"("appId");

-- CreateIndex
CREATE INDEX "role_grants_userId_idx" ON "role_grants"("userId");

-- CreateIndex
CREATE INDEX "role_grants_appId_idx" ON "role_grants"("appId");

-- CreateIndex
CREATE INDEX "role_grants_userId_appId_idx" ON "role_grants"("userId", "appId");

-- CreateIndex
CREATE UNIQUE INDEX "role_grants_userId_appId_role_key" ON "role_grants"("userId", "appId", "role");

-- CreateIndex
CREATE INDEX "permission_grants_userId_idx" ON "permission_grants"("userId");

-- CreateIndex
CREATE INDEX "permission_grants_appId_idx" ON "permission_grants"("appId");

-- CreateIndex
CREATE INDEX "permission_grants_userId_appId_idx" ON "permission_grants"("userId", "appId");

-- CreateIndex
CREATE UNIQUE INDEX "permission_grants_userId_appId_permission_key" ON "permission_grants"("userId", "appId", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sessionId_key" ON "user_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_sessionId_idx" ON "user_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "user_sessions_status_idx" ON "user_sessions"("status");

-- CreateIndex
CREATE INDEX "user_sessions_userId_status_idx" ON "user_sessions"("userId", "status");

-- CreateIndex
CREATE INDEX "login_audits_userId_idx" ON "login_audits"("userId");

-- CreateIndex
CREATE INDEX "login_audits_employeeId_idx" ON "login_audits"("employeeId");

-- CreateIndex
CREATE INDEX "login_audits_outcome_idx" ON "login_audits"("outcome");

-- CreateIndex
CREATE INDEX "login_audits_attemptedAt_idx" ON "login_audits"("attemptedAt");

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_accounts" ADD CONSTRAINT "identity_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_identity_links" ADD CONSTRAINT "external_identity_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_credentials" ADD CONSTRAINT "local_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_grants" ADD CONSTRAINT "role_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_grants" ADD CONSTRAINT "role_grants_appId_fkey" FOREIGN KEY ("appId") REFERENCES "app_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_grants" ADD CONSTRAINT "permission_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_grants" ADD CONSTRAINT "permission_grants_appId_fkey" FOREIGN KEY ("appId") REFERENCES "app_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_audits" ADD CONSTRAINT "login_audits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
