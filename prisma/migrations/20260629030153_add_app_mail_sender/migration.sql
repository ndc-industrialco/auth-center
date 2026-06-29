-- AlterTable
ALTER TABLE "app_registrations" ADD COLUMN     "mailSenderUserId" TEXT;

-- AddForeignKey
ALTER TABLE "app_registrations" ADD CONSTRAINT "app_registrations_mailSenderUserId_fkey" FOREIGN KEY ("mailSenderUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
