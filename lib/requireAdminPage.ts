import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const AUTH_CENTER_APP_ID = 'auth-center';
const ADMIN_ROLE = 'ADMIN';

/**
 * Server-side gate for admin UI pages.
 * Verifies Auth.js session AND ADMIN role grant in the auth-center app.
 * Redirects to /auth/login or /auth/unauthorized as appropriate.
 *
 * Usage: await requireAdminPage() at the top of any admin Server Component or layout.
 */
export async function requireAdminPage(): Promise<void> {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login?callbackUrl=/admin');
  }

  const entraSession = session as typeof session & { employeeId?: string };
  const employeeId = entraSession.employeeId ?? session.user.email?.split('@')[0];

  if (!employeeId) {
    redirect('/auth/unauthorized');
  }

  const now = new Date();
  const adminGrant = await db.roleGrant.findFirst({
    where: {
      app: { appId: AUTH_CENTER_APP_ID },
      user: { employeeId },
      role: ADMIN_ROLE,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });

  if (!adminGrant) {
    redirect('/auth/unauthorized');
  }
}
