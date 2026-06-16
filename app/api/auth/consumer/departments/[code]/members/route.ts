import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { departmentRepository } from '@/repositories/departmentRepository';
import { requireAppAdmin } from '@/lib/requireAppAdmin';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

const querySchema = z.object({
  appId: z.string().min(1).max(100),
});

interface RouteContext {
  params: Promise<{ code: string }>;
}

/**
 * GET /api/auth/consumer/departments/:code/members?appId=qms
 * List users whose profile is assigned to this department, with their roles for the requesting app.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { code } = await params;
    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    await requireAppAdmin(request, query.appId);

    const dept = await departmentRepository.findWithMembersAndRoles(
      code.toUpperCase(),
      query.appId
    );

    if (!dept) {
      return sendSuccess({ department: null, members: [], source: 'auth_center' });
    }

    const members = dept.profiles.map((p) => ({
      id: p.user.id,
      employeeId: p.user.employeeId,
      email: p.user.email,
      displayName: p.user.displayName,
      jobTitle: p.jobTitle ?? null,
      officeLocation: p.officeLocation ?? null,
      m365Linked: p.user.m365Linked,
      roles: p.user.roleGrants.map((g) => g.role),
    }));

    return sendSuccess({
      department: { code: dept.code, displayName: dept.displayName, userCount: dept.userCount },
      members,
      source: 'auth_center',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
