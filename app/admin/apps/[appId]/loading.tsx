export default function AppDetailLoading() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div>
        <div className="h-3 w-32 bg-slate-200 rounded mb-3" />
        <div className="h-7 w-64 bg-slate-200 rounded mb-2" />
        <div className="h-3 w-24 bg-slate-200 rounded" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 px-5 py-4">
            <div className="h-3 w-20 bg-slate-200 rounded mb-2" />
            <div className="h-7 w-12 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="h-5 w-32 bg-slate-200 rounded mb-2" />
          <div className="h-3 w-48 bg-slate-200 rounded" />
        </div>
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-4 w-28 bg-slate-200 rounded" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
              </div>
              <div className="h-7 w-16 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
