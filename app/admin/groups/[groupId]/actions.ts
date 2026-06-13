'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { directorySyncService } from '@/services/directorySyncService';
import { z } from 'zod';

export interface GroupActionResult {
  ok: boolean;
  error?: string;
}

async function getActor() {
  const session = await auth();
  if (!session?.user) throw new Error('Not authenticated');
  return (session as { employeeId?: string }).employeeId ?? session.user.email ?? 'unknown';
}

export async function addGroupMemberAction(groupId: string, formData: FormData): Promise<GroupActionResult> {
  try {
    const actorId = await getActor();
    const identifier = z.string().min(1).parse(formData.get('employeeIdOrEmail'));
    await directorySyncService.addMemberToEmailGroup(actorId, groupId, identifier);
    revalidatePath(`/admin/groups/${groupId}`);
    revalidatePath('/admin/directory');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to add member' };
  }
}

export async function removeGroupMemberAction(groupId: string, memberId: string): Promise<GroupActionResult> {
  try {
    const actorId = await getActor();
    await directorySyncService.removeMemberFromEmailGroup(actorId, memberId);
    revalidatePath(`/admin/groups/${groupId}`);
    revalidatePath('/admin/directory');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to remove member' };
  }
}

export async function syncGroupAction(groupId: string): Promise<GroupActionResult> {
  try {
    const actorId = await getActor();
    await directorySyncService.syncSingleGroupFromGraph(actorId, groupId);
    revalidatePath(`/admin/groups/${groupId}`);
    revalidatePath('/admin/directory');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to sync group' };
  }
}
