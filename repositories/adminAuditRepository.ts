import type { AdminAudit, AdminAction, Prisma } from '@/app/generated/prisma/client';
import { BaseRepository } from './baseRepository';

export interface RecordAdminAuditInput {
  actorId: string;
  action: AdminAction;
  resourceType: string;
  targetUserId?: string;
  targetAppId?: string;
  resourceId?: string;
  detail?: Record<string, unknown>;
  ipAddress?: string;
}

export class AdminAuditRepository extends BaseRepository<AdminAudit> {
  constructor() {
    super('adminAudit');
  }

  // Append-only — no update or delete methods exposed.
  async record(input: RecordAdminAuditInput, tx?: Prisma.TransactionClient): Promise<AdminAudit> {
    return this.getClient(tx).adminAudit.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        resourceType: input.resourceType,
        targetUserId: input.targetUserId,
        targetAppId: input.targetAppId,
        resourceId: input.resourceId,
        detail: input.detail ? JSON.stringify(input.detail) : undefined,
        ipAddress: input.ipAddress,
      },
    });
  }

  async findByActor(actorId: string, limit = 50, tx?: Prisma.TransactionClient): Promise<AdminAudit[]> {
    return this.getClient(tx).adminAudit.findMany({
      where: { actorId },
      orderBy: { performedAt: 'desc' },
      take: limit,
    });
  }
}

export const adminAuditRepository = new AdminAuditRepository();
