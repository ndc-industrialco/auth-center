'use server';

import { cookies } from 'next/headers';
import { authService } from '@/services/authService';
import { localLoginSchema } from '@/schemas/authSchema';
import { ZodError } from 'zod';
import { buildConsumerRedirectUrl } from '@/lib/consumerRedirect';

const COOKIE_NAME = 'ac_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days — matches ACCESS_TOKEN_TTL_SEC in tokenService

export interface LoginResult {
  ok: boolean;
  error?: string;
  sessionId?: string;
  redirectTo?: string;
}

export async function localLoginAction(
  formData: FormData,
  appId: string,
  redirectUri?: string,
  state?: string
): Promise<LoginResult> {
  const raw = {
    employeeId: formData.get('employeeId') as string,
    password: formData.get('password') as string,
  };

  let parsed;
  try {
    parsed = localLoginSchema.parse({ ...raw, appId });
  } catch (e) {
    if (e instanceof ZodError) {
      return { ok: false, error: e.issues[0]?.message ?? 'Validation failed' };
    }
    return { ok: false, error: 'Invalid input' };
  }

  try {
    const result = await authService.loginLocal(parsed, 'server-action', 'server-action', appId);

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    return {
      ok: true,
      sessionId: result.sessionId,
      ...(redirectUri
        ? { redirectTo: buildConsumerRedirectUrl(redirectUri, result.accessToken, state) }
        : {}),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return { ok: false, error: message };
  }
}
