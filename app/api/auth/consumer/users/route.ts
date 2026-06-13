import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { userRepository } from '@/repositories/userRepository';
import { requireAppAdmin } from '@/lib/requireAppAdmin';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

const querySchema = z.object({
  appId: z.string().min(1).max(100),
});

export async function GET(request: NextRequest) {
  try {
    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    await requireAppAdmin(request, query.appId);

    const users = await userRepository.findAllActiveWithRolesAndProfile(query.appId);

    return sendSuccess(
      users.map((user) => ({
        id: user.id,
        employeeId: user.employeeId,
        email: user.email,
        displayName: user.displayName,
        department: user.profile?.department ?? null,
        jobTitle: user.profile?.jobTitle ?? null,
        roles: user.roleGrants.map((grant) => grant.role),
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}
