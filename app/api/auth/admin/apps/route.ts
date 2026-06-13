import { type NextRequest } from 'next/server';
import { createAppSchema } from '@/schemas/adminSchema';
import { appRegistrationService } from '@/services/appRegistrationService';
import { requireAdmin } from '@/lib/requireAdmin';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const apps = await appRegistrationService.listApps();
    return sendSuccess(apps);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const claims = await requireAdmin(request);
    const body = createAppSchema.parse(await request.json());
    const app = await appRegistrationService.registerApp(body, claims.userId);
    return sendSuccess(app, 'App registered', 201);
  } catch (error) {
    return handleApiError(error);
  }
}
