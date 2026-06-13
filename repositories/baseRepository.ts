import { db } from '@/lib/db';
import type { Prisma } from '@/app/generated/prisma/client';

export abstract class BaseRepository<T> {
  constructor(protected modelName: Uncapitalize<Prisma.ModelName>) {}

  protected getClient(tx?: Prisma.TransactionClient) {
    return tx ?? db;
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<T | null> {
    return (this.getClient(tx) as unknown as Record<string, { findUnique: (args: unknown) => Promise<T | null> }>)[this.modelName].findUnique({ where: { id } });
  }
}
