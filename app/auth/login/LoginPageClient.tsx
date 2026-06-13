'use client';

import { useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { localLoginAction } from './actions';

export function LoginPageClient({
  callbackUrl,
  appId,
  redirectUri,
  state,
}: {
  callbackUrl: string;
  appId: string;
  redirectUri?: string;
  state?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLocalLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await localLoginAction(
        new FormData(e.currentTarget),
        appId,
        redirectUri,
        state
      );
      if (!result.ok) {
        setError(result.error ?? 'Login failed');
        return;
      }
      router.push(result.redirectTo ?? callbackUrl);
    });
  }

  async function handleEntraLogin() {
    const nextCallbackUrl = new URL('/api/auth/login/entra', window.location.origin);
    nextCallbackUrl.searchParams.set('callbackUrl', callbackUrl);
    nextCallbackUrl.searchParams.set('appId', appId);
    if (redirectUri) {
      nextCallbackUrl.searchParams.set('redirectUri', redirectUri);
    }
    if (state) {
      nextCallbackUrl.searchParams.set('state', state);
    }

    await signIn('microsoft-entra-id', {
      callbackUrl: nextCallbackUrl.toString(),
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 space-y-6">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-xl bg-[#0F1059] flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl font-bold">N</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">NDC Auth Center</h1>
            <p className="text-sm text-slate-400">Sign in to your account</p>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleEntraLogin}
            className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1059] focus-visible:ring-offset-2"
          >
            <MicrosoftIcon />
            Sign in with Microsoft 365
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-slate-400">or sign in with Employee ID</span>
            </div>
          </div>

          <form onSubmit={handleLocalLogin} className="space-y-4">
            <div>
              <label htmlFor="employeeId" className="text-slate-800 text-sm font-semibold mb-2 block">
                Employee ID <span className="text-rose-600">*</span>
              </label>
              <input
                id="employeeId"
                name="employeeId"
                type="text"
                autoComplete="username"
                required
                placeholder="e.g. EMP001"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-slate-800 text-sm font-semibold mb-2 block">
                Password <span className="text-rose-600">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-11 rounded-xl bg-[#0F1059] text-white text-sm font-semibold hover:bg-[#161875] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1059] focus-visible:ring-offset-2"
            >
              {isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">NDC Industrial Co., Ltd.</p>
      </div>
    </main>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
