import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { roleGrantRepository } from '@/repositories/roleGrantRepository';
import { requireAppAdmin } from '@/lib/requireAppAdmin';
import { appRegistrationService } from '@/services/appRegistrationService';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { NotFoundError } from '@/errors/customErrors';

const listQuerySchema = z.object({
  appId: z.string().min(1).max(100),
});

const grantSchema = z.object({
  userId: z.string().min(1),
  appId: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
});

export async function GET(request: NextRequest) {
  try {
    const query = listQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    await requireAppAdmin(request, query.appId);

    const grants = await roleGrantRepository.findActiveByAppWithDetails(query.appId);

    return sendSuccess(
      grants.map((grant) => ({
        id: grant.id,
        userId: grant.user.id,
        employeeId: grant.user.employeeId,
        userEmail: grant.user.email,
        displayName: grant.user.displayName ?? grant.user.employeeId,
        role: grant.role,
        appId: grant.app.appId,
        appDisplayName: grant.app.displayName,
        grantedAt: grant.grantedAt,
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = grantSchema.parse(await request.json());
    const claims = await requireAppAdmin(request, body.appId);
    await appRegistrationService.grantRole(body, claims.userId);
    return sendSuccess(undefined, 'Role granted', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = grantSchema.parse(await request.json());
    await requireAppAdmin(request, body.appId);

    const grant = await roleGrantRepository.findActiveByUserAndAppAndRole(body.userId, body.appId, body.role);
    if (!grant) throw new NotFoundError('Role grant not found');

    await roleGrantRepository.revoke(grant.id);

    return sendSuccess(undefined, 'Role revoked');
  } catch (error) {
    return handleApiError(error);
  }
}
