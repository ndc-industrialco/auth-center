import bcrypt from 'bcryptjs';
import type { Prisma } from '@/app/generated/prisma/client';
import type { TokenIssueResult } from '@/types/token';
import type { AuthUser } from '@/types/auth';
import type { LocalLoginInput } from '@/schemas/authSchema';
import { userRepository } from '@/repositories/userRepository';
import { localCredentialRepository } from '@/repositories/localCredentialRepository';
import { loginAuditRepository } from '@/repositories/loginAuditRepository';
import { sessionService } from '@/services/sessionService';
import { tokenService } from '@/services/tokenService';
import { checkRateLimit } from '@/lib/rateLimit';
import { UnauthorizedError, AccountLockedError, RateLimitError } from '@/errors/customErrors';
import { db } from '@/lib/db';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const RATE_LIMIT_WINDOW_SEC = 300; // 5 minutes
const RATE_LIMIT_MAX = 10;
const DEFAULT_APP_ID = 'default';

export class LocalAuthService {
  async login(
    input: LocalLoginInput,
    ipAddress: string,
    userAgent: string,
    appId: string = DEFAULT_APP_ID,
    requestId?: string
  ): Promise<TokenIssueResult> {
    const rl = await checkRateLimit({
      key: `rl:login:local:${input.employeeId}`,
      limit: RATE_LIMIT_MAX,
      windowSec: RATE_LIMIT_WINDOW_SEC,
    });
    if (!rl.allowed) {
      await this.audit(input.employeeId, null, ipAddress, userAgent, 'FAILED_RATE_LIMIT', 'RATE_LIMIT', undefined, requestId);
      throw new RateLimitError('Too many login attempts. Please try again later.');
    }

    const user = await userRepository.findByEmployeeId(input.employeeId);
    if (!user) {
      await this.audit(input.employeeId, null, ipAddress, userAgent, 'FAILED_NOT_FOUND', 'USER_NOT_FOUND', undefined, requestId);
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.employmentStatus !== 'ACTIVE') {
      await this.audit(input.employeeId, user.id, ipAddress, userAgent, 'FAILED_CREDENTIALS', 'ACCOUNT_INACTIVE', undefined, requestId);
      throw new UnauthorizedError('Invalid credentials');
    }

    const credential = await localCredentialRepository.findByUserId(user.id);
    if (!credential) {
      await this.audit(input.employeeId, user.id, ipAddress, userAgent, 'FAILED_CREDENTIALS', 'NO_LOCAL_CREDENTIAL', undefined, requestId);
      throw new UnauthorizedError('Invalid credentials');
    }

    if (credential.lockedUntil && credential.lockedUntil > new Date()) {
      await this.audit(input.employeeId, user.id, ipAddress, userAgent, 'FAILED_ACCOUNT_LOCKED', 'LOCKED', undefined, requestId);
      throw new AccountLockedError('Account is temporarily locked due to too many failed attempts.');
    }

    const passwordMatch = await bcrypt.compare(input.password, credential.passwordHash);
    if (!passwordMatch) {
      await db.$transaction(async (tx: Prisma.TransactionClient) => {
        const updated = await localCredentialRepository.incrementFailedAttempts(user.id, tx);
        if (updated.failedAttempts >= MAX_FAILED_ATTEMPTS) {
          const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
          await localCredentialRepository.lockAccount(user.id, lockedUntil, tx);
        }
        await loginAuditRepository.record({
          employeeId: input.employeeId,
          authMethod: 'LOCAL_PASSWORD',
          outcome: 'FAILED_CREDENTIALS',
          ipAddress,
          userAgent,
          failReason: 'BAD_PASSWORD',
          ...(requestId && { requestId }),
          user: { connect: { id: user.id } },
        }, tx);
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    await localCredentialRepository.resetFailedAttempts(user.id);

    const session = await sessionService.createSession(user.id, 'LOCAL_PASSWORD', ipAddress, userAgent);

    const userWithProfile = await userRepository.findWithProfile(user.id);
    const authUser: AuthUser = {
      id: user.id,
      employeeId: user.employeeId,
      email: user.email,
      displayName: user.displayName,
      m365Linked: user.m365Linked,
      canSendDelegatedMail: user.canSendDelegatedMail,
      employmentStatus: 'ACTIVE',
      defaultAuthMethod: 'LOCAL_PASSWORD',
      authMethod: 'LOCAL_PASSWORD',
      departmentId: userWithProfile?.profile?.departmentId ?? null,
    };

    const result = await tokenService.issueAccessToken(authUser, appId, session.sessionId);

    await this.audit(input.employeeId, user.id, ipAddress, userAgent, 'SUCCESS', null, session.sessionId, requestId);

    return result;
  }

  private async audit(
    employeeId: string,
    userId: string | null,
    ipAddress: string,
    userAgent: string,
    outcome: string,
    failReason: string | null,
    sessionId?: string,
    requestId?: string
  ): Promise<void> {
    await loginAuditRepository.record({
      employeeId,
      authMethod: 'LOCAL_PASSWORD',
      outcome: outcome as never,
      ipAddress,
      userAgent,
      ...(failReason && { failReason }),
      ...(sessionId && { sessionId }),
      ...(requestId && { requestId }),
      ...(userId && { user: { connect: { id: userId } } }),
    });
  }
}

export const localAuthService = new LocalAuthService();
