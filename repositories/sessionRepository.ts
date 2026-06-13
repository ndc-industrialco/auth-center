import type { UserSession, Prisma } from '@/app/generated/prisma/client';
import { BaseRepository } from './baseRepository';

export interface CreateSessionInput {
  userId: string;
  sessionId: string;
  authMethod: Prisma.EnumAuthMethodFilter extends never ? string : string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

export class SessionRepository extends BaseRepository<UserSession> {
  constructor() {
    super('userSession');
  }

  async create(data: Prisma.UserSessionCreateInput, tx?: Prisma.TransactionClient): Promise<UserSession> {
    return this.getClient(tx).userSession.create({ data });
  }

  async findBySessionId(sessionId: string, tx?: Prisma.TransactionClient): Promise<UserSession | null> {
    return this.getClient(tx).userSession.findUnique({ where: { sessionId } });
  }

  async findActiveSessions(userId: string, tx?: Prisma.TransactionClient): Promise<UserSession[]> {
    return this.getClient(tx).userSession.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(sessionId: string, revokedBy: string, tx?: Prisma.TransactionClient): Promise<void> {
    // updateMany is idempotent — no error if session is already revoked or not found
    await this.getClient(tx).userSession.updateMany({
      where: { sessionId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedBy },
    });
  }

  async expireSession(sessionId: string, tx?: Prisma.TransactionClient): Promise<UserSession> {
    return this.getClient(tx).userSession.update({
      where: { sessionId },
      data: { status: 'EXPIRED' },
    });
  }

  async revokeAllForUser(userId: string, revokedBy: string, tx?: Prisma.TransactionClient): Promise<string[]> {
    // Return sessionIds that were revoked for Redis fast-path invalidation
    const active = await this.getClient(tx).userSession.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { sessionId: true, expiresAt: true },
    });
    if (active.length === 0) return [];

    await this.getClient(tx).userSession.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date(), revokedBy },
    });

    return active.map((s) => s.sessionId);
  }
}

export const sessionRepository = new SessionRepository();
