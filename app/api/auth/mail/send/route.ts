import { type NextRequest } from 'next/server';
import { tokenService } from '@/services/tokenService';
import { mailService } from '@/services/mailService';
import { sendMailSchema } from '@/schemas/mailSchema';
import { requireConsumerApp } from '@/lib/requireConsumerApp';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { ForbiddenError, UnauthorizedError } from '@/errors/customErrors';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body = sendMailSchema.parse(await request.json());

    if (authHeader?.startsWith('Bearer ')) {
      // Delegated path: user token → send as that user
      const claims = await tokenService.verifyAccessToken(authHeader.slice(7));
      if (!claims.canSendDelegatedMail) {
        throw new ForbiddenError('Delegated mail is not enabled for this account');
      }
      await mailService.sendAsUser({ senderUserId: claims.userId, ...body });
    } else {
      // M2M path: consumer app secret → send as the app's configured mailSenderUserId
      const app = await requireConsumerApp(request);
      if (!app.mailSenderUserId) {
        throw new ForbiddenError('This consumer app has no mailSenderUserId configured');
      }
      await mailService.sendAsUser({ senderUserId: app.mailSenderUserId, ...body });
    }

    return sendSuccess(null, 'Mail sent');
  } catch (error) {
    return handleApiError(error);
  }
}
