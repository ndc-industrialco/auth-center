import type { ExternalIdentityLink, Prisma } from '@/app/generated/prisma/client';
import { BaseRepository } from './baseRepository';

export class ExternalIdentityLinkRepository extends BaseRepository<ExternalIdentityLink> {
  constructor() {
    super('externalIdentityLink');
  }

  async findByEntraObjectId(entraObjectId: string, tx?: Prisma.TransactionClient): Promise<ExternalIdentityLink | null> {
    return this.getClient(tx).externalIdentityLink.findUnique({ where: { entraObjectId } });
  }

  async findByUserId(userId: string, tx?: Prisma.TransactionClient): Promise<ExternalIdentityLink | null> {
    return this.getClient(tx).externalIdentityLink.findFirst({ where: { userId } });
  }

  async create(
    userId: string,
    entraObjectId: string,
    entraUpn: string | undefined,
    linkedByMethod: string,
    tx?: Prisma.TransactionClient
  ): Promise<ExternalIdentityLink> {
    return this.getClient(tx).externalIdentityLink.create({
      data: { userId, entraObjectId, entraUpn, linkedByMethod },
    });
  }

  async deleteByUserId(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.getClient(tx).externalIdentityLink.deleteMany({ where: { userId } });
  }
}

export const externalIdentityLinkRepository = new ExternalIdentityLinkRepository();
