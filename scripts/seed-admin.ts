/**
 * scripts/seed-admin.ts
 *
 * Bootstrap the first ADMIN user in Auth Center.
 *
 * Run:
 *   npm run seed:admin
 *
 * Or with inline args (overrides env vars):
 *   SEED_EMPLOYEE_ID=EMP001 SEED_PASSWORD=Password123 SEED_DISPLAY_NAME="Somchai K." npm run seed:admin
 *
 * What this does (idempotent — safe to run multiple times):
 *   1. Register auth-center as an AppRegistration (if not exists)
 *   2. Create the admin User by employeeId (if not exists)
 *   3. Create IdentityAccount LOCAL + LocalCredential (if not exists)
 *   4. Grant ADMIN role in auth-center app (if not exists)
 *
 * Nothing is deleted or overwritten on re-run.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../app/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// ── Config ────────────────────────────────────────────────────────────────────

const AUTH_CENTER_APP_ID = 'auth-center';
const ADMIN_ROLE = 'ADMIN';
const BCRYPT_ROUNDS = 12;

// ── DB ────────────────────────────────────────────────────────────────────────

function createDb() {
  const adapter = new PrismaPg(process.env.DATABASE_URL!);
  return new PrismaClient({ adapter });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(icon: string, msg: string) {
  console.log(`  ${icon}  ${msg}`);
}

async function prompt(rl: readline.Interface, question: string, fallback?: string): Promise<string> {
  if (fallback) return fallback;
  const answer = await rl.question(question);
  return answer.trim();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n  ╔══════════════════════════════════╗');
  console.log('  ║   Auth Center — Seed Admin      ║');
  console.log('  ╚══════════════════════════════════╝\n');

  const rl = readline.createInterface({ input, output });

  // Collect input (env vars take precedence over prompts)
  const employeeId = await prompt(
    rl,
    '  Employee ID (e.g. EMP001): ',
    process.env.SEED_EMPLOYEE_ID
  );
  if (!employeeId) {
    console.error('  ✗  Employee ID is required.\n');
    rl.close();
    process.exit(1);
  }

  const password = await prompt(
    rl,
    '  Password: ',
    process.env.SEED_PASSWORD
  );
  if (!password) {
    console.error('  ✗  Password is required.\n');
    rl.close();
    process.exit(1);
  }

  const displayName = await prompt(
    rl,
    '  Display Name (optional, press Enter to skip): ',
    process.env.SEED_DISPLAY_NAME
  );

  rl.close();

  console.log();
  console.log(`  Employee ID  : ${employeeId}`);
  console.log(`  Display Name : ${displayName || '(not set)'}`);
  console.log(`  App          : ${AUTH_CENTER_APP_ID}`);
  console.log(`  Role         : ${ADMIN_ROLE}`);
  console.log();

  const db = createDb();

  try {
    // 1. AppRegistration for auth-center ──────────────────────────────────────
    let app = await db.appRegistration.findUnique({ where: { appId: AUTH_CENTER_APP_ID } });
    if (!app) {
      app = await db.appRegistration.create({
        data: {
          appId:       AUTH_CENTER_APP_ID,
          displayName: 'Auth Center',
          description: 'Auth Center admin application',
          isActive:    true,
        },
      });
      log('✓', `Created AppRegistration: ${AUTH_CENTER_APP_ID}`);
    } else {
      log('·', `AppRegistration already exists: ${AUTH_CENTER_APP_ID}`);
    }

    // 2. User ──────────────────────────────────────────────────────────────────
    let user = await db.user.findUnique({ where: { employeeId } });
    if (!user) {
      user = await db.user.create({
        data: {
          employeeId,
          displayName:      displayName || null,
          employmentStatus: 'ACTIVE',
          defaultAuthMethod: 'LOCAL_PASSWORD',
          m365Linked:        false,
          canSendDelegatedMail: false,
        },
      });
      log('✓', `Created User: ${employeeId} (id: ${user.id})`);
    } else {
      log('·', `User already exists: ${employeeId} (id: ${user.id})`);
    }

    // 3a. IdentityAccount LOCAL ────────────────────────────────────────────────
    const identityAccount = await db.identityAccount.findFirst({
      where: { userId: user.id, type: 'LOCAL' },
    });
    if (!identityAccount) {
      await db.identityAccount.create({
        data: { userId: user.id, type: 'LOCAL', providerAccountId: user.id, isActive: true },
      });
      log('✓', 'Created IdentityAccount LOCAL');
    } else {
      log('·', 'IdentityAccount LOCAL already exists');
    }

    // 3b. LocalCredential ─────────────────────────────────────────────────────
    const existingCred = await db.localCredential.findUnique({ where: { userId: user.id } });
    if (!existingCred) {
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await db.localCredential.create({
        data: { userId: user.id, passwordHash },
      });
      log('✓', 'Created LocalCredential (password hashed)');
    } else {
      log('·', 'LocalCredential already exists — password NOT changed');
      log('·', '  (run "npm run seed:admin:reset-password" to reset)');
    }

    // 4. RoleGrant ADMIN ───────────────────────────────────────────────────────
    const existingGrant = await db.roleGrant.findFirst({
      where: { userId: user.id, appId: app.id, role: ADMIN_ROLE, isActive: true },
    });
    if (!existingGrant) {
      await db.roleGrant.create({
        data: {
          userId:    user.id,
          appId:     app.id,
          role:      ADMIN_ROLE,
          grantedBy: 'SEED_SCRIPT',
          isActive:  true,
        },
      });
      log('✓', `Granted role: ${ADMIN_ROLE} in ${AUTH_CENTER_APP_ID}`);
    } else {
      log('·', `Role grant already exists: ${ADMIN_ROLE} in ${AUTH_CENTER_APP_ID}`);
    }

    console.log();
    console.log('  ══════════════════════════════════════');
    console.log('  ✓  Admin bootstrap complete.');
    console.log();
    console.log('  Sign in at:  http://localhost:3001/auth/login');
    console.log(`  Employee ID: ${employeeId}`);
    console.log('  Password:    (as entered above)');
    console.log('  ══════════════════════════════════════\n');

  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error('\n  ✗  Seed failed:', err.message);
  process.exit(1);
});
