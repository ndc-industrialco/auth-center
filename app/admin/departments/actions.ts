'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { departmentService } from '@/services/departmentService';

export interface DepartmentActionResult {
  ok: boolean;
  message?: string;
  error?: string;
}

async function getActor(): Promise<string> {
  const session = await auth();
  return (session as { employeeId?: string } | null)?.employeeId ??
    session?.user?.email ??
    'unknown';
}

export async function createDepartmentAction(
  code: string,
  displayName: string
): Promise<DepartmentActionResult> {
  try {
    const actor = await getActor();
    await departmentService.create(actor, { code, displayName });
    revalidatePath('/admin/departments');
    return { ok: true, message: `Department "${code}" created` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to create department' };
  }
}

export async function updateDepartmentAction(
  code: string,
  displayName: string
): Promise<DepartmentActionResult> {
  try {
    const actor = await getActor();
    await departmentService.update(actor, code, { displayName });
    revalidatePath('/admin/departments');
    revalidatePath(`/admin/departments/${code}`);
    return { ok: true, message: `Department "${code}" updated` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to update department' };
  }
}

export async function deleteDepartmentAction(code: string): Promise<DepartmentActionResult> {
  try {
    const actor = await getActor();
    await departmentService.delete(actor, code);
    revalidatePath('/admin/departments');
    return { ok: true, message: `Department "${code}" deleted` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to delete department' };
  }
}

export async function syncDepartmentToM365Action(code: string): Promise<DepartmentActionResult> {
  try {
    const actor = await getActor();
    const result = await departmentService.syncToM365(actor, code);
    return {
      ok: true,
      message: `Pushed to M365: ${result.synced} user${result.synced !== 1 ? 's' : ''} updated${result.skipped > 0 ? `, ${result.skipped} skipped (no Entra link)` : ''}`,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to sync to M365' };
  }
}

export async function syncDepartmentsFromM365Action(): Promise<DepartmentActionResult> {
  try {
    const actor = await getActor();
    const result = await departmentService.syncFromM365(actor);
    revalidatePath('/admin/departments');
    revalidatePath('/admin/directory');
    revalidatePath('/admin/users');
    return {
      ok: true,
      message: `M365 sync complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to sync from M365' };
  }
}
