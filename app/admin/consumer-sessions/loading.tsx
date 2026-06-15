export default function Loading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      <div>
        <div className="h-3 w-44 bg-slate-200 rounded mb-3" />
        <div className="h-7 w-64 bg-slate-200 rounded mb-2" />
        <div className="h-3 w-96 bg-slate-100 rounded" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="h-3 w-28 bg-slate-100 rounded mb-3" />
            <div className="h-8 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3">
          <div className="h-11 flex-1 bg-slate-100 rounded-xl" />
          <div className="h-11 w-40 bg-slate-100 rounded-xl" />
          <div className="h-11 w-40 bg-slate-100 rounded-xl" />
          <div className="h-11 w-28 bg-slate-200 rounded-xl" />
        </div>

        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="grid grid-cols-5 gap-4 items-start">
              <div className="space-y-2">
                <div className="h-4 w-36 bg-slate-200 rounded" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
              </div>
              <div className="h-4 w-28 bg-slate-100 rounded" />
              <div className="h-5 w-40 bg-slate-100 rounded" />
              <div className="h-6 w-20 bg-slate-100 rounded-full" />
              <div className="h-4 w-32 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
