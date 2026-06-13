import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { createDefaultRolePolicySchema } from '@/schemas/adminSchema';
import { defaultRolePolicyService } from '@/services/defaultRolePolicyService';
import { requireAdmin } from '@/lib/requireAdmin';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const policies = await defaultRolePolicyService.listPolicies();
    return sendSuccess(policies);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const claims = await requireAdmin(request);
    const body = createDefaultRolePolicySchema.parse(await request.json());
    const policy = await defaultRolePolicyService.createPolicy(body, claims.userId);
    return sendSuccess(policy, 'Default role policy created', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const claims = await requireAdmin(request);
    const { id } = z.object({ id: z.string().cuid() }).parse(await request.json());
    const policy = await defaultRolePolicyService.deactivatePolicy(id, claims.userId);
    return sendSuccess(policy, 'Policy deactivated');
  } catch (error) {
    return handleApiError(error);
  }
}
