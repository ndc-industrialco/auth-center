import { type NextRequest } from 'next/server';
import { mailService } from '@/services/mailService';
import { searchMailSchema } from '@/schemas/mailSchema';
import { requireAppAccess } from '@/lib/requireAppAccess';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { ForbiddenError } from '@/errors/customErrors';

/**
 * POST /api/auth/consumer/mail/search
 * Search the signed-in user's own mailbox through Auth Center's Graph gateway.
 * The CRM supplies criteria, never a raw Graph URL or userId.
 */
export async function POST(request: NextRequest) {
  try {
    const body = searchMailSchema.parse(await request.json());
    const claims = await requireAppAccess(request, body.appId);
    if (claims.authMethod !== 'ENTRA' || !claims.m365Linked) {
      throw new ForbiddenError('Microsoft 365 mailbox access requires an Entra-linked account');
    }

    const result = await mailService.searchAsUser({
      userId: claims.userId,
      folder: body.folder,
      fromEmail: body.fromEmail,
      keyword: body.keyword,
      fromDate: body.fromDate,
      toDate: body.toDate,
      limit: body.limit,
    });

    return sendSuccess({
      mailbox: claims.employeeId,
      messages: result.messages,
      hasMore: result.hasMore,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
