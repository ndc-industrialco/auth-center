import type { LoginAudit, Prisma } from '@/app/generated/prisma/client';
import { BaseRepository } from './baseRepository';

export class LoginAuditRepository extends BaseRepository<LoginAudit> {
  constructor() {
    super('loginAudit');
  }

  // Append-only — no update or delete methods exposed.
  async record(data: Prisma.LoginAuditCreateInput, tx?: Prisma.TransactionClient): Promise<LoginAudit> {
    return this.getClient(tx).loginAudit.create({ data });
  }

  async findRecentByEmployeeId(
    employeeId: string,
    limit: number,
    tx?: Prisma.TransactionClient
  ): Promise<LoginAudit[]> {
    return this.getClient(tx).loginAudit.findMany({
      where: { employeeId },
      orderBy: { attemptedAt: 'desc' },
      take: limit,
    });
  }

  async countFailedSince(employeeId: string, since: Date, tx?: Prisma.TransactionClient): Promise<number> {
    return this.getClient(tx).loginAudit.count({
      where: {
        employeeId,
        outcome: { not: 'SUCCESS' },
        attemptedAt: { gte: since },
      },
    });
  }
}

export const loginAuditRepository = new LoginAuditRepository();
