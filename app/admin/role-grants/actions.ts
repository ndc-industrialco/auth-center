'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { appRegistrationService } from '@/services/appRegistrationService';
import { createRoleGrantSchema, revokeGrantSchema } from '@/schemas/adminSchema';
import { ZodError } from 'zod';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function grantRoleAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = (session as typeof session & { employeeId?: string }).employeeId ?? session.user.email ?? 'unknown';

  try {
    const input = createRoleGrantSchema.parse({
      userId:    formData.get('userId'),
      appId:     formData.get('appId'),
      role:      formData.get('role'),
      expiresAt: formData.get('expiresAt') || undefined,
    });
    await appRegistrationService.grantRole(input, actorId);
    revalidatePath('/admin/role-grants');
    return { ok: true };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message };
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to grant role' };
  }
}

export async function revokeRoleAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = (session as typeof session & { employeeId?: string }).employeeId ?? session.user.email ?? 'unknown';

  try {
    const { grantId } = revokeGrantSchema.parse({ grantId: formData.get('grantId') });
    await appRegistrationService.revokeRole(grantId, actorId);
    revalidatePath('/admin/role-grants');
    return { ok: true };
  } catch (e) {
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to revoke role grant' };
  }
}
