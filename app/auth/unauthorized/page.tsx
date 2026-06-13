import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center mx-auto">
            <span className="text-rose-600 text-xl font-bold">!</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Access Denied</h1>
          <p className="text-sm text-slate-500">
            You do not have the <span className="font-mono font-semibold text-slate-700">ADMIN</span> role
            in the Auth Center. Contact your system administrator to request access.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center h-11 w-full rounded-xl bg-[#0F1059] text-white text-sm font-semibold hover:bg-[#161875] transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}
