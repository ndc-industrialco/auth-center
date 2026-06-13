import { CardSkeleton, Skeleton } from '@/components/ui/skeleton';

export default function UserDetailLoading() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="space-y-2 animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-32" />
        <div className="h-7 bg-slate-200 rounded w-56" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3 animate-pulse">
        <Skeleton className="h-5 w-32" />
        {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    </div>
  );
}
