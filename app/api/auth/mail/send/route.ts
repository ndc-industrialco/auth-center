import { type NextRequest } from 'next/server';
import { tokenService } from '@/services/tokenService';
import { mailService } from '@/services/mailService';
import { sendMailSchema } from '@/schemas/mailSchema';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { ForbiddenError, UnauthorizedError } from '@/errors/customErrors';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();

    const token = authHeader.slice(7);
    // verifyAccessToken without appId = verify signature + issuer only (any valid app token)
    const claims = await tokenService.verifyAccessToken(token);

    if (!claims.canSendDelegatedMail) {
      throw new ForbiddenError('Delegated mail is not enabled for this account');
    }

    const body = sendMailSchema.parse(await request.json());
    await mailService.sendAsUser({ senderUserId: claims.userId, ...body });

    return sendSuccess(null, 'Mail sent');
  } catch (error) {
    return handleApiError(error);
  }
}
