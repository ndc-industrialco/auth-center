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

  // Generic delegated-admin convention for all consumer apps:
  // - ADMIN / IT (simple app-local roles)
  // - any app-scoped role ending with _ADMIN or _IT, e.g. QMS_ADMIN, QMS_IT, HR_CENTER_IT
  const APP_ADMIN_ROLE_PATTERN = /(?:^|_)(ADMIN|IT)$/;
  const hasAdminRole = claims.appRoles.some((role) => role === 'ADMIN' || role === 'IT' || APP_ADMIN_ROLE_PATTERN.test(role));
  if (!hasAdminRole) {
    throw new ForbiddenError('Application admin or IT role required');
  }

  return claims;
}
