import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const ADMIN_API_PREFIX = '/api/auth/admin';
const ADMIN_UI_PREFIX = '/admin';
const LOGIN_PAGE = '/auth/login';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin UI pages — require an active Auth.js session
  if (pathname.startsWith(ADMIN_UI_PREFIX)) {
    const session = await auth();
    if (!session?.user) {
      const loginUrl = new URL(LOGIN_PAGE, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Admin API routes — no optimistic session check here; per-handler requireAdmin() handles auth
  // Proxy only adds a security header to confirm the request passed through the proxy layer
  if (pathname.startsWith(ADMIN_API_PREFIX)) {
    const response = NextResponse.next();
    response.headers.set('x-proxy-checked', '1');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/auth/admin/:path*',
  ],
};
