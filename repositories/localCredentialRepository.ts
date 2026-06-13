import type { LocalCredential, Prisma } from '@/app/generated/prisma/client';
import { BaseRepository } from './baseRepository';

export class LocalCredentialRepository extends BaseRepository<LocalCredential> {
  constructor() {
    super('localCredential');
  }

  async findByUserId(userId: string, tx?: Prisma.TransactionClient): Promise<LocalCredential | null> {
    return this.getClient(tx).localCredential.findUnique({ where: { userId } });
  }

  async create(userId: string, passwordHash: string, tx?: Prisma.TransactionClient): Promise<LocalCredential> {
    return this.getClient(tx).localCredential.create({
      data: { userId, passwordHash },
    });
  }

  async updateHash(userId: string, passwordHash: string, tx?: Prisma.TransactionClient): Promise<LocalCredential> {
    return this.getClient(tx).localCredential.update({
      where: { userId },
      data: { passwordHash, lastChangedAt: new Date(), failedAttempts: 0, lockedUntil: null },
    });
  }

  async incrementFailedAttempts(userId: string, tx?: Prisma.TransactionClient): Promise<LocalCredential> {
    return this.getClient(tx).localCredential.update({
      where: { userId },
      data: { failedAttempts: { increment: 1 } },
    });
  }

  async lockAccount(userId: string, lockedUntil: Date, tx?: Prisma.TransactionClient): Promise<LocalCredential> {
    return this.getClient(tx).localCredential.update({
      where: { userId },
      data: { lockedUntil },
    });
  }

  async resetFailedAttempts(userId: string, tx?: Prisma.TransactionClient): Promise<LocalCredential> {
    return this.getClient(tx).localCredential.update({
      where: { userId },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  }
}

export const localCredentialRepository = new LocalCredentialRepository();
