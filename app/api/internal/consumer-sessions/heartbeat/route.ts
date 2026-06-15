import { type NextRequest } from 'next/server';
import { consumerSessionHeartbeatSchema } from '@/schemas/consumerAppSessionSchema';
import { consumerAppSessionService } from '@/services/consumerAppSessionService';
import { requireConsumerApp } from '@/lib/requireConsumerApp';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

export async function POST(request: NextRequest) {
  try {
    const app = await requireConsumerApp(request);
    const body = consumerSessionHeartbeatSchema.parse(await request.json());
    const session = await consumerAppSessionService.heartbeatSession(app, body);
    return sendSuccess(
      { sessionId: session.sessionId, status: session.status, lastSeenAt: session.lastSeenAt },
      'Consumer session heartbeat recorded',
    );
  } catch (error) {
    return handleApiError(error);
  }
}
