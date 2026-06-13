import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

const SESSION_REVOKED_PREFIX = 'session:revoked:';

export async function markSessionRevoked(sessionId: string, ttlSec: number): Promise<void> {
  try {
    const key = `${SESSION_REVOKED_PREFIX}${sessionId}`;
    await redis.set(key, '1', 'EX', ttlSec);
  } catch (err) {
    // Fail-open — DB is the authoritative revocation store
    logger.warn('Failed to write session revocation to Redis', { sessionId, error: String(err) });
  }
}

export async function isSessionRevoked(sessionId: string): Promise<boolean> {
  try {
    const key = `${SESSION_REVOKED_PREFIX}${sessionId}`;
    const val = await redis.get(key);
    return val === '1';
  } catch (err) {
    // Fail-open — do not block the request if Redis is down
    logger.warn('Failed to check session revocation in Redis', { sessionId, error: String(err) });
    return false;
  }
}
