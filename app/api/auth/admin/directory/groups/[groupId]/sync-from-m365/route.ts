import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { directorySyncService } from '@/services/directorySyncService';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

interface RouteContext {
  params: Promise<{ groupId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const claims = await requireAdmin(request);
    const { groupId } = await context.params;
    const result = await directorySyncService.syncSingleGroupFromGraph(claims.userId, groupId);
    return sendSuccess(result, 'Group synced from M365');
  } catch (error) {
    return handleApiError(error);
  }
}
