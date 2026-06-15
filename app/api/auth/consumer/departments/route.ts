import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAppAdmin } from '@/lib/requireAppAdmin';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

const querySchema = z.object({
  appId: z.string().min(1).max(100),
});

const createSchema = z.object({
  appId: z.string().min(1).max(100),
  code: z.string().min(1).max(50).transform((v) => v.trim().toUpperCase()),
  displayName: z.string().min(1).max(200).transform((v) => v.trim()),
  emailGroup: z.string().max(200).optional().nullable(),
});

const updateSchema = z.object({
  appId: z.string().min(1).max(100),
  code: z.string().min(1).max(50).transform((v) => v.trim().toUpperCase()),
  displayName: z.string().min(1).max(200).transform((v) => v.trim()).optional(),
  emailGroup: z.string().max(200).optional().nullable(),
});

/**
 * GET /api/auth/consumer/departments?appId=qms
 * List all departments visible to the app-admin.
 */
export async function GET(request: NextRequest) {
  try {
    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    await requireAppAdmin(request, query.appId);

    const departments = await db.department.findMany({
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        code: true,
        displayName: true,
        userCount: true,
        source: true,
        syncedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return sendSuccess(departments);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/auth/consumer/departments
 * Create a new department.
 */
export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());
    await requireAppAdmin(request, body.appId);

    const existing = await db.department.findUnique({ where: { code: body.code } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: { message: `Department code "${body.code}" already exists`, code: 'CONFLICT' } },
        { status: 409 },
      );
    }

    const dept = await db.department.create({
      data: {
        code: body.code,
        displayName: body.displayName,
        source: 'MANUAL',
      },
    });

    return sendSuccess({
      id: dept.id,
      code: dept.code,
      displayName: dept.displayName,
      userCount: dept.userCount,
      source: dept.source,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt,
    }, 'Department created', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/auth/consumer/departments
 * Update a department by code.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = updateSchema.parse(await request.json());
    await requireAppAdmin(request, body.appId);

    const existing = await db.department.findUnique({ where: { code: body.code } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { message: `Department "${body.code}" not found`, code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }

    const updated = await db.department.update({
      where: { code: body.code },
      data: {
        ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
        syncedAt: new Date(),
      },
    });

    return sendSuccess({
      id: updated.id,
      code: updated.code,
      displayName: updated.displayName,
      userCount: updated.userCount,
      source: updated.source,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/auth/consumer/departments?appId=qms&code=IT
 * Delete a department by code (only if no users assigned).
 */
export async function DELETE(request: NextRequest) {
  try {
    const params = z.object({
      appId: z.string().min(1),
      code: z.string().min(1).transform((v) => v.trim().toUpperCase()),
    }).parse(Object.fromEntries(request.nextUrl.searchParams));

    await requireAppAdmin(request, params.appId);

    const dept = await db.department.findUnique({
      where: { code: params.code },
      include: { _count: { select: { profiles: true } } },
    });

    if (!dept) {
      return NextResponse.json(
        { success: false, error: { message: `Department "${params.code}" not found`, code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }

    if (dept._count.profiles > 0) {
      return NextResponse.json(
        { success: false, error: { message: `Cannot delete department with ${dept._count.profiles} assigned users`, code: 'CONFLICT' } },
        { status: 409 },
      );
    }

    await db.department.delete({ where: { code: params.code } });
    return sendSuccess({ code: params.code }, 'Department deleted');
  } catch (error) {
    return handleApiError(error);
  }
}
