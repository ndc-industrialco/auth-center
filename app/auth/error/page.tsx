import Link from 'next/link';

// Auth.js v5 passes error as a search param: ?error=<ErrorCode>
const ERROR_MESSAGES: Record<string, string> = {
  Configuration:    'There is a problem with the server configuration. Contact support.',
  AccessDenied:     'Access was denied. You may not have permission to sign in.',
  Verification:     'The verification link has expired or has already been used.',
  OAuthSignin:      'Could not start the sign-in process. Try again.',
  OAuthCallback:    'There was a problem during the sign-in callback.',
  OAuthCreateAccount: 'Could not create a user account. Contact support.',
  Signin:           'Sign in failed. Check your credentials and try again.',
  Default:          'An unexpected authentication error occurred.',
};

interface ErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams;
  const code = params.error ?? 'Default';
  const message = ERROR_MESSAGES[code] ?? ERROR_MESSAGES.Default;

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center mx-auto">
            <span className="text-rose-600 text-xl font-bold">!</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Authentication Error</h1>
          <p className="text-sm text-slate-500">{message}</p>
          {code !== 'Default' && (
            <p className="text-xs text-slate-400 font-mono">Error code: {code}</p>
          )}
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center h-11 w-full rounded-xl bg-[#0F1059] text-white text-sm font-semibold hover:bg-[#161875] transition-colors"
          >
            Try Again
          </Link>
        </div>
      </div>
    </main>
  );
}
