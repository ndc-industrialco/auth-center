'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import type { Session } from 'next-auth';
import { appRegistrationService } from '@/services/appRegistrationService';
import { createRoleGrantSchema, revokeGrantSchema, updateAvailableRolesSchema } from '@/schemas/adminSchema';
import { ZodError, z } from 'zod';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

type AuthSession = Session & { employeeId?: string };

export async function grantRoleForAppAction(
  appId: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await auth() as AuthSession | null;
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = session.employeeId ?? session.user.email ?? 'unknown';

  try {
    const input = createRoleGrantSchema.parse({
      userId:    formData.get('userId'),
      appId,
      role:      formData.get('role'),
      expiresAt: formData.get('expiresAt') || undefined,
    });
    await appRegistrationService.grantRole(input, actorId);
    revalidatePath(`/admin/apps/${appId}`);
    revalidatePath('/admin/role-grants');
    return { ok: true };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message };
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to grant role' };
  }
}

export async function revokeRoleForAppAction(
  appId: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await auth() as AuthSession | null;
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = session.employeeId ?? session.user.email ?? 'unknown';

  try {
    const { grantId } = revokeGrantSchema.parse({ grantId: formData.get('grantId') });
    await appRegistrationService.revokeRole(grantId, actorId);
    revalidatePath(`/admin/apps/${appId}`);
    revalidatePath('/admin/role-grants');
    return { ok: true };
  } catch (e) {
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to revoke role grant' };
  }
}

export async function updateAvailableRolesAction(
  appId: string,
  roles: string[],
): Promise<ActionResult> {
  const session = await auth() as AuthSession | null;
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = session.employeeId ?? session.user.email ?? 'unknown';

  try {
    const input = updateAvailableRolesSchema.parse({ appId, roles });
    await appRegistrationService.updateAvailableRoles(input, actorId);
    revalidatePath(`/admin/apps/${appId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message };
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to update roles' };
  }
}

export async function setUserRoleAction(
  appId: string,
  userId: string,
  role: string,
): Promise<ActionResult> {
  const session = await auth() as AuthSession | null;
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = session.employeeId ?? session.user.email ?? 'unknown';

  try {
    const input = createRoleGrantSchema.parse({ userId, appId, role });
    await appRegistrationService.grantRole(input, actorId);
    revalidatePath(`/admin/apps/${appId}`);
    revalidatePath('/admin/role-grants');
    return { ok: true };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message };
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to set role' };
  }
}

export async function bulkSetRoleAction(
  appId: string,
  role: string,
): Promise<ActionResult & { count?: number }> {
  const session = await auth() as AuthSession | null;
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = session.employeeId ?? session.user.email ?? 'unknown';

  try {
    z.string().min(1).max(100).parse(role);
    const count = await appRegistrationService.bulkGrantRole(appId, role, actorId);
    revalidatePath(`/admin/apps/${appId}`);
    revalidatePath('/admin/role-grants');
    return { ok: true, count };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message };
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Bulk assign failed' };
  }
}

export async function removeUserRoleAction(
  appId: string,
  userId: string,
): Promise<ActionResult> {
  const session = await auth() as AuthSession | null;
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = session.employeeId ?? session.user.email ?? 'unknown';

  try {
    z.string().cuid().parse(userId);
    await appRegistrationService.revokeAllRolesForUser(userId, appId, actorId);
    revalidatePath(`/admin/apps/${appId}`);
    revalidatePath('/admin/role-grants');
    return { ok: true };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message };
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to remove role' };
  }
}
