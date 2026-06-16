import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
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
 * List users whose profile is assigned to this department.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { code } = await params;
    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    await requireAppAdmin(request, query.appId);

    const dept = await db.department.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!dept) {
      return sendSuccess({ department: null, members: [], source: 'auth_center' });
    }

    // Find all users with a profile linked to this department code
    const users = await db.user.findMany({
      where: {
        profile: { departmentId: code.toUpperCase() },
        employmentStatus: 'ACTIVE',
      },
      include: {
        profile: true,
        roleGrants: {
          where: {
            isActive: true,
            app: { appId: query.appId },
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          include: { app: { select: { appId: true } } },
        },
      },
      orderBy: { displayName: 'asc' },
    });

    const members = users.map((u) => ({
      id: u.id,
      employeeId: u.employeeId,
      email: u.email,
      displayName: u.displayName,
      jobTitle: u.profile?.jobTitle ?? null,
      officeLocation: u.profile?.officeLocation ?? null,
      m365Linked: u.m365Linked,
      roles: u.roleGrants.map((g) => g.role),
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
