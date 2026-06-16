import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAppAdmin } from '@/lib/requireAppAdmin';
import { selfProfileService } from '@/services/selfProfileService';
import { userRepository } from '@/repositories/userRepository';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { NotFoundError } from '@/errors/customErrors';

const bodySchema = z.object({
  appId: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200).optional(),
  jobTitle: z.string().max(200).optional().nullable(),
  officeLocation: z.string().max(200).optional().nullable(),
  mobilePhone: z.string().max(50).optional().nullable(),
});

interface RouteContext {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/auth/consumer/users/:userId/profile?appId=qms
 * Read a user's profile as an app-admin (M2M).
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await params;
    const appId = request.nextUrl.searchParams.get('appId') ?? '';
    await requireAppAdmin(request, appId);

    const user = await userRepository.findWithProfile(userId);
    if (!user) throw new NotFoundError('User not found');

    return sendSuccess({
      id: user.id,
      employeeId: user.employeeId,
      email: user.email,
      displayName: user.displayName,
      department: user.profile?.department ?? null,
      jobTitle: user.profile?.jobTitle ?? null,
      officeLocation: user.profile?.officeLocation ?? null,
      mobilePhone: user.profile?.mobilePhone ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/auth/consumer/users/:userId/profile
 * Update a user's profile as an app-admin (M2M).
 * Used by QMS to proxy self-profile updates in auth_center mode.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { userId } = await params;
    const body = bodySchema.parse(await request.json());
    await requireAppAdmin(request, body.appId);

    await selfProfileService.updateOwnProfile(userId, {
      displayName: body.displayName,
      jobTitle: body.jobTitle ?? undefined,
      officeLocation: body.officeLocation ?? undefined,
      mobilePhone: body.mobilePhone ?? undefined,
    });

    const user = await userRepository.findWithProfile(userId);
    if (!user) throw new NotFoundError('User not found');

    return sendSuccess({
      id: user.id,
      displayName: user.displayName,
      department: user.profile?.department ?? null,
      jobTitle: user.profile?.jobTitle ?? null,
      officeLocation: user.profile?.officeLocation ?? null,
      mobilePhone: user.profile?.mobilePhone ?? null,
    }, 'Profile updated');
  } catch (error) {
    return handleApiError(error);
  }
}
