import { SignJWT, jwtVerify } from 'jose';
import type { AuthUser } from '@/types/auth';
import type { AuthCenterTokenClaims, TokenIssueResult } from '@/types/token';
import { permissionService } from '@/services/permissionService';
import { sessionService } from '@/services/sessionService';
import { SessionRevokedError, UnauthorizedError } from '@/errors/customErrors';
import { getJwtAlgorithm, getJwtKeyId, getSigningKey, getVerificationKey } from '@/lib/jwtKeys';

const ISSUER = process.env.NEXTAUTH_URL ?? 'http://localhost:3001';
const ACCESS_TOKEN_TTL_SEC = 60 * 60 * 8; // 8 hours — match consumer cookie maxAge

export class TokenService {
  async issueAccessToken(
    user: AuthUser,
    appId: string,
    sessionId: string
  ): Promise<TokenIssueResult> {
    const { appRoles, roleVersion } = await permissionService.getTokenClaims(user.id, appId);

    const now = Math.floor(Date.now() / 1000);
    const exp = now + ACCESS_TOKEN_TTL_SEC;
    const canSendDelegatedMail =
      user.authMethod === 'ENTRA' ? user.canSendDelegatedMail : false;

    const claims: Omit<AuthCenterTokenClaims, 'iat' | 'exp'> = {
      sub: user.id,
      userId: user.id,
      employeeId: user.employeeId,
      authMethod: user.authMethod,
      m365Linked: user.m365Linked,
      canSendDelegatedMail,
      departmentId: user.departmentId ?? null,
      appRoles,
      roleVersion,
      sessionId,
      iss: ISSUER,
      aud: appId,
    };

    const accessToken = await new SignJWT(claims as Record<string, unknown>)
      .setProtectedHeader({
        alg: getJwtAlgorithm(),
        ...(getJwtKeyId() ? { kid: getJwtKeyId() } : {}),
      })
      .setIssuedAt()
      .setExpirationTime(exp)
      .sign(await getSigningKey());

    return { accessToken, expiresAt: exp, sessionId };
  }

  async verifyAccessToken(token: string, appId?: string): Promise<AuthCenterTokenClaims> {
    try {
      const { payload } = await jwtVerify(token, await getVerificationKey(), {
        issuer: ISSUER,
        ...(appId && { audience: appId }),
      });
      const claims = payload as unknown as AuthCenterTokenClaims;

      if (!claims.sessionId) {
        throw new UnauthorizedError('Token session is missing');
      }

      const sessionValid = await sessionService.isSessionValid(claims.sessionId);
      if (!sessionValid) {
        throw new SessionRevokedError('Session is no longer valid.');
      }

      return claims;
    } catch (error) {
      if (error instanceof SessionRevokedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }
}

export const tokenService = new TokenService();
