import type { ConsumerAppSession, Prisma } from '@/app/generated/prisma/client';
import { BaseRepository } from './baseRepository';

export class ConsumerAppSessionRepository extends BaseRepository<ConsumerAppSession> {
  constructor() {
    super('consumerAppSession');
  }

  async upsertByAppAndSession(
    appRegistrationId: string,
    sessionId: string,
    createData: Prisma.ConsumerAppSessionCreateInput,
    updateData: Prisma.ConsumerAppSessionUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ConsumerAppSession> {
    return this.getClient(tx).consumerAppSession.upsert({
      where: {
        appRegistrationId_sessionId: {
          appRegistrationId,
          sessionId,
        },
      },
      create: createData,
      update: updateData,
    });
  }

  async findByAppAndSession(
    appRegistrationId: string,
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ConsumerAppSession | null> {
    return this.getClient(tx).consumerAppSession.findUnique({
      where: {
        appRegistrationId_sessionId: {
          appRegistrationId,
          sessionId,
        },
      },
    });
  }

  async touchSession(
    appRegistrationId: string,
    sessionId: string,
    lastSeenAt: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<ConsumerAppSession> {
    return this.getClient(tx).consumerAppSession.update({
      where: {
        appRegistrationId_sessionId: {
          appRegistrationId,
          sessionId,
        },
      },
      data: {
        lastSeenAt,
      },
    });
  }

  async revokeSession(
    appRegistrationId: string,
    sessionId: string,
    status: 'REVOKED' | 'LOGGED_OUT',
    revokedAt: Date,
    revokeReason: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ConsumerAppSession> {
    return this.getClient(tx).consumerAppSession.update({
      where: {
        appRegistrationId_sessionId: {
          appRegistrationId,
          sessionId,
        },
      },
      data: {
        status,
        revokedAt,
        revokeReason,
        lastSeenAt: revokedAt,
      },
    });
  }
}

export const consumerAppSessionRepository = new ConsumerAppSessionRepository();
