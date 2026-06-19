import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });
  const result = await db.user.updateMany({
    where: { m365Linked: true, canSendDelegatedMail: false },
    data: { canSendDelegatedMail: true },
  });
  console.log(`Updated ${result.count} user(s) — canSendDelegatedMail = true`);
  await db.$disconnect();
}

main().catch(console.error);
