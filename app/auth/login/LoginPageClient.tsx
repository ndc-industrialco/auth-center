'use client';

import { useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { localLoginAction } from './actions';

const t = {
  en: {
    subtitle: 'Sign in to your account',
    microsoft: 'Sign in with Microsoft 365',
    or: 'or sign in with Employee ID',
    empId: 'Employee ID',
    empPlaceholder: 'Employee Identification Number',
    password: 'Password',
    signin: 'Sign in',
    signingIn: 'Signing in...',
    footer: 'NDC Industrial Co., Ltd.',
  },
  th: {
    subtitle: 'เข้าสู่ระบบบัญชีของคุณ',
    microsoft: 'เข้าสู่ระบบด้วย Microsoft 365',
    or: 'หรือเข้าสู่ระบบด้วยรหัสพนักงาน',
    empId: 'รหัสพนักงาน',
    empPlaceholder: 'รหัสประจำตัวพนักงาน',
    password: 'รหัสผ่าน',
    signin: 'เข้าสู่ระบบ',
    signingIn: 'กำลังเข้าสู่ระบบ...',
    footer: 'บริษัท เอ็นดีซี อินดัสเทรียล จำกัด',
  },
} as const;

type Lang = keyof typeof t;

export function LoginPageClient({
  callbackUrl,
  appId,
  redirectUri,
  state,
  publicBaseUrl,
}: {
  callbackUrl: string;
  appId: string;
  redirectUri?: string;
  state?: string;
  publicBaseUrl: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [lang, setLang] = useState<Lang>('th');

  const tx = t[lang];

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
    const nextCallbackUrl = new URL('/api/auth/login/entra', publicBaseUrl);
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

  const YT_ID = "XKch3HFovaQ";
  const YT_SRC =
    `https://www.youtube-nocookie.com/embed/${YT_ID}` +
    `?autoplay=1&mute=1&loop=1&playlist=${YT_ID}` +
    `&controls=0&showinfo=0&rel=0&iv_load_policy=3` +
    `&modestbranding=1&disablekb=1&fs=0&playsinline=1`;

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* YouTube video background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <iframe
          src={YT_SRC}
          title="background"
          allow="autoplay; encrypted-media"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[177.78vh] min-w-full h-[56.25vw] min-h-full border-0 scale-[1.2] sm:scale-[1]"
        />
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Language switcher */}
      <div className="absolute top-4 right-4 flex gap-1 bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20">
        {(['th', 'en'] as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              lang === l
                ? 'bg-white text-[#0F1059]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            {l === 'th' ? 'ไทย' : 'EN'}
          </button>
        ))}
      </div>

      <div className="w-full max-w-sm">
        <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 shadow-[0_8px_40px_rgb(0,0,0,0.4)] p-8 space-y-6">
          <div className="text-center space-y-1">
            {/* NDC Logo */}
            <div className="flex justify-center mb-4">
              <Image
                src="/logo/logo.webp"
                alt="NDC Industrial"
                width={160}
                height={52}
                priority
                className="brightness-0 invert"
              />
            </div>
            <p className="text-sm text-white/60">{tx.subtitle}</p>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/20 border border-rose-400/40 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleEntraLogin}
            className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-white/30 bg-white/15 text-sm font-medium text-white hover:bg-white/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <MicrosoftIcon />
            {tx.microsoft}
          </button>

          <div className="relative">
            <div className="absolute inset-5 flex items-center">
              <div className="w-full border-t border-white/20" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-transparent px-3 text-xs text-white/50">{tx.or}</span>
            </div>
          </div>

          <form onSubmit={handleLocalLogin} className="space-y-4">
            <div>
              <label htmlFor="employeeId" className="text-white/90 text-sm font-semibold mb-2 block">
                {tx.empId} <span className="text-rose-400">*</span>
              </label>
              <input
                id="employeeId"
                name="employeeId"
                type="text"
                autoComplete="username"
                required
                placeholder={tx.empPlaceholder}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/50 focus:bg-white/15 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-white/90 text-sm font-semibold mb-2 block">
                {tx.password} <span className="text-rose-400">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/50 focus:bg-white/15 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-11 rounded-xl bg-[#0F1059] text-white text-sm font-semibold hover:bg-[#161875] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1059] focus-visible:ring-offset-2"
            >
              {isPending ? tx.signingIn : tx.signin}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-white/40 mt-6">{tx.footer}</p>
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
