export default function Loading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      <div>
        <div className="h-3 w-40 bg-slate-200 rounded mb-3" />
        <div className="h-7 w-48 bg-slate-200 rounded mb-2" />
        <div className="h-3 w-72 bg-slate-100 rounded" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="h-3 w-28 bg-slate-100 rounded mb-3" />
            <div className="h-8 w-12 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-slate-200 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-16 bg-slate-100 rounded-full" />
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="flex gap-2">
                <div className="h-6 w-20 bg-slate-100 rounded" />
                <div className="h-5 w-14 bg-indigo-50 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
