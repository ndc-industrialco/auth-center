export default function Loading() {
  return (
    <div className="space-y-6 max-w-full animate-pulse">
      <div>
        <div className="h-3 w-40 bg-slate-200 rounded mb-3" />
        <div className="h-7 w-32 bg-slate-200 rounded mb-2" />
        <div className="h-3 w-64 bg-slate-100 rounded" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-100 bg-white p-3 text-center">
            <div className="h-5 w-8 bg-slate-200 rounded mx-auto mb-1" />
            <div className="h-2 w-14 bg-slate-100 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
          <div className="h-3 w-48 bg-slate-100 rounded" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 bg-slate-50 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
