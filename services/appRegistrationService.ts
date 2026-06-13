import type { AppRegistration } from '@/app/generated/prisma/client';
import type { Prisma } from '@/app/generated/prisma/client';
import type { CreateAppInput, CreateRoleGrantInput } from '@/schemas/adminSchema';
import { db } from '@/lib/db';
import { appRegistrationRepository } from '@/repositories/appRegistrationRepository';
import { roleGrantRepository } from '@/repositories/roleGrantRepository';
import { userRepository } from '@/repositories/userRepository';
import { adminAuditRepository } from '@/repositories/adminAuditRepository';
import { ConflictError, NotFoundError } from '@/errors/customErrors';

export class AppRegistrationService {
  async assertActiveApp(appId: string): Promise<AppRegistration> {
    const app = await appRegistrationRepository.findByAppId(appId);
    if (!app || !app.isActive) {
      throw new NotFoundError(`App '${appId}' not found or inactive`);
    }

    return app;
  }

  async registerApp(input: CreateAppInput, actorId: string): Promise<AppRegistration> {
    const existing = await appRegistrationRepository.findByAppId(input.appId);
    if (existing) throw new ConflictError(`App '${input.appId}' is already registered.`);

    const app = await appRegistrationRepository.create(input);

    await adminAuditRepository.record({
      actorId,
      action: 'APP_REGISTERED',
      resourceType: 'AppRegistration',
      resourceId: app.id,
      targetAppId: app.appId,
      detail: { appId: app.appId, displayName: app.displayName },
    });

    return app;
  }

  async listApps(): Promise<AppRegistration[]> {
    return appRegistrationRepository.findAllActive();
  }

  async grantRole(input: CreateRoleGrantInput, actorId: string): Promise<void> {
    const [user] = await Promise.all([
      userRepository.findById(input.userId),
      this.assertActiveApp(input.appId),
    ]);
    if (!user) throw new NotFoundError('User not found');

    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const activeGrants = await roleGrantRepository.findActiveByUserAndApp(input.userId, input.appId, tx);
      const sameActiveGrant = activeGrants.find((grant) => grant.role === input.role) ?? null;
      const replacedRoles = activeGrants.filter((grant) => grant.role !== input.role).map((grant) => grant.role);

      if (sameActiveGrant && replacedRoles.length === 0) {
        return;
      }

      // Revoke only the roles being replaced — do NOT revoke the target role if already active
      // (avoids a brief permission gap when the same role is being "re-granted" alongside removals)
      await roleGrantRepository.revokeActiveByUserAndAppExcept(input.userId, input.appId, input.role, tx);

      let grant = sameActiveGrant;
      if (!grant) {
        const existingGrant = await roleGrantRepository.findByUserAndAppAndRole(input.userId, input.appId, input.role, tx);
        grant = existingGrant
          ? await roleGrantRepository.reactivate(existingGrant.id, actorId, expiresAt, tx)
          : await roleGrantRepository.grant(
              {
                user: { connect: { id: input.userId } },
                app: { connect: { appId: input.appId } },
                role: input.role,
                grantedBy: actorId,
                ...(expiresAt && { expiresAt }),
              },
              tx,
            );
      }

      await adminAuditRepository.record(
        {
          actorId,
          action: 'ROLE_GRANTED',
          resourceType: 'RoleGrant',
          resourceId: grant.id,
          targetUserId: input.userId,
          targetAppId: input.appId,
          detail: {
            role: input.role,
            expiresAt: input.expiresAt,
            replacedRoles,
          },
        },
        tx,
      );

    });
  }

  async revokeRole(grantId: string, actorId: string): Promise<void> {
    const grant = await roleGrantRepository.revoke(grantId);

    await adminAuditRepository.record({
      actorId,
      action: 'ROLE_REVOKED',
      resourceType: 'RoleGrant',
      resourceId: grantId,
      targetUserId: grant.userId,
      targetAppId: grant.appId,
      detail: { role: grant.role },
    });
  }
}

export const appRegistrationService = new AppRegistrationService();
