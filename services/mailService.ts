import { searchGraphUserMail, fetchGraphMailFolders, type GraphMailMessage, type GraphMailFolder } from '@/lib/graphAdminClient';
import { sendMailAsUser, type MailMessage } from '@/lib/graphMailClient';
import { userRepository } from '@/repositories/userRepository';
import { externalIdentityLinkRepository } from '@/repositories/externalIdentityLinkRepository';
import { ForbiddenError, NotFoundError } from '@/errors/customErrors';
import { logger } from '@/lib/logger';

export interface MailServiceInput extends MailMessage {
  senderUserId: string;
}

export interface SearchMailServiceInput {
  userId: string;
  folder: string;
  fromEmail?: string;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  limit: number;
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
        toEmail:     input.toEmail,
        toName:      input.toName,
        subject:     input.subject,
        htmlBody:    input.htmlBody,
        cc:          input.cc,
        attachments: input.attachments,
      });
      logger.info('Delegated mail sent', { senderUserId: input.senderUserId, toEmail: input.toEmail });
    } catch (err) {
      logger.error('Mail send failed', { senderUserId: input.senderUserId, error: String(err) });
      throw err;
    }
  }

  async searchAsUser(input: SearchMailServiceInput): Promise<{ messages: GraphMailMessage[]; hasMore: boolean }> {
    const user = await userRepository.findById(input.userId);
    if (!user) throw new NotFoundError('Mailbox owner not found');
    if (!user.m365Linked) throw new ForbiddenError('Microsoft 365 is not linked for this account');

    const link = await externalIdentityLinkRepository.findByUserId(input.userId);
    const userUpn = link?.entraUpn ?? user.email;
    if (!userUpn) throw new ForbiddenError('No resolvable Entra UPN for this mailbox');

    return searchGraphUserMail({ ...input, userUpn });
  }

  async listFolders(userId: string): Promise<Array<GraphMailFolder & { wellKnownName: string | null }>> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('Mailbox owner not found');
    if (!user.m365Linked) throw new ForbiddenError('Microsoft 365 is not linked for this account');

    const link = await externalIdentityLinkRepository.findByUserId(userId);
    const userUpn = link?.entraUpn ?? user.email;
    if (!userUpn) throw new ForbiddenError('No resolvable Entra UPN for this mailbox');

    return fetchGraphMailFolders(userUpn);
  }
}

export const mailService = new MailService();
