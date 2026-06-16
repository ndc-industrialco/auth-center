import type { Department, Prisma } from '@/app/generated/prisma/client';
import { BaseRepository } from './baseRepository';

export class DepartmentRepository extends BaseRepository<Department> {
  constructor() {
    super('department');
  }

  async findByCode(code: string, tx?: Prisma.TransactionClient): Promise<Department | null> {
    return this.getClient(tx).department.findUnique({ where: { code } });
  }

  async findMany(search?: string, tx?: Prisma.TransactionClient): Promise<Department[]> {
    return this.getClient(tx).department.findMany({
      where: search
        ? {
            OR: [
              { displayName: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { displayName: 'asc' },
    });
  }

  async create(
    data: { code: string; displayName: string; source?: string },
    tx?: Prisma.TransactionClient
  ): Promise<Department> {
    return this.getClient(tx).department.create({
      data: {
        code: data.code,
        displayName: data.displayName,
        source: data.source ?? 'MANUAL',
      },
    });
  }

  async updateByCode(
    code: string,
    data: Prisma.DepartmentUpdateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Department> {
    return this.getClient(tx).department.update({ where: { code }, data });
  }

  async deleteByCode(code: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.getClient(tx).department.delete({ where: { code } });
  }

  async findWithMemberCount(code: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).department.findUnique({
      where: { code },
      include: { _count: { select: { profiles: true } } },
    });
  }

  async findWithMembers(code: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).department.findUnique({
      where: { code },
      include: {
        profiles: {
          where: { user: { employmentStatus: 'ACTIVE' } },
          include: {
            user: {
              select: {
                id: true,
                employeeId: true,
                displayName: true,
                email: true,
                m365Linked: true,
                employmentStatus: true,
              },
            },
          },
          orderBy: { user: { displayName: 'asc' } },
        },
      },
    });
  }

  async findWithMembersAndRoles(code: string, appId: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).department.findUnique({
      where: { code },
      include: {
        profiles: {
          where: { user: { employmentStatus: 'ACTIVE' } },
          include: {
            user: {
              select: {
                id: true,
                employeeId: true,
                displayName: true,
                email: true,
                m365Linked: true,
                roleGrants: {
                  where: {
                    isActive: true,
                    app: { appId },
                    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                  },
                  select: { role: true },
                },
              },
            },
          },
          orderBy: { user: { displayName: 'asc' } },
        },
      },
    });
  }

  async findWithMembersAndLinks(code: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).department.findUnique({
      where: { code },
      include: {
        profiles: {
          where: { user: { employmentStatus: 'ACTIVE', m365Linked: true } },
          include: {
            user: {
              select: {
                id: true,
                externalLinks: { select: { entraObjectId: true }, take: 1 },
              },
            },
          },
        },
      },
    });
  }
}

export const departmentRepository = new DepartmentRepository();
