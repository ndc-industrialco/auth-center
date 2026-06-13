/**
 * scripts/reset-admin-password.ts
 *
 * Reset the local password for an existing user.
 *
 * Run:
 *   npm run seed:admin:reset-password
 *
 * Or:
 *   SEED_EMPLOYEE_ID=EMP001 SEED_PASSWORD=NewPassword123 npm run seed:admin:reset-password
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../app/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const BCRYPT_ROUNDS = 12;

function createDb() {
  const adapter = new PrismaPg(process.env.DATABASE_URL!);
  return new PrismaClient({ adapter });
}

async function prompt(rl: readline.Interface, question: string, fallback?: string): Promise<string> {
  if (fallback) return fallback;
  return (await rl.question(question)).trim();
}

async function main() {
  console.log('\n  Auth Center — Reset Admin Password\n');

  const rl = readline.createInterface({ input, output });

  const employeeId = await prompt(rl, '  Employee ID: ', process.env.SEED_EMPLOYEE_ID);
  if (!employeeId) { console.error('  ✗  Employee ID required.'); rl.close(); process.exit(1); }

  const password = await prompt(rl, '  New Password: ', process.env.SEED_PASSWORD);
  if (!password) { console.error('  ✗  Password is required.'); rl.close(); process.exit(1); }

  rl.close();

  const db = createDb();
  try {
    const user = await db.user.findUnique({ where: { employeeId } });
    if (!user) { console.error(`  ✗  User not found: ${employeeId}`); process.exit(1); }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await db.localCredential.upsert({
      where:  { userId: user.id },
      update: { passwordHash, failedAttempts: 0, lockedUntil: null, lastChangedAt: new Date() },
      create: { userId: user.id, passwordHash },
    });

    console.log(`\n  ✓  Password updated for ${employeeId}\n`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => { console.error('  ✗ ', err.message); process.exit(1); });
