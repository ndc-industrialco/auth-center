import bcrypt from 'bcryptjs';
import { localCredentialRepository } from '@/repositories/localCredentialRepository';
import { identityAccountRepository } from '@/repositories/identityAccountRepository';
import { userRepository } from '@/repositories/userRepository';
import { adminAuditRepository } from '@/repositories/adminAuditRepository';
import { NotFoundError, ValidationError } from '@/errors/customErrors';
import { db } from '@/lib/db';
import type { Prisma } from '@/app/generated/prisma/client';

const BCRYPT_ROUNDS = 12;

export class CredentialService {
  /**
   * Admin sets or resets a user's local password.
   * Creates LocalCredential + LOCAL IdentityAccount if not present (enables local login).
   * Resets lockout and failed attempts on password reset.
   */
  async adminSetPassword(userId: string, newPassword: string, actorId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const existing = await localCredentialRepository.findByUserId(userId);

    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      if (existing) {
        await localCredentialRepository.updateHash(userId, passwordHash, tx);
      } else {
        await localCredentialRepository.create(userId, passwordHash, tx);
        await identityAccountRepository.upsert(userId, 'LOCAL', userId, tx);
      }
    });

    await adminAuditRepository.record({
      actorId,
      action: existing ? 'CREDENTIAL_RESET' : 'CREDENTIAL_CREATED',
      resourceType: 'LocalCredential',
      targetUserId: userId,
      detail: { operation: existing ? 'PASSWORD_RESET' : 'CREDENTIAL_CREATED' },
    });
  }

  /**
   * Admin disables local login by deactivating the LOCAL IdentityAccount.
   * Credential record is preserved for potential re-enable.
   */
  async disableLocalLogin(userId: string, actorId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    await identityAccountRepository.deactivate(userId, 'LOCAL');

    await adminAuditRepository.record({
      actorId,
      action: 'LOCAL_LOGIN_DISABLED',
      resourceType: 'IdentityAccount',
      targetUserId: userId,
    });
  }

  /**
   * Admin re-enables local login by activating the LOCAL IdentityAccount.
   * Requires that a credential already exists.
   */
  async enableLocalLogin(userId: string, actorId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const credential = await localCredentialRepository.findByUserId(userId);
    if (!credential) {
      throw new ValidationError('No local credential exists. Set a password first.');
    }

    await identityAccountRepository.upsert(userId, 'LOCAL', userId);

    await adminAuditRepository.record({
      actorId,
      action: 'LOCAL_LOGIN_ENABLED',
      resourceType: 'IdentityAccount',
      targetUserId: userId,
    });
  }
}

export const credentialService = new CredentialService();
