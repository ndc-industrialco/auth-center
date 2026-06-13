'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { userService } from '@/services/userService';
import { directorySyncService } from '@/services/directorySyncService';
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
