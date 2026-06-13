import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';

interface HealthCheck {
  status: 'ok' | 'degraded' | 'down';
  latencyMs: number;
  error?: string;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch {
    return { status: 'down', latencyMs: Date.now() - start, error: 'Database unreachable' };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await redis.ping();
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch {
    return { status: 'degraded', latencyMs: Date.now() - start, error: 'Redis unreachable (fail-open)' };
  }
}

export async function GET() {
  const [dbCheck, redisCheck] = await Promise.all([checkDatabase(), checkRedis()]);

  const overallStatus =
    dbCheck.status === 'down' ? 'down' :
    redisCheck.status === 'down' ? 'degraded' :
    'ok';

  const httpStatus = overallStatus === 'down' ? 503 : 200;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbCheck,
        redis: redisCheck,
      },
    },
    { status: httpStatus }
  );
}
