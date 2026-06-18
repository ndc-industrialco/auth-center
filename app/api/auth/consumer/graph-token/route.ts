import { type NextRequest } from 'next/server';
import { requireConsumerApp } from '@/lib/requireConsumerApp';
import { getGraphAdminAccessToken } from '@/lib/graphAdminClient';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

/**
 * GET /api/auth/consumer/graph-token
 *
 * Returns a Microsoft Graph app-only access token issued from Auth Center's
 * Azure AD credentials. Consumer apps use this to avoid holding their own
 * Azure AD client secrets.
 *
 * Auth: M2M — x-consumer-app-id + x-consumer-app-secret headers required.
 */
export async function GET(request: NextRequest) {
  try {
    await requireConsumerApp(request);
    const token = await getGraphAdminAccessToken();
    return sendSuccess({ accessToken: token });
  } catch (error) {
    return handleApiError(error);
  }
}
