import type { NextRequest } from 'next/server';
import type { AppRegistration } from '@/app/generated/prisma/client';
import { UnauthorizedError } from '@/errors/customErrors';
import { consumerAppSessionService } from '@/services/consumerAppSessionService';

export async function requireConsumerApp(request: NextRequest): Promise<AppRegistration> {
  const appId = request.headers.get('x-consumer-app-id')?.trim();
  const appSecret = request.headers.get('x-consumer-app-secret')?.trim();

  if (!appId || !appSecret) {
    throw new UnauthorizedError('Consumer app credentials are required');
  }

  return consumerAppSessionService.authenticateConsumerApp(appId, appSecret);
}
