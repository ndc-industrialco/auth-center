import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { userRepository } from '@/repositories/userRepository';
import { userService } from '@/services/userService';
import { requireAppAdmin } from '@/lib/requireAppAdmin';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

const querySchema = z.object({
  appId: z.string().min(1).max(100),
});

const createUserSchema = z.object({
  appId: z.string().min(1).max(100),
  employeeId: z.string().min(1).max(50).regex(/^[A-Za-z0-9_-]+$/),
  displayName: z.string().max(200).optional(),
  email: z.string().email().optional(),
  departmentCode: z.string().max(100).optional(),
  department: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  initialPassword: z.string().min(5).max(128).optional(),
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

export async function POST(request: NextRequest) {
  try {
    const body = createUserSchema.parse(await request.json());
    const claims = await requireAppAdmin(request, body.appId);

    const user = await userService.createUser(
      {
        employeeId: body.employeeId,
        displayName: body.displayName,
        email: body.email,
        departmentCode: body.departmentCode,
        department: body.department,
        jobTitle: body.jobTitle,
        initialPassword: body.initialPassword,
      },
      claims.userId,
    );

    return sendSuccess(
      {
        id: user.id,
        employeeId: user.employeeId,
        email: user.email,
        displayName: user.displayName,
      },
      'User created',
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
