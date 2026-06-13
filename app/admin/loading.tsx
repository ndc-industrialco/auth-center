import { CardSkeleton, TableSkeleton } from '@/components/ui/skeleton';

export default function AdminLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-2 animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-24" />
        <div className="h-7 bg-slate-200 rounded w-48" />
        <div className="h-3 bg-slate-100 rounded w-36" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <TableSkeleton rows={8} />
      </div>
    </div>
  );
}
