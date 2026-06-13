import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { UnauthorizedError } from '@/errors/customErrors';
import { tokenService } from '@/services/tokenService';
import { selfProfileService } from '@/services/selfProfileService';
import { authService } from '@/services/authService';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  department: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  officeLocation: z.string().max(200).optional(),
  mobilePhone: z.string().max(50).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();

    const token = authHeader.slice(7);
    const claims = await tokenService.verifyAccessToken(token);
    const body = updateProfileSchema.parse(await request.json());

    await selfProfileService.updateOwnProfile(claims.userId, body);

    const me = await authService.getMe(claims.userId, claims.aud);
    return sendSuccess(me, 'Profile updated');
  } catch (error) {
    return handleApiError(error);
  }
}
