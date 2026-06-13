import type { NextRequest } from 'next/server';
import { tokenService } from '@/services/tokenService';
import { permissionService } from '@/services/permissionService';
import type { AuthCenterTokenClaims } from '@/types/token';
import { UnauthorizedError, ForbiddenError } from '@/errors/customErrors';

const AUTH_CENTER_APP_ID = 'auth-center';
const ADMIN_ROLE = 'ADMIN';

/**
 * Validates the Bearer token and checks that the caller has the ADMIN role
 * in the auth-center app. Throws ForbiddenError or UnauthorizedError on failure.
 */
export async function requireAdmin(request: NextRequest): Promise<AuthCenterTokenClaims> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();

  const token = authHeader.slice(7);
  const claims = await tokenService.verifyAccessToken(token, AUTH_CENTER_APP_ID);

  // Check roles either from token claim (fast) or live DB (authoritative)
  const hasAdminInToken = claims.appRoles.includes(ADMIN_ROLE);
  if (!hasAdminInToken) {
    const roles = await permissionService.getEffectiveRoles(claims.userId, AUTH_CENTER_APP_ID);
    if (!roles.includes(ADMIN_ROLE)) {
      throw new ForbiddenError('Admin role required');
    }
  }

  return claims;
}
