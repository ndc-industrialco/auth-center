import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { tokenService } from '@/services/tokenService';
import { userRepository } from '@/repositories/userRepository';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { UnauthorizedError } from '@/errors/customErrors';

const querySchema = z.object({
  appId: z.string().min(1).max(100),
});

/**
 * Returns a basic user list for all active employees.
 * Accessible to any authenticated consumer app user — used for notification recipient selection.
 * Returns limited fields only: no credentials, no sessions.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();

    const token = authHeader.slice(7);
    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    // Verify token is valid for the requesting app
    await tokenService.verifyAccessToken(token, query.appId);

    const users = await userRepository.findAllActiveBasic();

    return sendSuccess(
      users.map((u) => ({
        id:          u.id,
        employeeId:  u.employeeId,
        displayName: u.displayName,
        email:       u.email,
        m365Linked:  u.m365Linked,
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}
