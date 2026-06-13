import type { IdentityAccount, IdentityType, Prisma } from '@/app/generated/prisma/client';
import { BaseRepository } from './baseRepository';

export class IdentityAccountRepository extends BaseRepository<IdentityAccount> {
  constructor() {
    super('identityAccount');
  }

  async findByUserAndType(
    userId: string,
    type: IdentityType,
    tx?: Prisma.TransactionClient
  ): Promise<IdentityAccount | null> {
    return this.getClient(tx).identityAccount.findFirst({ where: { userId, type } });
  }

  async upsert(
    userId: string,
    type: IdentityType,
    providerAccountId: string | null,
    tx?: Prisma.TransactionClient
  ): Promise<IdentityAccount> {
    return this.getClient(tx).identityAccount.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type, providerAccountId, isActive: true },
      update: { providerAccountId, isActive: true },
    });
  }

  async deactivate(userId: string, type: IdentityType, tx?: Prisma.TransactionClient): Promise<void> {
    await this.getClient(tx).identityAccount.updateMany({
      where: { userId, type },
      data: { isActive: false },
    });
  }
}

export const identityAccountRepository = new IdentityAccountRepository();
