import type { DefaultRolePolicy, DefaultRolePolicyApplyTo, Prisma } from '@/app/generated/prisma/client';
import { BaseRepository } from './baseRepository';

export class DefaultRolePolicyRepository extends BaseRepository<DefaultRolePolicy> {
  constructor() {
    super('defaultRolePolicy');
  }

  /**
   * Find active policies matching auth method and department.
   * Returns:
   *   - policies with departmentId = null  (wildcard — all departments)
   *   - policies with departmentId = user's department (if provided)
   */
  async findActiveFor(
    authMethod: 'ENTRA' | 'LOCAL_PASSWORD' | 'LOCAL_OTP',
    departmentId?: string | null,
    tx?: Prisma.TransactionClient
  ): Promise<DefaultRolePolicy[]> {
    const applyToFilter: DefaultRolePolicyApplyTo[] = ['ALL'];
    if (authMethod === 'ENTRA') applyToFilter.push('ENTRA_ONLY');
    else applyToFilter.push('LOCAL_ONLY');

    const departmentFilter = departmentId
      ? { OR: [{ departmentId: null }, { departmentId }] }
      : { departmentId: null };

    return this.getClient(tx).defaultRolePolicy.findMany({
      where: {
        isActive: true,
        applyTo: { in: applyToFilter },
        ...departmentFilter,
      },
      include: { app: { select: { id: true, appId: true } } },
    });
  }

  async findAll(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).defaultRolePolicy.findMany({
      orderBy: [{ isActive: 'desc' }, { departmentId: 'asc' }, { createdAt: 'asc' }],
      include: { app: { select: { appId: true, displayName: true } } },
    });
  }

  async create(data: Prisma.DefaultRolePolicyCreateInput, tx?: Prisma.TransactionClient): Promise<DefaultRolePolicy> {
    return this.getClient(tx).defaultRolePolicy.create({ data });
  }

  async deactivate(id: string, tx?: Prisma.TransactionClient): Promise<DefaultRolePolicy> {
    return this.getClient(tx).defaultRolePolicy.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const defaultRolePolicyRepository = new DefaultRolePolicyRepository();
