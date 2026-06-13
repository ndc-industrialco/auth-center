import type { PermissionGrant, Prisma } from '@/app/generated/prisma/client';
import { BaseRepository } from './baseRepository';

export class PermissionGrantRepository extends BaseRepository<PermissionGrant> {
  constructor() {
    super('permissionGrant');
  }

  async findActiveByUser(userId: string, tx?: Prisma.TransactionClient): Promise<PermissionGrant[]> {
    const now = new Date();
    return this.getClient(tx).permissionGrant.findMany({
      where: {
        userId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }

  async findActiveByUserAndApp(userId: string, appId: string, tx?: Prisma.TransactionClient): Promise<PermissionGrant[]> {
    const now = new Date();
    return this.getClient(tx).permissionGrant.findMany({
      where: {
        userId,
        appId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }

  async grant(data: Prisma.PermissionGrantCreateInput, tx?: Prisma.TransactionClient): Promise<PermissionGrant> {
    return this.getClient(tx).permissionGrant.create({ data });
  }

  async revoke(id: string, tx?: Prisma.TransactionClient): Promise<PermissionGrant> {
    return this.getClient(tx).permissionGrant.update({ where: { id }, data: { isActive: false } });
  }
}

export const permissionGrantRepository = new PermissionGrantRepository();
