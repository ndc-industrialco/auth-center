import { type NextRequest, NextResponse } from 'next/server';
import { tokenService } from '@/services/tokenService';
import { externalIdentityLinkRepository } from '@/repositories/externalIdentityLinkRepository';
import { userRepository } from '@/repositories/userRepository';
import { graphDelegatedProxyRequest } from '@/lib/graphAdminClient';
import { handleApiError } from '@/lib/apiErrorHandler';
import { ForbiddenError, UnauthorizedError, NotFoundError } from '@/errors/customErrors';

// Paths that require canSendDelegatedMail=true on the user
const MAIL_PATHS = [/^\/me\/sendMail\b/, /^\/users\/[^/]+\/sendMail\b/];

function buildGraphPath(segments: string[], request: NextRequest): string {
  const base = '/' + segments.join('/');
  const qs = request.nextUrl.searchParams.toString();
  return qs ? `${base}?${qs}` : base;
}

async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();
    const claims = await tokenService.verifyAccessToken(authHeader.slice(7));

    if (claims.authMethod !== 'ENTRA') {
      throw new ForbiddenError('Delegated Graph access requires Entra authentication');
    }

    const { path } = await context.params;
    const graphPath = buildGraphPath(path, request);

    // Mail paths need explicit opt-in
    if (MAIL_PATHS.some((re) => re.test(graphPath)) && !claims.canSendDelegatedMail) {
      throw new ForbiddenError('Delegated mail is not enabled for this account');
    }

    // Resolve sender UPN
    const [link, user] = await Promise.all([
      externalIdentityLinkRepository.findByUserId(claims.userId),
      userRepository.findById(claims.userId),
    ]);
    if (!user) throw new NotFoundError('User not found');
    const userUpn = link?.entraUpn ?? user.email;
    if (!userUpn) throw new ForbiddenError('No resolvable Entra UPN for this user');

    const body = ['GET', 'HEAD', 'DELETE'].includes(request.method)
      ? undefined
      : await request.json().catch(() => undefined);

    const upstream = await graphDelegatedProxyRequest(userUpn, graphPath, request.method, body);

    const responseBody = upstream.status === 204 ? null : await upstream.text();
    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
