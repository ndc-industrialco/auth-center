'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userService } from '@/services/userService';
import { directorySyncService } from '@/services/directorySyncService';
import { adminAuditRepository } from '@/repositories/adminAuditRepository';
import { createUserSchema } from '@/schemas/adminSchema';
import { ZodError } from 'zod';
import type { Session } from 'next-auth';

export interface ActionResult { ok: boolean; error?: string; userId?: string; }

function getActor(session: Session | null) {
  return (session as (Session & { employeeId?: string }) | null)?.employeeId
    ?? session?.user?.email
    ?? 'unknown';
}

export async function createUserAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = getActor(session);

  try {
    const groupIds = formData.getAll('groupIds').map(String).filter(Boolean);
    const input = createUserSchema.parse({
      employeeId:      formData.get('employeeId'),
      displayName:     formData.get('displayName') || '',
      email:           formData.get('email') || '',
      departmentCode:  formData.get('departmentCode') || '',
      department:      formData.get('department') || '',
      jobTitle:        formData.get('jobTitle') || '',
      initialPassword: formData.get('initialPassword') || '',
      entraObjectId:   formData.get('entraObjectId') || '',
      entraUpn:        formData.get('entraUpn') || '',
      groupIds,
    });
    const user = await userService.createUser(input, actorId);
    revalidatePath('/admin/users');
    return { ok: true, userId: user.id };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message };
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to create user' };
  }
}

export async function bulkToggleDelegatedMailAction(userIds: string[], enable: boolean): Promise<ActionResult & { skipped?: number }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = getActor(session);
  try {
    const users = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, m365Linked: true } });
    const eligible = enable ? users.filter(u => u.m365Linked) : users;
    const skipped = users.length - eligible.length;
    if (eligible.length === 0) return { ok: false, error: 'No eligible users (must be M365-linked to enable)', skipped };
    await db.user.updateMany({ where: { id: { in: eligible.map(u => u.id) } }, data: { canSendDelegatedMail: enable } });
    await adminAuditRepository.record({
      actorId,
      action: enable ? 'PERMISSION_GRANTED' : 'PERMISSION_REVOKED',
      resourceType: 'User',
      detail: { permission: 'canSendDelegatedMail', value: enable, userIds: eligible.map(u => u.id) },
    });
    revalidatePath('/admin/users');
    return { ok: true, skipped };
  } catch (e) {
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to update delegated mail permission' };
  }
}

export async function syncUserFromM365Action(userId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = getActor(session);

  try {
    await directorySyncService.syncSingleUserFromGraph(actorId, userId);
    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath('/admin/directory');
    return { ok: true };
  } catch (e) {
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to sync user from M365' };
  }
}
