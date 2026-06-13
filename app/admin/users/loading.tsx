import { TableSkeleton } from '@/components/ui/skeleton';

export default function UsersLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="space-y-2 animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-24" />
        <div className="h-7 bg-slate-200 rounded w-32" />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="p-4 border-b border-slate-100 animate-pulse">
          <div className="h-10 bg-slate-100 rounded-xl" />
        </div>
        <TableSkeleton rows={10} />
      </div>
    </div>
  );
}
