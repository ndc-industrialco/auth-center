import { type NextRequest } from 'next/server';
import { createRoleGrantSchema, revokeGrantSchema } from '@/schemas/adminSchema';
import { appRegistrationService } from '@/services/appRegistrationService';
import { requireAdmin } from '@/lib/requireAdmin';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

export async function POST(request: NextRequest) {
  try {
    const claims = await requireAdmin(request);
    const body = createRoleGrantSchema.parse(await request.json());
    await appRegistrationService.grantRole(body, claims.userId);
    return sendSuccess(undefined, 'Role granted', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const claims = await requireAdmin(request);
    const body = revokeGrantSchema.parse(await request.json());
    await appRegistrationService.revokeRole(body.grantId, claims.userId);
    return sendSuccess(undefined, 'Role grant revoked');
  } catch (error) {
    return handleApiError(error);
  }
}
