import { type NextRequest } from 'next/server';
import { consumerSessionRevokeSchema } from '@/schemas/consumerAppSessionSchema';
import { consumerAppSessionService } from '@/services/consumerAppSessionService';
import { requireConsumerApp } from '@/lib/requireConsumerApp';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

export async function POST(request: NextRequest) {
  try {
    const app = await requireConsumerApp(request);
    const body = consumerSessionRevokeSchema.parse(await request.json());
    const session = await consumerAppSessionService.revokeSession(app, body);
    return sendSuccess(
      { sessionId: session.sessionId, status: session.status, revokedAt: session.revokedAt },
      'Consumer session revoked',
    );
  } catch (error) {
    return handleApiError(error);
  }
}
