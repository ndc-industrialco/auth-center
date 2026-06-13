import { randomUUID } from 'crypto';
import type { UserSession } from '@/app/generated/prisma/client';
import type { AuthMethod } from '@/types/auth';
import { sessionRepository } from '@/repositories/sessionRepository';
import { markSessionRevoked, isSessionRevoked } from '@/lib/sessionRevocation';

const SESSION_TTL_SEC = 60 * 60 * 8; // 8 hours

export class SessionService {
  async createSession(
    userId: string,
    authMethod: AuthMethod,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserSession> {
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_SEC * 1000);

    return sessionRepository.create({
      user: { connect: { id: userId } },
      sessionId,
      authMethod,
      ipAddress,
      userAgent,
      expiresAt,
      status: 'ACTIVE',
    });
  }

  async revokeSession(sessionId: string, revokedBy: string): Promise<void> {
    // updateMany is idempotent — safe on already-revoked or non-existent sessions
    await sessionRepository.revokeSession(sessionId, revokedBy);

    // Use remaining TTL so the Redis key doesn't outlive the session's natural expiry
    const session = await sessionRepository.findBySessionId(sessionId);
    const remainingTtl = session
      ? Math.max(60, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000))
      : SESSION_TTL_SEC;
    await markSessionRevoked(sessionId, remainingTtl);
  }

  async revokeAllForUser(userId: string, revokedBy: string): Promise<void> {
    const revokedIds = await sessionRepository.revokeAllForUser(userId, revokedBy);
    await Promise.all(revokedIds.map((sid) => markSessionRevoked(sid, SESSION_TTL_SEC)));
  }

  async isSessionValid(sessionId: string): Promise<boolean> {
    const revoked = await isSessionRevoked(sessionId);
    if (revoked) return false;

    const session = await sessionRepository.findBySessionId(sessionId);
    if (!session) return false;
    if (session.status !== 'ACTIVE') return false;
    if (session.expiresAt < new Date()) return false;

    return true;
  }

  async getUserActiveSessions(userId: string): Promise<UserSession[]> {
    return sessionRepository.findActiveSessions(userId);
  }
}

export const sessionService = new SessionService();
