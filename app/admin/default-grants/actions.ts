'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { defaultRolePolicyService } from '@/services/defaultRolePolicyService';
import { createDefaultRolePolicySchema } from '@/schemas/adminSchema';
import { ZodError } from 'zod';
import type { Session } from 'next-auth';

export interface ActionResult { ok: boolean; error?: string; count?: number; }

function getActor(session: Session | null) {
  return (session as (Session & { employeeId?: string }) | null)?.employeeId
    ?? session?.user?.email
    ?? 'unknown';
}

export async function createPolicyAction(formData: FormData): Promise<ActionResult> {
  const session = await auth() as Session | null;
  if (!session?.user) return { ok: false, error: 'Not authenticated' };

  try {
    const input = createDefaultRolePolicySchema.parse({
      appId:        formData.get('appId'),
      role:         formData.get('role'),
      applyTo:      formData.get('applyTo') || 'ALL',
      departmentId: formData.get('departmentId') || undefined,
      description:  formData.get('description') || undefined,
    });
    await defaultRolePolicyService.createPolicy(input, getActor(session));
    revalidatePath('/admin/default-grants');
    return { ok: true };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message };
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to create policy' };
  }
}

export async function deactivatePolicyAction(id: string): Promise<ActionResult> {
  const session = await auth() as Session | null;
  if (!session?.user) return { ok: false, error: 'Not authenticated' };

  try {
    await defaultRolePolicyService.deactivatePolicy(id, getActor(session));
    revalidatePath('/admin/default-grants');
    return { ok: true };
  } catch (e) {
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to deactivate policy' };
  }
}

/**
 * Re-apply all active default grant policies to ALL existing users.
 * Useful when a new policy is added and admin wants to backfill without
 * waiting for each user to sign in again.
 */
export async function syncAllUsersAction(): Promise<ActionResult> {
  const session = await auth() as Session | null;
  if (!session?.user) return { ok: false, error: 'Not authenticated' };

  try {
    const { db } = await import('@/lib/db');
    const users = await db.user.findMany({
      where: { employmentStatus: 'ACTIVE' },
      include: { profile: { select: { departmentId: true } } },
    });

    let applied = 0;
    for (const user of users) {
      await defaultRolePolicyService.applyDefaultGrants(
        user.id,
        user.defaultAuthMethod as 'ENTRA' | 'LOCAL_PASSWORD' | 'LOCAL_OTP',
        user.profile?.departmentId ?? null
      );
      applied++;
    }

    revalidatePath('/admin/default-grants');
    return { ok: true, count: applied };
  } catch (e) {
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Sync failed' };
  }
}
