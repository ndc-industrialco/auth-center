import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAppAccess } from '@/lib/requireAppAccess';
import { requireAppAdmin } from '@/lib/requireAppAdmin';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { departmentService } from '@/services/departmentService';

const querySchema = z.object({
  appId: z.string().min(1).max(100),
});

const createSchema = z.object({
  appId: z.string().min(1).max(100),
  code: z.string().min(1).max(50).transform((v) => v.trim().toUpperCase()),
  displayName: z.string().min(1).max(200).transform((v) => v.trim()),
});

const updateSchema = z.object({
  appId: z.string().min(1).max(100),
  code: z.string().min(1).max(50).transform((v) => v.trim().toUpperCase()),
  displayName: z.string().min(1).max(200).transform((v) => v.trim()).optional(),
});

/**
 * GET /api/auth/consumer/departments?appId=qms
 * List all departments visible to the app-admin.
 */
export async function GET(request: NextRequest) {
  try {
    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    await requireAppAccess(request, query.appId);

    const departments = await departmentService.list();
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
    const claims = await requireAppAdmin(request, body.appId);

    const dept = await departmentService.create(claims.userId, {
      code: body.code,
      displayName: body.displayName,
    });

    return sendSuccess(dept, 'Department created', 201);
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
    const claims = await requireAppAdmin(request, body.appId);

    if (!body.displayName) {
      return NextResponse.json(
        { success: false, error: { message: 'displayName is required', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      );
    }

    const updated = await departmentService.update(claims.userId, body.code, {
      displayName: body.displayName,
    });

    return sendSuccess(updated);
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

    const claims = await requireAppAdmin(request, params.appId);
    await departmentService.delete(claims.userId, params.code);

    return sendSuccess({ code: params.code }, 'Department deleted');
  } catch (error) {
    return handleApiError(error);
  }
}
