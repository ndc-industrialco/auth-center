'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { appRegistrationService } from '@/services/appRegistrationService';
import { createAppSchema } from '@/schemas/adminSchema';
import { ZodError } from 'zod';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function registerAppAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };

  const actorId = (session as typeof session & { employeeId?: string }).employeeId
    ?? session.user.email
    ?? 'unknown';

  try {
    const input = createAppSchema.parse({
      appId: formData.get('appId'),
      displayName: formData.get('displayName'),
      description: formData.get('description') || undefined,
    });
    await appRegistrationService.registerApp(input, actorId);
    revalidatePath('/admin/apps');
    return { ok: true };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message };
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to register app' };
  }
}
