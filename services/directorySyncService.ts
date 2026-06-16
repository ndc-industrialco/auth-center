import type { Prisma } from '@/app/generated/prisma/client';
import { db } from '@/lib/db';
import {
  addGraphGroupMember,
  fetchGraphDirectoryUsers,
  fetchGraphGroupById,
  fetchGraphGroupMembers,
  fetchGraphMailEnabledGroups,
  fetchGraphUserById,
  removeGraphGroupMember,
  updateGraphUserProfile,
} from '@/lib/graphAdminClient';
import { adminAuditRepository } from '@/repositories/adminAuditRepository';
import { directorySyncLogService } from '@/services/directorySyncLogService';
import { NotFoundError } from '@/errors/customErrors';

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
}

interface SingleSyncResult {
  entityId: string;
  updated: boolean;
}

function normalizeDepartmentCode(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
}

function deriveEmployeeId(input: {
  employeeId?: string;
  onPremisesSamAccountName?: string;
  userPrincipalName?: string;
  mail?: string;
  entraId: string;
}): string {
  return (
    input.onPremisesSamAccountName?.trim() ||
    input.employeeId?.trim() ||
    input.userPrincipalName?.split('@')[0]?.trim() ||
    input.mail?.split('@')[0]?.trim() ||
    `ENTRA-${input.entraId.slice(0, 12)}`
  );
}

