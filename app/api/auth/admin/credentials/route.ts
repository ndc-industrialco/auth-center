import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { credentialService } from '@/services/credentialService';
import { requireAdmin } from '@/lib/requireAdmin';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

const setPasswordSchema = z.object({
  userId:      z.string().cuid(),
  newPassword: z.string().min(5).max(128),
});

const toggleSchema = z.object({
  userId:  z.string().cuid(),
  enabled: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const claims = await requireAdmin(request);
    const body = setPasswordSchema.parse(await request.json());
    await credentialService.adminSetPassword(body.userId, body.newPassword, claims.userId);
    return sendSuccess(undefined, 'Password set successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const claims = await requireAdmin(request);
    const body = toggleSchema.parse(await request.json());
    if (body.enabled) {
      await credentialService.enableLocalLogin(body.userId, claims.userId);
    } else {
      await credentialService.disableLocalLogin(body.userId, claims.userId);
    }
    return sendSuccess(undefined, body.enabled ? 'Local login enabled' : 'Local login disabled');
  } catch (error) {
    return handleApiError(error);
  }
}
