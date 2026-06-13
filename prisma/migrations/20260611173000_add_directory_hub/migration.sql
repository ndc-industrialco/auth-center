ALTER TYPE "AdminAction" ADD VALUE IF NOT EXISTS 'DIRECTORY_USERS_SYNCED';
ALTER TYPE "AdminAction" ADD VALUE IF NOT EXISTS 'DIRECTORY_GROUPS_SYNCED';
ALTER TYPE "AdminAction" ADD VALUE IF NOT EXISTS 'DIRECTORY_DEPARTMENTS_REBUILT';
ALTER TYPE "AdminAction" ADD VALUE IF NOT EXISTS 'USER_PROFILE_SYNCED_TO_GRAPH';
ALTER TYPE "AdminAction" ADD VALUE IF NOT EXISTS 'GROUP_MEMBER_ADDED';
ALTER TYPE "AdminAction" ADD VALUE IF NOT EXISTS 'GROUP_MEMBER_REMOVED';

CREATE TABLE IF NOT EXISTS "departments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'GRAPH',
    "userCount" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "email_groups" (
    "id" TEXT NOT NULL,
    "entraGroupId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "mail" TEXT,
    "description" TEXT,
    "securityEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "groupTypes" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "email_group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT,
    "entraObjectId" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "memberType" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_group_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "departments_code_key" ON "departments"("code");
CREATE INDEX IF NOT EXISTS "departments_displayName_idx" ON "departments"("displayName");

CREATE UNIQUE INDEX IF NOT EXISTS "email_groups_entraGroupId_key" ON "email_groups"("entraGroupId");
CREATE INDEX IF NOT EXISTS "email_groups_displayName_idx" ON "email_groups"("displayName");
CREATE INDEX IF NOT EXISTS "email_groups_mail_idx" ON "email_groups"("mail");

CREATE UNIQUE INDEX IF NOT EXISTS "email_group_members_groupId_entraObjectId_key" ON "email_group_members"("groupId", "entraObjectId");
CREATE INDEX IF NOT EXISTS "email_group_members_groupId_idx" ON "email_group_members"("groupId");
CREATE INDEX IF NOT EXISTS "email_group_members_userId_idx" ON "email_group_members"("userId");
CREATE INDEX IF NOT EXISTS "email_group_members_email_idx" ON "email_group_members"("email");

INSERT INTO "departments" ("id", "code", "displayName", "source", "userCount", "createdAt", "updatedAt", "syncedAt")
SELECT
  CONCAT('dept_', md5(source_rows.code)),
  source_rows.code,
  source_rows.display_name,
  'GRAPH',
  COUNT(*),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT
    COALESCE("departmentId", UPPER("department")) AS code,
    COALESCE("department", "departmentId") AS display_name
  FROM "employee_profiles"
  WHERE COALESCE("departmentId", "department") IS NOT NULL
) AS source_rows
WHERE source_rows.code IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "departments" d
    WHERE d."code" = source_rows.code
  )
GROUP BY source_rows.code, source_rows.display_name;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employee_profiles_departmentId_fkey'
  ) THEN
    ALTER TABLE "employee_profiles"
    ADD CONSTRAINT "employee_profiles_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "departments"("code")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_group_members_groupId_fkey'
  ) THEN
    ALTER TABLE "email_group_members"
    ADD CONSTRAINT "email_group_members_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "email_groups"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_group_members_userId_fkey'
  ) THEN
    ALTER TABLE "email_group_members"
    ADD CONSTRAINT "email_group_members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