export class DirectorySyncService {
  private async upsertUserFromGraphUser(
    tx: Prisma.TransactionClient,
    graphUser: {
      id: string;
      displayName?: string;
      mail?: string;
      userPrincipalName?: string;
      onPremisesSamAccountName?: string;
      employeeId?: string;
      department?: string;
      jobTitle?: string;
      officeLocation?: string;
      mobilePhone?: string;
      accountEnabled?: boolean;
    }
  ): Promise<{ userId: string; created: boolean }> {
    const employeeId = deriveEmployeeId({
      employeeId: graphUser.employeeId,
      onPremisesSamAccountName: graphUser.onPremisesSamAccountName,
      userPrincipalName: graphUser.userPrincipalName,
      mail: graphUser.mail,
      entraId: graphUser.id,
    });
    const departmentCode = normalizeDepartmentCode(graphUser.department);

    const existingLink = await tx.externalIdentityLink.findUnique({
      where: { entraObjectId: graphUser.id },
    });

    let user = existingLink
      ? await tx.user.findUnique({ where: { id: existingLink.userId } })
      : null;

    if (!user) {
      user = await tx.user.findUnique({ where: { employeeId } });
    }

    if (!user && graphUser.mail) {
      user = await tx.user.findUnique({ where: { email: graphUser.mail } });
    }

    const userData = {
      employeeId,
      email: graphUser.mail ?? graphUser.userPrincipalName ?? null,
      displayName: graphUser.displayName ?? employeeId,
      m365Linked: true,
      canSendDelegatedMail: false,
      defaultAuthMethod: 'ENTRA' as const,
      employmentStatus: graphUser.accountEnabled === false ? 'INACTIVE' as const : 'ACTIVE' as const,
    };

    const created = !user;
    if (!user) {
      user = await tx.user.create({ data: userData });
    } else {
      user = await tx.user.update({
        where: { id: user.id },
        data: userData,
      });
    }

    await tx.identityAccount.upsert({
      where: { userId_type: { userId: user.id, type: 'ENTRA' } },
      create: {
        userId: user.id,
        type: 'ENTRA',
        providerAccountId: graphUser.id,
        isActive: true,
      },
      update: {
        providerAccountId: graphUser.id,
        isActive: true,
      },
    });

    await tx.externalIdentityLink.upsert({
      where: { entraObjectId: graphUser.id },
      create: {
        userId: user.id,
        entraObjectId: graphUser.id,
        entraUpn: graphUser.userPrincipalName ?? graphUser.mail ?? undefined,
        linkedByMethod: 'DIRECTORY_SYNC',
      },
      update: {
        userId: user.id,
        entraUpn: graphUser.userPrincipalName ?? graphUser.mail ?? undefined,
      },
    });

    if (departmentCode) {
      await tx.department.upsert({
        where: { code: departmentCode },
        create: {
          code: departmentCode,
          displayName: graphUser.department ?? departmentCode,
          source: 'GRAPH',
          syncedAt: new Date(),
        },
        update: {
          displayName: graphUser.department ?? departmentCode,
          syncedAt: new Date(),
        },
      });
    }

    await tx.employeeProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        departmentId: departmentCode,
        department: graphUser.department ?? null,
        jobTitle: graphUser.jobTitle ?? null,
        officeLocation: graphUser.officeLocation ?? null,
        mobilePhone: graphUser.mobilePhone ?? null,
      },
      update: {
        departmentId: departmentCode,
        department: graphUser.department ?? null,
        jobTitle: graphUser.jobTitle ?? null,
        officeLocation: graphUser.officeLocation ?? null,
        mobilePhone: graphUser.mobilePhone ?? null,
      },
    });

    return { userId: user.id, created };
  }

  private async resolveSingleGraphUser(localUserId: string) {
    const localUser = await db.user.findUnique({
      where: { id: localUserId },
      include: { externalLinks: true },
    });
    if (!localUser) throw new NotFoundError('User not found');

    if (localUser.externalLinks[0]?.entraObjectId) {
      const graphUser = await fetchGraphUserById(localUser.externalLinks[0].entraObjectId);
      return { localUser, graphUser };
    }

    const graphUsers = await fetchGraphDirectoryUsers();
    const matched = graphUsers.find((graphUser) => {
      const employeeId = deriveEmployeeId({
        employeeId: graphUser.employeeId,
        onPremisesSamAccountName: graphUser.onPremisesSamAccountName,
        userPrincipalName: graphUser.userPrincipalName,
        mail: graphUser.mail,
        entraId: graphUser.id,
      });

      return (
        employeeId === localUser.employeeId ||
        (localUser.email && (
          graphUser.mail?.toLowerCase() === localUser.email.toLowerCase() ||
          graphUser.userPrincipalName?.toLowerCase() === localUser.email.toLowerCase()
        ))
      );
    });

    if (!matched) {
      throw new NotFoundError('Matching Microsoft 365 user not found');
    }

    return { localUser, graphUser: matched };
  }

  async syncUsersFromGraph(actorId: string): Promise<SyncResult> {
    const graphUsers = await fetchGraphDirectoryUsers();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const graphUser of graphUsers) {
      try {
        const result = await db.$transaction(async (tx: Prisma.TransactionClient) =>
          this.upsertUserFromGraphUser(tx, graphUser)
        );

        if (result.created) created += 1;
        else updated += 1;
      } catch {
        skipped += 1;
      }
    }

    await this.rebuildDepartments(actorId);

    await adminAuditRepository.record({
      actorId,
      action: 'DIRECTORY_USERS_SYNCED',
      resourceType: 'DirectorySync',
      detail: { created, updated, skipped },
    });

    return { created, updated, skipped };
  }

  async syncSingleUserFromGraph(actorId: string, userId: string): Promise<SingleSyncResult> {
    try {
      const { localUser, graphUser } = await this.resolveSingleGraphUser(userId);

      await db.$transaction(async (tx: Prisma.TransactionClient) => {
        await this.upsertUserFromGraphUser(tx, graphUser);
      });

      await this.rebuildDepartments(actorId);

      await adminAuditRepository.record({
        actorId,
        action: 'DIRECTORY_USERS_SYNCED',
        resourceType: 'User',
        targetUserId: localUser.id,
        detail: { mode: 'single', employeeId: localUser.employeeId, entraObjectId: graphUser.id },
      });

      await directorySyncLogService.record({
        entityType: 'USER',
        entityId: localUser.id,
        direction: 'PULL',
        status: 'SUCCESS',
        requestedBy: actorId,
        summary: {
          employeeId: localUser.employeeId,
          entraObjectId: graphUser.id,
        },
      });

      return { entityId: localUser.id, updated: true };
    } catch (error) {
      await directorySyncLogService.record({
        entityType: 'USER',
        entityId: userId,
        direction: 'PULL',
        status: 'FAILED',
        requestedBy: actorId,
        errorMessage: error instanceof Error ? error.message : 'Failed to sync user from M365',
      });
      throw error;
    }
  }

  async syncGroupsFromGraph(actorId: string): Promise<SyncResult> {
    const groups = await fetchGraphMailEnabledGroups();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const group of groups) {
      try {
        const members = await fetchGraphGroupMembers(group.id);

        await db.$transaction(async (tx: Prisma.TransactionClient) => {
          const existing = await tx.emailGroup.findUnique({
            where: { entraGroupId: group.id },
          });

          const localGroup = existing
            ? await tx.emailGroup.update({
                where: { id: existing.id },
                data: {
                  displayName: group.displayName ?? group.mail ?? group.id,
                  mail: group.mail ?? null,
                  description: group.description ?? null,
                  securityEnabled: group.securityEnabled ?? false,
                  mailEnabled: group.mailEnabled ?? true,
                  groupTypes: group.groupTypes?.join(',') ?? null,
                  memberCount: members.length,
                  syncedAt: new Date(),
                },
              })
            : await tx.emailGroup.create({
                data: {
                  entraGroupId: group.id,
                  displayName: group.displayName ?? group.mail ?? group.id,
                  mail: group.mail ?? null,
                  description: group.description ?? null,
                  securityEnabled: group.securityEnabled ?? false,
                  mailEnabled: group.mailEnabled ?? true,
                  groupTypes: group.groupTypes?.join(',') ?? null,
                  memberCount: members.length,
                  syncedAt: new Date(),
                },
              });

          if (existing) updated += 1;
          else created += 1;

          await tx.emailGroupMember.deleteMany({
            where: { groupId: localGroup.id },
          });

          for (const member of members) {
            const link = await tx.externalIdentityLink.findUnique({
              where: { entraObjectId: member.id },
            });
            let resolvedUserId = link?.userId ?? null;

            if (!resolvedUserId && member.mail) {
              const user = await tx.user.findUnique({ where: { email: member.mail } });
              resolvedUserId = user?.id ?? null;
            }

            await tx.emailGroupMember.create({
              data: {
                groupId: localGroup.id,
                userId: resolvedUserId,
                entraObjectId: member.id,
                email: member.mail ?? member.userPrincipalName ?? null,
                displayName: member.displayName ?? null,
                memberType: member['@odata.type'] ?? null,
                syncedAt: new Date(),
              },
            });
          }
        });
      } catch {
        skipped += 1;
      }
    }

    await adminAuditRepository.record({
      actorId,
      action: 'DIRECTORY_GROUPS_SYNCED',
      resourceType: 'DirectorySync',
      detail: { created, updated, skipped },
    });

    return { created, updated, skipped };
  }

  async syncSingleGroupFromGraph(actorId: string, localGroupId: string): Promise<SingleSyncResult> {
    try {
      const group = await db.emailGroup.findUnique({ where: { id: localGroupId } });
      if (!group) throw new NotFoundError('Email group not found');

      const [graphGroup, members] = await Promise.all([
        fetchGraphGroupById(group.entraGroupId),
        fetchGraphGroupMembers(group.entraGroupId),
      ]);

      await db.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.emailGroup.update({
          where: { id: localGroupId },
          data: {
            displayName: graphGroup.displayName ?? graphGroup.mail ?? graphGroup.id,
            mail: graphGroup.mail ?? null,
            description: graphGroup.description ?? null,
            securityEnabled: graphGroup.securityEnabled ?? false,
            mailEnabled: graphGroup.mailEnabled ?? true,
            groupTypes: graphGroup.groupTypes?.join(',') ?? null,
            memberCount: members.length,
            syncedAt: new Date(),
          },
        });
      });

      await this.syncSingleGroup(localGroupId);

      await adminAuditRepository.record({
        actorId,
        action: 'DIRECTORY_GROUPS_SYNCED',
        resourceType: 'EmailGroup',
        resourceId: localGroupId,
        detail: { mode: 'single', entraGroupId: group.entraGroupId, memberCount: members.length },
      });

      await directorySyncLogService.record({
        entityType: 'GROUP',
        entityId: localGroupId,
        direction: 'PULL',
        status: 'SUCCESS',
        requestedBy: actorId,
        summary: {
          entraGroupId: group.entraGroupId,
          memberCount: members.length,
        },
      });

      return { entityId: localGroupId, updated: true };
    } catch (error) {
      await directorySyncLogService.record({
        entityType: 'GROUP',
        entityId: localGroupId,
        direction: 'PULL',
        status: 'FAILED',
        requestedBy: actorId,
        errorMessage: error instanceof Error ? error.message : 'Failed to sync group from M365',
      });
      throw error;
    }
  }

  async rebuildDepartments(actorId: string): Promise<number> {
    // Count only ACTIVE users — consistent with what the detail page displays.
    const profiles = await db.employeeProfile.findMany({
      where: {
        departmentId: { not: null },
        user: { employmentStatus: 'ACTIVE' },
      },
      select: { departmentId: true, department: true },
    });

    const counts = new Map<string, { displayName: string; count: number }>();
    for (const profile of profiles) {
      if (!profile.departmentId) continue;
      const current = counts.get(profile.departmentId) ?? {
        displayName: profile.department ?? profile.departmentId,
        count: 0,
      };
      current.count += 1;
      counts.set(profile.departmentId, current);
    }

    const updatedCodes = [...counts.keys()];

    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Use upsert instead of deleteMany+create.
      // deleteMany triggers onDelete: SetNull cascade and nulls EmployeeProfile.departmentId
      // for every affected row — the newly created departments would then have 0 members.
      for (const [code, value] of counts.entries()) {
        await tx.department.upsert({
          where: { code },
          create: {
            code,
            displayName: value.displayName,
            userCount: value.count,
            source: 'GRAPH',
            syncedAt: new Date(),
          },
          update: {
            displayName: value.displayName,
            userCount: value.count,
            syncedAt: new Date(),
          },
        });
      }

      // Restore departmentId for profiles where it was previously nulled by cascade delete
      // but the department display name is still intact. This heals data from prior runs
      // that used the deleteMany+create pattern.
      const orphanedProfiles = await tx.employeeProfile.findMany({
        where: { departmentId: null, department: { not: null } },
        select: { id: true, department: true },
      });
      for (const profile of orphanedProfiles) {
        if (!profile.department) continue;
        const dept = await tx.department.findFirst({
          where: { displayName: { equals: profile.department, mode: 'insensitive' } },
          select: { code: true },
        });
        if (dept) {
          await tx.employeeProfile.update({
            where: { id: profile.id },
            data: { departmentId: dept.code },
          });
        }
      }

      // Remove GRAPH departments that no longer have any active users.
      // These departments have no profiles pointing at them (departmentId already null or
      // pointing to a different code), so onDelete: SetNull is a no-op here.
      if (updatedCodes.length > 0) {
        await tx.department.deleteMany({
          where: { source: 'GRAPH', code: { notIn: updatedCodes } },
        });
      } else {
        await tx.department.deleteMany({ where: { source: 'GRAPH' } });
      }
    });

    await adminAuditRepository.record({
      actorId,
      action: 'DIRECTORY_DEPARTMENTS_REBUILT',
      resourceType: 'Department',
      detail: { count: counts.size },
    });

    return counts.size;
  }

  async updateUserProfileAndSync(
    actorId: string,
    userId: string,
    input: {
      displayName: string;
      department: string;
      jobTitle: string;
      officeLocation: string;
      mobilePhone: string;
      syncToGraph: boolean;
    }
  ): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { externalLinks: true, profile: true },
    });
    if (!user) throw new NotFoundError('User not found');

    const departmentCode = normalizeDepartmentCode(input.department);

    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          displayName: input.displayName,
        },
      });

      if (departmentCode) {
        await tx.department.upsert({
          where: { code: departmentCode },
          create: {
            code: departmentCode,
            displayName: input.department,
            source: 'GRAPH',
            syncedAt: new Date(),
          },
          update: {
            displayName: input.department,
            syncedAt: new Date(),
          },
        });
      }

      await tx.employeeProfile.upsert({
        where: { userId },
        create: {
          userId,
          departmentId: departmentCode,
          department: input.department || null,
          jobTitle: input.jobTitle || null,
          officeLocation: input.officeLocation || null,
          mobilePhone: input.mobilePhone || null,
        },
        update: {
          departmentId: departmentCode,
          department: input.department || null,
          jobTitle: input.jobTitle || null,
          officeLocation: input.officeLocation || null,
          mobilePhone: input.mobilePhone || null,
        },
      });
    });

    if (input.syncToGraph) {
      const link = user.externalLinks[0];
      if (!link) throw new NotFoundError('User is not linked to Microsoft Entra');
      await updateGraphUserProfile(link.entraObjectId, {
        displayName: input.displayName,
        department: input.department || null,
        jobTitle: input.jobTitle || null,
        officeLocation: input.officeLocation || null,
        mobilePhone: input.mobilePhone || null,
      });

      await adminAuditRepository.record({
        actorId,
        action: 'USER_PROFILE_SYNCED_TO_GRAPH',
        resourceType: 'User',
        targetUserId: userId,
        detail: {
          displayName: input.displayName,
          department: input.department,
        },
      });
    }

    await this.rebuildDepartments(actorId);
  }

  async addMemberToEmailGroup(
    actorId: string,
    localGroupId: string,
    employeeIdOrEmail: string
  ): Promise<void> {
    const group = await db.emailGroup.findUnique({ where: { id: localGroupId } });
    if (!group) throw new NotFoundError('Email group not found');

    const user = employeeIdOrEmail.includes('@')
      ? await db.user.findUnique({
          where: { email: employeeIdOrEmail.trim() },
          include: { externalLinks: true },
        })
      : await db.user.findUnique({
          where: { employeeId: employeeIdOrEmail.trim() },
          include: { externalLinks: true },
        });

    if (!user) throw new NotFoundError('Linked user not found');

    const link = user.externalLinks[0];
    if (!link) throw new NotFoundError('User must be linked to Entra before group membership can be managed');

    await addGraphGroupMember(group.entraGroupId, link.entraObjectId);
    await this.syncSingleGroup(group.id);

    await adminAuditRepository.record({
      actorId,
      action: 'GROUP_MEMBER_ADDED',
      resourceType: 'EmailGroup',
      resourceId: group.id,
      targetUserId: user.id,
      detail: { entraGroupId: group.entraGroupId, employeeId: user.employeeId },
    });
  }

  async removeMemberFromEmailGroup(actorId: string, memberId: string): Promise<void> {
    const member = await db.emailGroupMember.findUnique({
      where: { id: memberId },
      include: { group: true, user: true },
    });
    if (!member) throw new NotFoundError('Group member not found');

    await removeGraphGroupMember(member.group.entraGroupId, member.entraObjectId);
    await this.syncSingleGroup(member.group.id);

    await adminAuditRepository.record({
      actorId,
      action: 'GROUP_MEMBER_REMOVED',
      resourceType: 'EmailGroup',
      resourceId: member.group.id,
      targetUserId: member.userId ?? undefined,
      detail: { entraObjectId: member.entraObjectId, email: member.email },
    });
  }

  async syncSingleGroup(localGroupId: string): Promise<void> {
    const group = await db.emailGroup.findUnique({ where: { id: localGroupId } });
    if (!group) throw new NotFoundError('Email group not found');

    const members = await fetchGraphGroupMembers(group.entraGroupId);

    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.emailGroup.update({
        where: { id: localGroupId },
        data: { memberCount: members.length, syncedAt: new Date() },
      });

      await tx.emailGroupMember.deleteMany({ where: { groupId: localGroupId } });

      for (const member of members) {
        const link = await tx.externalIdentityLink.findUnique({
          where: { entraObjectId: member.id },
        });
        let resolvedUserId = link?.userId ?? null;

        if (!resolvedUserId && member.mail) {
          const user = await tx.user.findUnique({ where: { email: member.mail } });
          resolvedUserId = user?.id ?? null;
        }

        await tx.emailGroupMember.create({
          data: {
            groupId: localGroupId,
            userId: resolvedUserId,
            entraObjectId: member.id,
            email: member.mail ?? member.userPrincipalName ?? null,
            displayName: member.displayName ?? null,
            memberType: member['@odata.type'] ?? null,
            syncedAt: new Date(),
          },
        });
      }
    });
  }
}

export const directorySyncService = new DirectorySyncService();
