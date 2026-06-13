-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminAction" ADD VALUE 'SESSIONS_REVOKED_ALL';
ALTER TYPE "AdminAction" ADD VALUE 'CREDENTIAL_CREATED';
ALTER TYPE "AdminAction" ADD VALUE 'CREDENTIAL_RESET';
ALTER TYPE "AdminAction" ADD VALUE 'LOCAL_LOGIN_ENABLED';
ALTER TYPE "AdminAction" ADD VALUE 'LOCAL_LOGIN_DISABLED';
ALTER TYPE "AdminAction" ADD VALUE 'USER_DEACTIVATED';
ALTER TYPE "AdminAction" ADD VALUE 'USER_REACTIVATED';
