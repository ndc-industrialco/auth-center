'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { entraAuthService } from '@/services/entraAuthService';
import { sessionService } from '@/services/sessionService';
import { credentialService } from '@/services/credentialService';
import { directorySyncService } from '@/services/directorySyncService';
import { appRegistrationService } from '@/services/appRegistrationService';
import { adminAuditRepository } from '@/repositories/adminAuditRepository';
import { createRoleGrantSchema } from '@/schemas/adminSchema';
import { ZodError, z } from 'zod';
import type { Session } from 'next-auth';

export interface ActionResult { ok: boolean; error?: string; }

function getActor(session: Session | null) {
  return (session as (Session & { employeeId?: string }) | null)?.employeeId
    ?? session?.user?.email
    ?? 'unknown';
}

export async function linkEntraAction(userId: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  try {
    const schema = z.object({
      entraObjectId: z.string().min(1),
      entraUpn: z.string().email().optional(),
    });
    const input = schema.parse({
      entraObjectId: formData.get('entraObjectId'),
      entraUpn: formData.get('entraUpn') || undefined,
    });
    await entraAuthService.linkEntraToUser(userId, input);
    revalidatePath(`/admin/users/${userId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message };
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to link Entra identity' };
  }
}

export async function unlinkEntraAction(userId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  try {
    await entraAuthService.unlinkEntra(userId);
    revalidatePath(`/admin/users/${userId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to unlink Entra identity' };
  }
}

export async function setPasswordAction(userId: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = getActor(session);
  try {
    const newPassword = z.string().parse(formData.get('newPassword'));
    await credentialService.adminSetPassword(userId, newPassword, actorId);
    revalidatePath(`/admin/users/${userId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message };
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to set password' };
  }
}

export async function toggleLocalLoginAction(userId: string, enable: boolean): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = getActor(session);
  try {
    if (enable) await credentialService.enableLocalLogin(userId, actorId);
    else await credentialService.disableLocalLogin(userId, actorId);
    revalidatePath(`/admin/users/${userId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to toggle local login' };
  }
}

export async function revokeSessionAction(userId: string, sessionId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = getActor(session);
  try {
    await sessionService.revokeSession(sessionId, actorId);
    await adminAuditRepository.record({
      actorId,
      action: 'SESSION_REVOKED_BY_ADMIN',
      resourceType: 'UserSession',
      targetUserId: userId,
      detail: { sessionId },
    });
    revalidatePath(`/admin/users/${userId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to revoke session' };
  }
}

export async function revokeAllSessionsAction(userId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = getActor(session);
  try {
    await sessionService.revokeAllForUser(userId, actorId);
    await adminAuditRepository.record({
      actorId,
      action: 'SESSIONS_REVOKED_ALL',
      resourceType: 'UserSession',
      targetUserId: userId,
    });
    revalidatePath(`/admin/users/${userId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to revoke sessions' };
  }
}

export async function updateUserProfileAction(userId: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = getActor(session);

  try {
    const schema = z.object({
      displayName: z.string().min(1),
      department: z.string().optional().default(''),
      jobTitle: z.string().optional().default(''),
      officeLocation: z.string().optional().default(''),
      mobilePhone: z.string().optional().default(''),
      syncToGraph: z.boolean().default(false),
    });

    const input = schema.parse({
      displayName: formData.get('displayName'),
      department: formData.get('department') || '',
      jobTitle: formData.get('jobTitle') || '',
      officeLocation: formData.get('officeLocation') || '',
      mobilePhone: formData.get('mobilePhone') || '',
      syncToGraph: formData.get('syncToGraph') === 'true',
    });

    await directorySyncService.updateUserProfileAndSync(actorId, userId, input);
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath('/admin/directory');
    return { ok: true };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message };
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to update user profile' };
  }
}

export async function grantRoleFromUserAction(userId: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = getActor(session);

  try {
    const input = createRoleGrantSchema.parse({
      userId,
      appId:     formData.get('appId'),
      role:      formData.get('role'),
      expiresAt: formData.get('expiresAt') || undefined,
    });
    await appRegistrationService.grantRole(input, actorId);
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath('/admin/role-grants');
    return { ok: true };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message };
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to grant role' };
  }
}

export async function toggleDelegatedMailAction(userId: string, enable: boolean): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = getActor(session);
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { m365Linked: true } });
    if (!user) return { ok: false, error: 'User not found' };
    if (enable && !user.m365Linked) return { ok: false, error: 'User must be M365-linked to enable delegated mail' };
    await db.user.update({ where: { id: userId }, data: { canSendDelegatedMail: enable } });
    await adminAuditRepository.record({
      actorId,
      action: enable ? 'PERMISSION_GRANTED' : 'PERMISSION_REVOKED',
      resourceType: 'User',
      targetUserId: userId,
      detail: { permission: 'canSendDelegatedMail', value: enable },
    });
    revalidatePath(`/admin/users/${userId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to update delegated mail permission' };
  }
}

export async function syncUserFromM365DetailAction(userId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'Not authenticated' };
  const actorId = getActor(session);

  try {
    await directorySyncService.syncSingleUserFromGraph(actorId, userId);
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath('/admin/users');
    revalidatePath('/admin/directory');
    return { ok: true };
  } catch (e) {
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Failed to sync user from M365' };
  }
}
