import { type NextRequest } from 'next/server';
import { refreshSchema } from '@/schemas/authSchema';
import { authService } from '@/services/authService';
import { tokenService } from '@/services/tokenService';
import { checkRateLimit } from '@/lib/rateLimit';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { RateLimitError, UnauthorizedError } from '@/errors/customErrors';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    const rl = await checkRateLimit({ key: `rl:refresh:${ip}`, limit: 30, windowSec: 60 });
    if (!rl.allowed) throw new RateLimitError('Too many refresh requests');

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();

    const currentClaims = await tokenService.verifyAccessToken(authHeader.slice(7));
    const body = refreshSchema.parse(await request.json());
    const appId = request.nextUrl.searchParams.get('appId') ?? body.appId ?? currentClaims.aud;

    authService.ensureAudienceAccess(currentClaims.aud, appId);
    if (body.sessionId !== currentClaims.sessionId) {
      throw new UnauthorizedError('Session mismatch');
    }

    const result = await authService.refreshToken(body.sessionId, appId);
    return sendSuccess(result, 'Token refreshed');
  } catch (error) {
    return handleApiError(error);
  }
}
