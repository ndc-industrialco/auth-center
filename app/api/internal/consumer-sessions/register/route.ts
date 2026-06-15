import { type NextRequest } from 'next/server';
import { consumerSessionRegisterSchema } from '@/schemas/consumerAppSessionSchema';
import { consumerAppSessionService } from '@/services/consumerAppSessionService';
import { requireConsumerApp } from '@/lib/requireConsumerApp';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

export async function POST(request: NextRequest) {
  try {
    const app = await requireConsumerApp(request);
    const body = consumerSessionRegisterSchema.parse(await request.json());
    const session = await consumerAppSessionService.registerSession(app, body);
    return sendSuccess(
      { sessionId: session.sessionId, status: session.status },
      'Consumer session registered',
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
