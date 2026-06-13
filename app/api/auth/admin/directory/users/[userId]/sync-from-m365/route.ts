import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { directorySyncService } from '@/services/directorySyncService';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const claims = await requireAdmin(request);
    const { userId } = await context.params;
    const result = await directorySyncService.syncSingleUserFromGraph(claims.userId, userId);
    return sendSuccess(result, 'User synced from M365');
  } catch (error) {
    return handleApiError(error);
  }
}
