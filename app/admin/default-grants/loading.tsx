import { CardSkeleton } from '@/components/ui/skeleton';

export default function DefaultGrantsLoading() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-end animate-pulse">
        <div className="space-y-2">
          <div className="h-3 bg-slate-200 rounded w-24" />
          <div className="h-7 bg-slate-200 rounded w-52" />
          <div className="h-3 bg-slate-100 rounded w-72" />
        </div>
        <div className="h-11 w-32 bg-slate-200 rounded-xl" />
      </div>
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
