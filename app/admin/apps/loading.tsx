import { TableSkeleton } from '@/components/ui/skeleton';

export default function AppsLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end animate-pulse">
        <div className="space-y-2">
          <div className="h-3 bg-slate-200 rounded w-24" />
          <div className="h-7 bg-slate-200 rounded w-40" />
        </div>
        <div className="h-11 w-32 bg-slate-200 rounded-xl" />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <TableSkeleton rows={6} />
      </div>
    </div>
  );
}
