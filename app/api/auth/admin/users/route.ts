import { type NextRequest } from 'next/server';
import { userService } from '@/services/userService';
import { userRepository } from '@/repositories/userRepository';
import { createUserSchema } from '@/schemas/adminSchema';
import { requireAdmin } from '@/lib/requireAdmin';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const users = await userRepository.findAllActiveWithProfile();

    return sendSuccess(
      users.map((user) => ({
        id: user.id,
        employeeId: user.employeeId,
        email: user.email,
        displayName: user.displayName,
        department: user.profile?.department ?? null,
        jobTitle: user.profile?.jobTitle ?? null,
        officeLocation: user.profile?.officeLocation ?? null,
        mobilePhone: user.profile?.mobilePhone ?? null,
        m365Linked: user.m365Linked,
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const claims = await requireAdmin(request);
    const body = createUserSchema.parse(await request.json());
    const user = await userService.createUser(body, claims.userId);
    return sendSuccess({ userId: user.id }, 'User created', 201);
  } catch (error) {
    return handleApiError(error);
  }
}
