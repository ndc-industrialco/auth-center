-- AlterEnum
ALTER TYPE "AdminAction" ADD VALUE 'APP_ROLES_UPDATED';

-- AlterTable
ALTER TABLE "app_registrations" ADD COLUMN     "availableRoles" TEXT[] DEFAULT ARRAY[]::TEXT[];
