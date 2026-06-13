import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { userRepository } from '@/repositories/userRepository';
import { identityAccountRepository } from '@/repositories/identityAccountRepository';
import { adminAuditRepository } from '@/repositories/adminAuditRepository';
import { directorySyncService } from '@/services/directorySyncService';
import { ConflictError } from '@/errors/customErrors';
import type { CreateUserInput } from '@/schemas/adminSchema';
import type { Prisma } from '@/app/generated/prisma/client';

const BCRYPT_ROUNDS = 12;

export class UserService {
  async createUser(input: CreateUserInput, actorId: string) {
    const existing = await userRepository.findByEmployeeId(input.employeeId);
    if (existing) throw new ConflictError(`Employee ID "${input.employeeId}" already exists`);

    if (input.email?.trim()) {
      const byEmail = await userRepository.findByEmail(input.email.trim());
      if (byEmail) throw new ConflictError(`Email "${input.email}" is already in use`);
    }

    const hasPassword = !!input.initialPassword?.trim();
    const hasEntraLink = !!input.entraObjectId?.trim();
    const departmentCode = input.departmentCode?.trim().toUpperCase() || null;
    const departmentDisplay = input.department?.trim() || null;

    const user = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.user.create({
        data: {
          employeeId: input.employeeId.trim(),
          email: input.email?.trim() || null,
          displayName: input.displayName?.trim() || null,
          m365Linked: hasEntraLink,
          defaultAuthMethod: hasEntraLink && !hasPassword ? 'ENTRA' : 'LOCAL_PASSWORD',
          employmentStatus: 'ACTIVE',
        },
      });

      if (departmentCode) {
        await tx.department.upsert({
          where: { code: departmentCode },
          create: {
            code: departmentCode,
            displayName: departmentDisplay ?? departmentCode,
            source: 'GRAPH',
            syncedAt: new Date(),
          },
          update: {
            displayName: departmentDisplay ?? departmentCode,
            syncedAt: new Date(),
          },
        });
      }

      await tx.employeeProfile.create({
        data: {
          userId: created.id,
          departmentId: departmentCode,
          department: departmentDisplay,
          jobTitle: input.jobTitle?.trim() || null,
        },
      });

      if (hasPassword) {
        const passwordHash = await bcrypt.hash(input.initialPassword!.trim(), BCRYPT_ROUNDS);
        await tx.localCredential.create({ data: { userId: created.id, passwordHash } });
        await identityAccountRepository.upsert(created.id, 'LOCAL', created.id, tx);
      }

      if (hasEntraLink) {
        await tx.externalIdentityLink.create({
          data: {
            userId: created.id,
            entraObjectId: input.entraObjectId!.trim(),
            entraUpn: input.entraUpn?.trim() || null,
            linkedByMethod: 'ADMIN_CREATE',
          },
        });
        await identityAccountRepository.upsert(created.id, 'ENTRA', input.entraObjectId!.trim(), tx);
      }

      return created;
    });

    if (hasEntraLink && input.groupIds?.length) {
      await Promise.all(
        input.groupIds.map((groupId) =>
          directorySyncService.addMemberToEmailGroup(actorId, groupId, user.employeeId)
        )
      );
    }

    await adminAuditRepository.record({
      actorId,
      action: 'USER_CREATED',
      resourceType: 'User',
      targetUserId: user.id,
      detail: {
        employeeId: user.employeeId,
        department: departmentDisplay,
        groupCount: input.groupIds?.length ?? 0,
      },
    });

    return user;
  }
}

export const userService = new UserService();
