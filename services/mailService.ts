import { sendMailAsUser, type MailMessage } from '@/lib/graphMailClient';
import { userRepository } from '@/repositories/userRepository';
import { externalIdentityLinkRepository } from '@/repositories/externalIdentityLinkRepository';
import { ForbiddenError, NotFoundError } from '@/errors/customErrors';
import { logger } from '@/lib/logger';

export interface MailServiceInput extends MailMessage {
  senderUserId: string;
}

export class MailService {
  /**
   * Send mail on behalf of a user.
   * Sender must have canSendDelegatedMail = true and a resolvable Entra UPN.
   */
  async sendAsUser(input: MailServiceInput): Promise<void> {
    const user = await userRepository.findById(input.senderUserId);
    if (!user) throw new NotFoundError('Sender not found');

    if (!user.canSendDelegatedMail) {
      throw new ForbiddenError('Delegated mail is not enabled for this account');
    }

    const link = await externalIdentityLinkRepository.findByUserId(input.senderUserId);
    const senderUpn = link?.entraUpn ?? user.email;
    if (!senderUpn) {
      throw new ForbiddenError('Sender has no resolvable Entra UPN or email for Graph mail');
    }

    try {
      await sendMailAsUser(senderUpn, {
        toEmail:  input.toEmail,
        toName:   input.toName,
        subject:  input.subject,
        htmlBody: input.htmlBody,
      });
      logger.info('Delegated mail sent', { senderUserId: input.senderUserId, toEmail: input.toEmail });
    } catch (err) {
      logger.error('Mail send failed', { senderUserId: input.senderUserId, error: String(err) });
      throw err;
    }
  }
}

export const mailService = new MailService();
