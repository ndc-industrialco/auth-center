import { type NextRequest } from 'next/server';
import { meQuerySchema } from '@/schemas/authSchema';
import { tokenService } from '@/services/tokenService';
import { authService } from '@/services/authService';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { UnauthorizedError } from '@/errors/customErrors';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();

    const token = authHeader.slice(7);
    const claims = await tokenService.verifyAccessToken(token);

    const query = meQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const appId = query.appId ?? claims.aud;
    authService.ensureAudienceAccess(claims.aud, appId);

    const me = await authService.getMe(claims.userId, appId);
    return sendSuccess(me);
  } catch (error) {
    return handleApiError(error);
  }
}
