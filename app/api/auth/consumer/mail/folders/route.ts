import { type NextRequest } from 'next/server';
import { mailService } from '@/services/mailService';
import { requireAppAccess } from '@/lib/requireAppAccess';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { ForbiddenError, ValidationError } from '@/errors/customErrors';

/**
 * GET /api/auth/consumer/mail/folders?appId=<consumer app id>
 * List the signed-in user's own mail folders (well-known + custom) so the
 * consumer app can offer real folder choices instead of a fixed list.
 */
export async function GET(request: NextRequest) {
  try {
    const appId = request.nextUrl.searchParams.get('appId');
    if (!appId?.trim()) throw new ValidationError('appId is required');

    const claims = await requireAppAccess(request, appId);
    if (claims.authMethod !== 'ENTRA' || !claims.m365Linked) {
      throw new ForbiddenError('Microsoft 365 mailbox access requires an Entra-linked account');
    }

    const folders = await mailService.listFolders(claims.userId);

    return sendSuccess({ folders });
  } catch (error) {
    return handleApiError(error);
  }
}
