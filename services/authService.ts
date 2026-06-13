import type { TokenIssueResult } from '@/types/token';
import type { LocalLoginInput } from '@/schemas/authSchema';
import type { AuthUser } from '@/types/auth';
import { localAuthService } from '@/services/localAuthService';
import { sessionService } from '@/services/sessionService';
import { tokenService } from '@/services/tokenService';
import { permissionService } from '@/services/permissionService';
import { appRegistrationService } from '@/services/appRegistrationService';
import { userRepository } from '@/repositories/userRepository';
import { sessionRepository } from '@/repositories/sessionRepository';
import { ForbiddenError, NotFoundError, SessionRevokedError } from '@/errors/customErrors';

const DEFAULT_APP_ID = 'default';

export class AuthService {
  async loginLocal(
    input: LocalLoginInput,
    ipAddress: string,
    userAgent: string,
    appId: string = DEFAULT_APP_ID,
    requestId?: string
  ): Promise<TokenIssueResult> {
    await appRegistrationService.assertActiveApp(appId);
    return localAuthService.login(input, ipAddress, userAgent, appId, requestId);
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    await sessionService.revokeSession(sessionId, userId);
  }

  async refreshToken(sessionId: string, appId: string = DEFAULT_APP_ID): Promise<TokenIssueResult> {
    await appRegistrationService.assertActiveApp(appId);
    const valid = await sessionService.isSessionValid(sessionId);
    if (!valid) throw new SessionRevokedError('Session is no longer valid.');

    const session = await sessionRepository.findBySessionId(sessionId);
    if (!session) throw new SessionRevokedError('Session not found.');

    const userWithProfile = await userRepository.findWithProfile(session.userId);
    if (!userWithProfile) throw new NotFoundError('User not found.');

    const authUser: AuthUser = {
      id: userWithProfile.id,
      employeeId: userWithProfile.employeeId,
      email: userWithProfile.email,
      displayName: userWithProfile.displayName,
      m365Linked: userWithProfile.m365Linked,
      canSendDelegatedMail: userWithProfile.canSendDelegatedMail,
      employmentStatus: userWithProfile.employmentStatus as AuthUser['employmentStatus'],
      defaultAuthMethod: userWithProfile.defaultAuthMethod as AuthUser['defaultAuthMethod'],
      authMethod: session.authMethod as AuthUser['authMethod'],
      departmentId: userWithProfile.profile?.departmentId ?? null,
    };

    return tokenService.issueAccessToken(authUser, appId, sessionId);
  }

  ensureAudienceAccess(claimsAppId: string, requestedAppId: string): void {
    if (claimsAppId !== requestedAppId) {
      throw new ForbiddenError('Cross-application token use is not allowed');
    }
  }

  async getMe(
    userId: string,
    appId: string = DEFAULT_APP_ID
  ): Promise<Omit<AuthUser, 'authMethod'> & { roles: string[]; department: string | null; jobTitle: string | null; officeLocation: string | null; mobilePhone: string | null }> {
    const userWithProfile = await userRepository.findWithProfile(userId);
    if (!userWithProfile) throw new NotFoundError('User not found.');

    const roles = await permissionService.getEffectiveRoles(userId, appId);

    return {
      id: userWithProfile.id,
      employeeId: userWithProfile.employeeId,
      email: userWithProfile.email,
      displayName: userWithProfile.displayName,
      m365Linked: userWithProfile.m365Linked,
      canSendDelegatedMail: userWithProfile.canSendDelegatedMail,
      employmentStatus: userWithProfile.employmentStatus as AuthUser['employmentStatus'],
      defaultAuthMethod: userWithProfile.defaultAuthMethod as AuthUser['defaultAuthMethod'],
      departmentId: userWithProfile.profile?.departmentId ?? null,
      department: userWithProfile.profile?.department ?? null,
      jobTitle: userWithProfile.profile?.jobTitle ?? null,
      officeLocation: userWithProfile.profile?.officeLocation ?? null,
      mobilePhone: userWithProfile.profile?.mobilePhone ?? null,
      roles,
    };
  }

  async validateToken(token: string, appId?: string) {
    return tokenService.verifyAccessToken(token, appId);
  }
}

export const authService = new AuthService();
