/**
 * Auth Center Consumer SDK
 *
 * Copy this file into consuming apps (QMS, HR Center, etc.) to validate
 * Auth Center JWTs server-side.
 *
 * Requirements in the consuming app:
 *   - AUTH_CENTER_JWKS_URL env variable for production verification
 *   - optionally AUTH_CENTER_SECRET for local/dev HS256 fallback only
 *   - npm install jose
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';

const ISSUER = 'auth-center';

export type AuthMethod = 'ENTRA' | 'LOCAL_PASSWORD' | 'LOCAL_OTP';

export interface AuthCenterTokenClaims {
  sub: string;
  userId: string;
  employeeId: string;
  authMethod: AuthMethod;
  m365Linked: boolean;
  canSendDelegatedMail: boolean;
  departmentId: string | null;
  appRoles: string[];
  roleVersion: string;
  sessionId: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_CENTER_SECRET;
  if (!secret) throw new Error('AUTH_CENTER_SECRET is not configured');
  return new TextEncoder().encode(secret);
}

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  const url = process.env.AUTH_CENTER_JWKS_URL;
  if (!url) throw new Error('AUTH_CENTER_JWKS_URL is not configured');
  return createRemoteJWKSet(new URL(url));
}

export async function validateAuthCenterToken(
  token: string,
  appId: string
): Promise<AuthCenterTokenClaims> {
  if (process.env.AUTH_CENTER_JWKS_URL) {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: ISSUER,
      audience: appId,
    });
    return payload as unknown as AuthCenterTokenClaims;
  }

  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: ISSUER,
    audience: appId,
  });
  return payload as unknown as AuthCenterTokenClaims;
}

export function hasRole(claims: AuthCenterTokenClaims, role: string): boolean {
  return claims.appRoles.includes(role);
}

export async function requireAuthCenterToken(
  request: Request,
  appId: string
): Promise<AuthCenterTokenClaims> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
  return validateAuthCenterToken(authHeader.slice(7), appId);
}
