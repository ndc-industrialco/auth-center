import { type NextRequest } from 'next/server';
import { entraLinkSchema } from '@/schemas/authSchema';
import { tokenService } from '@/services/tokenService';
import { entraAuthService } from '@/services/entraAuthService';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { UnauthorizedError } from '@/errors/customErrors';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();

    const token = authHeader.slice(7);
    const claims = await tokenService.verifyAccessToken(token);

    const body = entraLinkSchema.parse(await request.json());
    await entraAuthService.linkEntraToUser(claims.userId, body);

    return sendSuccess(undefined, 'Entra identity linked successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
