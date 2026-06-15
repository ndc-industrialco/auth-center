import { NextResponse } from 'next/server';
import { getJwtAlgorithm } from '@/lib/jwtKeys';

/**
 * Issuer metadata endpoint for consuming apps.
 */
export async function GET() {
  const issuer = process.env.AUTH_URL ?? 'http://localhost:3001';

  return NextResponse.json({
    issuer: 'auth-center',
    issuer_url: issuer,
    algorithm: getJwtAlgorithm(),
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    token_endpoint: `${issuer}/api/auth/login/local`,
    token_entra_endpoint: `${issuer}/api/auth/login/entra`,
    refresh_endpoint: `${issuer}/api/auth/refresh`,
    revocation_endpoint: `${issuer}/api/auth/logout`,
    introspection_endpoint: `${issuer}/api/auth/me`,
    claims_supported: [
      'sub',
      'userId',
      'employeeId',
      'authMethod',
      'm365Linked',
      'canSendDelegatedMail',
      'departmentId',
      'appRoles',
      'roleVersion',
      'sessionId',
      'iss',
      'aud',
      'iat',
      'exp',
    ],
    auth_methods_supported: ['ENTRA', 'LOCAL_PASSWORD', 'LOCAL_OTP'],
    token_ttl_seconds: 2592000,
  });
}
