import type { AppRegistration } from '@/app/generated/prisma/client';
import type { Prisma } from '@/app/generated/prisma/client';
import type { CreateAppInput, CreateRoleGrantInput, UpdateAvailableRolesInput } from '@/schemas/adminSchema';
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

  async bulkGrantRole(appId: string, role: string, actorId: string): Promise<number> {
    const app = await this.assertActiveApp(appId);

    const count = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const users = await tx.user.findMany({
        where: { employmentStatus: 'ACTIVE' },
        select: { id: true },
      });

      // Revoke all active grants in this app that are NOT the target role
      await tx.roleGrant.updateMany({
        where: { app: { appId }, isActive: true, role: { not: role } },
        data: { isActive: false },
      });

      // Reactivate any inactive grants that match the target role
      await tx.roleGrant.updateMany({
        where: { app: { appId }, role, isActive: false },
        data: { isActive: true, grantedBy: actorId, grantedAt: new Date() },
      });

      // Find which users already have an active grant now
      const existing = await tx.roleGrant.findMany({
        where: { app: { appId }, role, isActive: true },
        select: { userId: true },
      });
      const grantedIds = new Set(existing.map((g) => g.userId));

      // Create grants for the rest
      const toCreate = users.filter((u) => !grantedIds.has(u.id));
      if (toCreate.length > 0) {
        await tx.roleGrant.createMany({
          data: toCreate.map((u) => ({
            userId: u.id,
            appId: app.id,
            role,
            grantedBy: actorId,
          })),
        });
      }

      return users.length;
    });

    await adminAuditRepository.record({
      actorId,
      action: 'ROLE_GRANTED',
      resourceType: 'RoleGrant',
      targetAppId: appId,
      detail: { role, bulk: true, userCount: count },
    });

    return count;
  }

  async updateAvailableRoles(input: UpdateAvailableRolesInput, actorId: string): Promise<AppRegistration> {
    const app = await this.assertActiveApp(input.appId);
    const normalized = [...new Set(input.roles.map((r) => r.trim().toUpperCase()).filter(Boolean))];
    const updated = await appRegistrationRepository.updateAvailableRoles(input.appId, normalized);

    await adminAuditRepository.record({
      actorId,
      action: 'APP_ROLES_UPDATED',
      resourceType: 'AppRegistration',
      resourceId: app.id,
      targetAppId: app.appId,
      detail: { availableRoles: normalized },
    });

    return updated;
  }

  async revokeAllRolesForUser(userId: string, appId: string, actorId: string): Promise<void> {
    const [user] = await Promise.all([
      userRepository.findById(userId),
      this.assertActiveApp(appId),
    ]);
    if (!user) throw new NotFoundError('User not found');

    await roleGrantRepository.revokeActiveByUserAndApp(userId, appId);

    await adminAuditRepository.record({
      actorId,
      action: 'ROLE_REVOKED',
      resourceType: 'RoleGrant',
      targetUserId: userId,
      targetAppId: appId,
      detail: { role: 'ALL' },
    });
  }
}

export const appRegistrationService = new AppRegistrationService();
