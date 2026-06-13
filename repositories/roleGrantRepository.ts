import type { RoleGrant, Prisma } from '@/app/generated/prisma/client';
import { BaseRepository } from './baseRepository';

export class RoleGrantRepository extends BaseRepository<RoleGrant> {
  constructor() {
    super('roleGrant');
  }

  async findActiveByUser(userId: string, tx?: Prisma.TransactionClient): Promise<RoleGrant[]> {
    const now = new Date();
    return this.getClient(tx).roleGrant.findMany({
      where: {
        userId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }

  async findActiveByUserAndApp(userId: string, appId: string, tx?: Prisma.TransactionClient): Promise<RoleGrant[]> {
    const now = new Date();
    return this.getClient(tx).roleGrant.findMany({
      where: {
        userId,
        app: { appId },
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }

  async findByUserAndAppAndRole(
    userId: string,
    appId: string,
    role: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RoleGrant | null> {
    return this.getClient(tx).roleGrant.findFirst({
      where: {
        userId,
        app: { appId },
        role,
      },
    });
  }

  async grant(data: Prisma.RoleGrantCreateInput, tx?: Prisma.TransactionClient): Promise<RoleGrant> {
    return this.getClient(tx).roleGrant.create({ data });
  }

  async reactivate(
    id: string,
    grantedBy?: string,
    expiresAt?: Date | null,
    tx?: Prisma.TransactionClient,
  ): Promise<RoleGrant> {
    return this.getClient(tx).roleGrant.update({
      where: { id },
      data: {
        isActive: true,
        grantedAt: new Date(),
        grantedBy: grantedBy ?? null,
        expiresAt: expiresAt ?? null,
      },
    });
  }

  async revokeActiveByUserAndApp(userId: string, appId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const result = await this.getClient(tx).roleGrant.updateMany({
      where: {
        userId,
        app: { appId },
        isActive: true,
      },
      data: { isActive: false },
    });

    return result.count;
  }

  async revoke(id: string, tx?: Prisma.TransactionClient): Promise<RoleGrant> {
    return this.getClient(tx).roleGrant.update({ where: { id }, data: { isActive: false } });
  }

  async findActiveByAppWithDetails(appId: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).roleGrant.findMany({
      where: { isActive: true, app: { appId } },
      include: {
        user: { select: { id: true, employeeId: true, email: true, displayName: true } },
        app: { select: { appId: true, displayName: true } },
      },
      orderBy: { grantedAt: 'desc' },
    });
  }

  async findActiveByUserAndAppAndRole(
    userId: string,
    appId: string,
    role: string,
    tx?: Prisma.TransactionClient
  ): Promise<RoleGrant | null> {
    return this.getClient(tx).roleGrant.findFirst({
      where: { userId, app: { appId }, role, isActive: true },
    });
  }

  async revokeActiveByUserAndAppExcept(
    userId: string,
    appId: string,
    exceptRole: string,
    tx?: Prisma.TransactionClient
  ): Promise<number> {
    const result = await this.getClient(tx).roleGrant.updateMany({
      where: { userId, app: { appId }, isActive: true, role: { not: exceptRole } },
      data: { isActive: false },
    });
    return result.count;
  }
}

export const roleGrantRepository = new RoleGrantRepository();
