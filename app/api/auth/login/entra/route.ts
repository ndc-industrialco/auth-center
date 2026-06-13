import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { userRepository } from '@/repositories/userRepository';
import { externalIdentityLinkRepository } from '@/repositories/externalIdentityLinkRepository';
import { sessionService } from '@/services/sessionService';
import { tokenService } from '@/services/tokenService';
import { appRegistrationService } from '@/services/appRegistrationService';
import { buildConsumerRedirectUrl } from '@/lib/consumerRedirect';
import { handleApiError } from '@/lib/apiErrorHandler';
import { UnauthorizedError, NotFoundError } from '@/errors/customErrors';
import type { AuthUser } from '@/types/auth';

const querySchema = z.object({
  appId: z.string().min(1).max(50).optional(),
  callbackUrl: z.string().min(1).optional(),
  redirectUri: z.string().url().optional(),
  state: z.string().min(1).optional(),
});

/**
 * Exchange a valid Auth.js Entra session for an Auth Center JWT access token.
 * Called by the client after completing the Entra OAuth flow.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError('No active Entra session');

    const entraSession = session as typeof session & { employeeId?: string; entraObjectId?: string };
    const employeeId = entraSession.employeeId ?? session.user.email?.split('@')[0];
    if (!employeeId) throw new UnauthorizedError('Employee ID not available in Entra session');

    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const appId = query.appId ?? 'default';
    const callbackUrl = query.callbackUrl ?? '/admin';
    await appRegistrationService.assertActiveApp(appId);

    const user = await userRepository.findActiveByEmployeeId(employeeId);
    if (!user) throw new NotFoundError('No active employee record found for this Entra identity');

    // Verify the authenticated Entra identity is actually linked to the resolved employee record.
    // Prevents an Entra email prefix from matching a different employee's ID.
    const entraObjectId = entraSession.entraObjectId;
    if (entraObjectId) {
      const link = await externalIdentityLinkRepository.findByEntraObjectId(entraObjectId);
      if (!link || link.userId !== user.id) {
        throw new UnauthorizedError('Entra identity is not linked to this employee record');
      }
    }

    const userWithProfile = await userRepository.findWithProfile(user.id);

    const authUser: AuthUser = {
      id: user.id,
      employeeId: user.employeeId,
      email: user.email,
      displayName: user.displayName,
      m365Linked: user.m365Linked,
      canSendDelegatedMail: user.canSendDelegatedMail,
      employmentStatus: 'ACTIVE',
      defaultAuthMethod: 'ENTRA',
      authMethod: 'ENTRA',
      departmentId: userWithProfile?.profile?.departmentId ?? null,
    };

    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    const ua = request.headers.get('user-agent') ?? 'unknown';

    const userSession = await sessionService.createSession(user.id, 'ENTRA', ip, ua);
    const result = await tokenService.issueAccessToken(authUser, appId, userSession.sessionId);

    if (query.redirectUri) {
      return NextResponse.redirect(
        buildConsumerRedirectUrl(query.redirectUri, result.accessToken, query.state)
      );
    }

    return NextResponse.redirect(new URL(callbackUrl, request.nextUrl.origin));
  } catch (error) {
    return handleApiError(error);
  }
}
