import { departmentRepository } from '@/repositories/departmentRepository';
import { adminAuditRepository } from '@/repositories/adminAuditRepository';
import { directorySyncService } from '@/services/directorySyncService';
import { updateGraphUserProfile } from '@/lib/graphAdminClient';
import { ConflictError, NotFoundError } from '@/errors/customErrors';

export class DepartmentService {
  async list(search?: string) {
    return departmentRepository.findMany(search || undefined);
  }

  async getByCode(code: string) {
    const dept = await departmentRepository.findByCode(code);
    if (!dept) throw new NotFoundError(`Department "${code}" not found`);
    return dept;
  }

  async getWithMembers(code: string) {
    const dept = await departmentRepository.findWithMembers(code);
    if (!dept) throw new NotFoundError(`Department "${code}" not found`);
    return dept;
  }

  async create(actorId: string, input: { code: string; displayName: string }) {
    const existing = await departmentRepository.findByCode(input.code);
    if (existing) throw new ConflictError(`Department code "${input.code}" already exists`);

    const dept = await departmentRepository.create({
      code: input.code,
      displayName: input.displayName,
      source: 'MANUAL',
    });

    await adminAuditRepository.record({
      actorId,
      action: 'DIRECTORY_DEPARTMENTS_REBUILT',
      resourceType: 'Department',
      resourceId: dept.id,
      detail: { code: dept.code, displayName: dept.displayName, op: 'create' },
    });

    return dept;
  }

  async update(actorId: string, code: string, input: { displayName: string }) {
    const existing = await departmentRepository.findByCode(code);
    if (!existing) throw new NotFoundError(`Department "${code}" not found`);

    const updated = await departmentRepository.updateByCode(code, {
      displayName: input.displayName,
    });

    await adminAuditRepository.record({
      actorId,
      action: 'DIRECTORY_DEPARTMENTS_REBUILT',
      resourceType: 'Department',
      resourceId: existing.id,
      detail: { code, displayName: input.displayName, op: 'update' },
    });

    return updated;
  }

  async delete(actorId: string, code: string) {
    const dept = await departmentRepository.findWithMemberCount(code);
    if (!dept) throw new NotFoundError(`Department "${code}" not found`);

    if (dept._count.profiles > 0) {
      throw new ConflictError(
        `Cannot delete department with ${dept._count.profiles} assigned users`
      );
    }

    await departmentRepository.deleteByCode(code);

    await adminAuditRepository.record({
      actorId,
      action: 'DIRECTORY_DEPARTMENTS_REBUILT',
      resourceType: 'Department',
      resourceId: dept.id,
      detail: { code, displayName: dept.displayName, op: 'delete' },
    });
  }

  async syncFromM365(actorId: string) {
    return directorySyncService.syncUsersFromGraph(actorId);
  }

  async syncToM365(actorId: string, code: string) {
    const dept = await departmentRepository.findWithMembersAndLinks(code);
    if (!dept) throw new NotFoundError(`Department "${code}" not found`);

    let synced = 0;
    let skipped = 0;

    for (const profile of dept.profiles) {
      const link = profile.user.externalLinks[0];
      if (!link) { skipped++; continue; }
      await updateGraphUserProfile(link.entraObjectId, { department: dept.displayName });
      synced++;
    }

    await adminAuditRepository.record({
      actorId,
      action: 'USER_PROFILE_SYNCED_TO_GRAPH',
      resourceType: 'Department',
      resourceId: dept.id,
      detail: { code, displayName: dept.displayName, op: 'sync_dept_to_m365', synced, skipped },
    });

    return { synced, skipped };
  }
}

export const departmentService = new DepartmentService();
