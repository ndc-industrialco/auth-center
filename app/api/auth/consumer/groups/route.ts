import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAppAccess } from '@/lib/requireAppAccess';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { db } from '@/lib/db';

const querySchema = z.object({
  appId: z.string().min(1).max(100),
  q: z.string().max(100).optional().default(''),
});

/**
 * GET /api/auth/consumer/groups?appId=qms&q=it
 * Search mail-enabled email groups from the synced directory.
 */
export async function GET(request: NextRequest) {
  try {
    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    await requireAppAccess(request, query.appId);

    const q = query.q.trim();

    const groups = await db.emailGroup.findMany({
      where: {
        mailEnabled: true,
        ...(q
          ? {
              OR: [
                { displayName: { contains: q, mode: 'insensitive' } },
                { mail: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        entraGroupId: true,
        displayName: true,
        mail: true,
        description: true,
      },
      orderBy: { displayName: 'asc' },
      take: 50,
    });

    return sendSuccess(groups);
  } catch (error) {
    return handleApiError(error);
  }
}
