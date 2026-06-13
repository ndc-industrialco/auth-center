import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

interface RateLimitOptions {
  key: string;
  limit: number;
  windowSec: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowSec } = opts;
  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSec);
    }
    const ttl = await redis.ttl(key);
    const resetAt = Date.now() + ttl * 1000;
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt,
    };
  } catch (err) {
    // Fail-open on Redis errors — do not block the request
    logger.warn('Rate limit Redis error, failing open', { key, error: String(err) });
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowSec * 1000 };
  }
}
