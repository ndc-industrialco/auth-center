import { type NextRequest } from 'next/server';
import { localLoginSchema } from '@/schemas/authSchema';
import { authService } from '@/services/authService';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { getRequestId } from '@/lib/requestId';

export async function POST(request: NextRequest) {
  try {
    const body = localLoginSchema.parse(await request.json());
    const appId = request.nextUrl.searchParams.get('appId') ?? body.appId ?? 'default';
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    const ua = request.headers.get('user-agent') ?? 'unknown';
    const requestId = getRequestId(request);

    const result = await authService.loginLocal(body, ip, ua, appId, requestId);
    return sendSuccess(result, 'Login successful');
  } catch (error) {
    return handleApiError(error);
  }
}
