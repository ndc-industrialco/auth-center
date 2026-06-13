import Redis from 'ioredis';
import { logger } from '@/lib/logger';

const globalForRedis = globalThis as unknown as { redis: Redis };

function createRedisClient(): Redis {
  const client = new Redis(process.env.REDIS_URL!, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
  });

  client.on('error', (err) => {
    logger.error('Redis client error', { error: err.message });
  });

  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}
