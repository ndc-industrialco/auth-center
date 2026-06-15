import bcrypt from 'bcryptjs';
import type { AppRegistration, ConsumerAppSession } from '@/app/generated/prisma/client';
import type {
  ConsumerSessionHeartbeatInput,
  ConsumerSessionRegisterInput,
  ConsumerSessionRevokeInput,
} from '@/schemas/consumerAppSessionSchema';
import { appRegistrationRepository } from '@/repositories/appRegistrationRepository';
import { consumerAppSessionRepository } from '@/repositories/consumerAppSessionRepository';
import { userRepository } from '@/repositories/userRepository';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '@/errors/customErrors';

export class ConsumerAppSessionService {
  async authenticateConsumerApp(appId: string, appSecret: string): Promise<AppRegistration> {
    const app = await appRegistrationRepository.findByAppId(appId);
    if (!app || !app.isActive) {
      throw new UnauthorizedError('Consumer app not found or inactive');
    }
    if (!app.secretHash) {
      throw new UnauthorizedError('Consumer app secret is not configured');
    }

    const valid = await bcrypt.compare(appSecret, app.secretHash);
    if (!valid) {
      throw new UnauthorizedError('Consumer app authentication failed');
    }

    return app;
  }

  async registerSession(
    app: AppRegistration,
    input: ConsumerSessionRegisterInput,
  ): Promise<ConsumerAppSession> {
    if (input.appId !== app.appId) {
      throw new ForbiddenError('Payload appId does not match authenticated consumer app');
    }

    const user = await userRepository.findById(input.authUserId);
    if (!user) {
      throw new NotFoundError('Target user not found');
    }
    if (input.employeeId && user.employeeId !== input.employeeId) {
      throw new ValidationError('employeeId does not match target user');
    }

    const loginAt = new Date(input.loginAt);
    const lastSeenAt = new Date(input.lastSeenAt);
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

    return consumerAppSessionRepository.upsertByAppAndSession(
      app.id,
      input.sessionId,
      {
        sessionId: input.sessionId,
        employeeId: input.employeeId ?? user.employeeId,
        appRoles: input.appRoles,
        effectiveRole: input.effectiveRole,
        loginAt,
        lastSeenAt,
        ...(expiresAt ? { expiresAt } : {}),
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        status: 'ACTIVE',
        user: { connect: { id: user.id } },
        app: { connect: { id: app.id } },
      },
      {
        employeeId: input.employeeId ?? user.employeeId,
        appRoles: input.appRoles,
        effectiveRole: input.effectiveRole,
        loginAt,
        lastSeenAt,
        expiresAt,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        status: 'ACTIVE',
        revokedAt: null,
        revokeReason: null,
      },
    );
  }

  async heartbeatSession(
    app: AppRegistration,
    input: ConsumerSessionHeartbeatInput,
  ): Promise<ConsumerAppSession> {
    if (input.appId !== app.appId) {
      throw new ForbiddenError('Payload appId does not match authenticated consumer app');
    }

    const existing = await consumerAppSessionRepository.findByAppAndSession(app.id, input.sessionId);
    if (!existing) {
      throw new NotFoundError('Consumer app session not found');
    }
    if (existing.status !== 'ACTIVE') {
      throw new ForbiddenError('Only active consumer app sessions can be heartbeated');
    }

    return consumerAppSessionRepository.touchSession(app.id, input.sessionId, new Date(input.lastSeenAt));
  }

  async revokeSession(
    app: AppRegistration,
    input: ConsumerSessionRevokeInput,
  ): Promise<ConsumerAppSession> {
    if (input.appId !== app.appId) {
      throw new ForbiddenError('Payload appId does not match authenticated consumer app');
    }

    const existing = await consumerAppSessionRepository.findByAppAndSession(app.id, input.sessionId);
    if (!existing) {
      throw new NotFoundError('Consumer app session not found');
    }
    if (existing.status !== 'ACTIVE') {
      return existing;
    }

    const status = input.reason === 'LOGOUT' || input.reason === 'APP_LOGOUT' ? 'LOGGED_OUT' : 'REVOKED';
    return consumerAppSessionRepository.revokeSession(
      app.id,
      input.sessionId,
      status,
      new Date(input.revokedAt),
      input.reason,
    );
  }
}

export const consumerAppSessionService = new ConsumerAppSessionService();
