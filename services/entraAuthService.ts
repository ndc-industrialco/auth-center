import type { Prisma } from '@/app/generated/prisma/client';
import type { AuthUser, EntraProfile } from '@/types/auth';
import type { EntraLinkInput } from '@/schemas/authSchema';
import { userRepository } from '@/repositories/userRepository';
import { externalIdentityLinkRepository } from '@/repositories/externalIdentityLinkRepository';
import { identityAccountRepository } from '@/repositories/identityAccountRepository';
import { loginAuditRepository } from '@/repositories/loginAuditRepository';
import { defaultRolePolicyService } from '@/services/defaultRolePolicyService';
import { IdentityLinkError, NotFoundError, UnauthorizedError } from '@/errors/customErrors';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export class EntraAuthService {
  /**
   * Called after successful Entra ID sign-in via Auth.js callback.
   * Finds or creates the canonical User record, syncs EmployeeProfile from Graph data,
   * and applies default role grants on first sign-in.
   */
  async handleEntraSignIn(
    profile: EntraProfile,
    ipAddress: string,
    userAgent: string
  ): Promise<AuthUser> {
    const entraObjectId = profile.sub;

    let link = await externalIdentityLinkRepository.findByEntraObjectId(entraObjectId);
    let user = link ? await userRepository.findById(link.userId) : null;

    if (!user && profile.email) {
      user = await userRepository.findByEmail(profile.email);
    }

    let newlyCreated = false;

    if (!user) {
      if (!profile.employeeId) {
        await loginAuditRepository.record({
          authMethod: 'ENTRA',
          outcome: 'FAILED_ENTRA_ERROR',
          ipAddress,
          userAgent,
          failReason: 'NO_EMPLOYEE_ID_IN_PROFILE',
        });
        throw new UnauthorizedError('Entra profile does not contain a mapped employee ID.');
      }

      try {
        user = await db.$transaction(async (tx: Prisma.TransactionClient) => {
          const created = await userRepository.create(
            {
              employeeId: profile.employeeId!,
              email:       profile.email,
              displayName: profile.name,
              m365Linked:  true,
              canSendDelegatedMail: false,
              defaultAuthMethod: 'ENTRA',
            },
            tx
          );
          await identityAccountRepository.upsert(created.id, 'ENTRA', entraObjectId, tx);
          return created;
        });
        newlyCreated = true;
      } catch (err: unknown) {
        const isUniqueViolation = err instanceof Error && err.message.includes('Unique constraint');
        if (!isUniqueViolation) throw err;
        user = await userRepository.findByEmployeeId(profile.employeeId);
        if (!user) throw err;
      }
    }

    if (!link) {
      try {
        link = await externalIdentityLinkRepository.create(
          user.id,
          entraObjectId,
          profile.preferred_username ?? profile.email,
          'AUTO_SYNC'
        );
      } catch (err: unknown) {
        const isUniqueViolation = err instanceof Error && err.message.includes('Unique constraint');
        if (!isUniqueViolation) throw err;
        link = await externalIdentityLinkRepository.findByEntraObjectId(entraObjectId);
        if (!link) throw err;
      }
    }

    await userRepository.updateM365Status(user.id, true, user.canSendDelegatedMail);

    // Sync EmployeeProfile from Graph data on every sign-in (keeps department/title current)
    await this.syncEmployeeProfile(user.id, profile);

    // Apply default role policies on first sign-in only (fail-safe)
    if (newlyCreated) {
      await defaultRolePolicyService.applyDefaultGrants(
        user.id,
        'ENTRA',
        profile.department ?? null
      );
    }

    await loginAuditRepository.record({
      user:       { connect: { id: user.id } },
      employeeId: user.employeeId,
      authMethod: 'ENTRA',
      outcome:    'SUCCESS',
      ipAddress,
      userAgent,
    });

    const userWithProfile = await userRepository.findWithProfile(user.id);

    return {
      id:                   user.id,
      employeeId:           user.employeeId,
      email:                user.email,
      displayName:          user.displayName,
      m365Linked:           true,
      canSendDelegatedMail: user.canSendDelegatedMail,
      employmentStatus:     user.employmentStatus as 'ACTIVE',
      defaultAuthMethod:    'ENTRA' as const,
      authMethod:           'ENTRA' as const,
      departmentId:         userWithProfile?.profile?.departmentId ?? null,
    };
  }

  /**
   * Upsert EmployeeProfile with latest HR data from Graph.
   * Runs on every Entra sign-in so department/title stay current.
   */
  private async syncEmployeeProfile(userId: string, profile: EntraProfile): Promise<void> {
    try {
      const departmentCode = profile.department?.trim().toUpperCase() ?? null;

      if (departmentCode) {
        await db.department.upsert({
          where: { code: departmentCode },
          create: { code: departmentCode, displayName: profile.department!, source: 'GRAPH', syncedAt: new Date() },
          update: { displayName: profile.department!, syncedAt: new Date() },
        });
      }

      await db.employeeProfile.upsert({
        where: { userId },
        create: {
          userId,
          department:     profile.department ?? null,
          departmentId:   departmentCode,
          jobTitle:       profile.jobTitle ?? null,
          officeLocation: profile.officeLocation ?? null,
          mobilePhone:    profile.mobilePhone ?? null,
        },
        update: {
          department:     profile.department ?? null,
          departmentId:   departmentCode,
          jobTitle:       profile.jobTitle ?? null,
          officeLocation: profile.officeLocation ?? null,
          mobilePhone:    profile.mobilePhone ?? null,
        },
      });
    } catch (err) {
      // Non-critical — log and continue
      logger.warn('Failed to sync EmployeeProfile from Entra', { userId, error: String(err) });
    }
  }

  async linkEntraToUser(userId: string, input: EntraLinkInput): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const existing = await externalIdentityLinkRepository.findByEntraObjectId(input.entraObjectId);
    if (existing && existing.userId !== userId) {
      throw new IdentityLinkError('This Entra identity is already linked to another user.');
    }
    if (existing && existing.userId === userId) return;

    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await externalIdentityLinkRepository.create(
        userId, input.entraObjectId, input.entraUpn, 'ADMIN_LINK', tx
      );
      await identityAccountRepository.upsert(userId, 'ENTRA', input.entraObjectId, tx);
      await userRepository.updateM365Status(userId, true, user.canSendDelegatedMail, tx);
    });

    logger.info('Entra identity linked to user', { userId, entraObjectId: input.entraObjectId });
  }

  async unlinkEntra(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await externalIdentityLinkRepository.deleteByUserId(userId, tx);
      await identityAccountRepository.deactivate(userId, 'ENTRA', tx);
      await userRepository.updateM365Status(userId, false, false, tx);
    });

    logger.info('Entra identity unlinked from user', { userId });
  }
}

export const entraAuthService = new EntraAuthService();
