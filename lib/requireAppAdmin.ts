import type { NextRequest } from 'next/server';
import { ForbiddenError, UnauthorizedError, ValidationError } from '@/errors/customErrors';
import { tokenService } from '@/services/tokenService';

export async function requireAppAdmin(request: NextRequest, appId: string) {
  if (!appId?.trim()) {
    throw new ValidationError('appId is required');
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();

  const token = authHeader.slice(7);
  const claims = await tokenService.verifyAccessToken(token, appId);

  const ADMIN_ROLE_PATTERN = /^[A-Z][A-Z0-9]*(_[A-Z][A-Z0-9]*)*_ADMIN$/;
  const hasAdminRole = claims.appRoles.some((role) => role === 'ADMIN' || ADMIN_ROLE_PATTERN.test(role));
  if (!hasAdminRole) {
    throw new ForbiddenError('Application admin role required');
  }

  return claims;
}
