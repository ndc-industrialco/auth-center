'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { directorySyncService } from '@/services/directorySyncService';

export interface DirectoryActionResult {
  ok: boolean;
  message?: string;
  error?: string;
}

function getActor() {
  return auth().then((session) =>
    (session as { employeeId?: string } | null)?.employeeId ??
    session?.user?.email ??
    'unknown'
  );
}

export async function syncUsersAction(): Promise<DirectoryActionResult> {
  try {
    const actor = await getActor();
    const result = await directorySyncService.syncUsersFromGraph(actor);
    revalidatePath('/admin/directory');
    revalidatePath('/admin/users');
    return {
      ok: true,
      message: `Users synced: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to sync users' };
  }
}

export async function syncGroupsAction(): Promise<DirectoryActionResult> {
  try {
    const actor = await getActor();
    const result = await directorySyncService.syncGroupsFromGraph(actor);
    revalidatePath('/admin/directory');
    return {
      ok: true,
      message: `Groups synced: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to sync groups' };
  }
}

export async function rebuildDepartmentsAction(): Promise<DirectoryActionResult> {
  try {
    const actor = await getActor();
    const count = await directorySyncService.rebuildDepartments(actor);
    revalidatePath('/admin/directory');
    return { ok: true, message: `Departments rebuilt: ${count}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to rebuild departments' };
  }
}
