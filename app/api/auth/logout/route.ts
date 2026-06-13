import { type NextRequest } from 'next/server';
import { logoutSchema } from '@/schemas/authSchema';
import { tokenService } from '@/services/tokenService';
import { authService } from '@/services/authService';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { UnauthorizedError } from '@/errors/customErrors';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();

    const token = authHeader.slice(7);
    const claims = await tokenService.verifyAccessToken(token);

    const body = logoutSchema.parse(await request.json());
    if (body.sessionId !== claims.sessionId) throw new UnauthorizedError('Session mismatch');

    await authService.logout(claims.sessionId, claims.userId);
    return sendSuccess(undefined, 'Logged out successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
