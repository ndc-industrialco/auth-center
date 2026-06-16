import type { NextRequest } from 'next/server';
import { UnauthorizedError, ValidationError } from '@/errors/customErrors';
import { tokenService } from '@/services/tokenService';

export async function requireAppAccess(request: NextRequest, appId: string) {
  if (!appId?.trim()) {
    throw new ValidationError('appId is required');
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();

  const token = authHeader.slice(7);
  return tokenService.verifyAccessToken(token, appId);
}
