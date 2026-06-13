-- AlterTable
ALTER TABLE "admin_audits" ADD COLUMN     "requestId" TEXT;

-- AlterTable
ALTER TABLE "login_audits" ADD COLUMN     "requestId" TEXT;
