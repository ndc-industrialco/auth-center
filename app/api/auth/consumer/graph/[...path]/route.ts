import { type NextRequest, NextResponse } from 'next/server';
import { requireConsumerApp } from '@/lib/requireConsumerApp';
import { graphProxyRequest } from '@/lib/graphAdminClient';
import { handleApiError } from '@/lib/apiErrorHandler';

// Blocked Graph paths — prevent consumer apps from touching auth-center's own directory
const BLOCKED = [/^\/applications\b/, /^\/servicePrincipals\b/];

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
    await requireConsumerApp(request);

    const { path } = await context.params;
    const graphPath = buildGraphPath(path, request);

    if (BLOCKED.some((re) => re.test(graphPath))) {
      return NextResponse.json({ success: false, error: { message: 'Path not allowed', code: 'FORBIDDEN' } }, { status: 403 });
    }

    const body = ['GET', 'HEAD', 'DELETE'].includes(request.method)
      ? undefined
      : await request.json().catch(() => undefined);

    const upstream = await graphProxyRequest(graphPath, request.method, body);

    // Stream the Graph response back as-is
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
