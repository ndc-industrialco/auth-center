import { cn } from '@/lib/utils';

type BadgeVariant = 'active' | 'inactive' | 'suspended' | 'pending' | 'success' | 'danger' | 'info' | 'neutral';

const variantClasses: Record<BadgeVariant, string> = {
  active:    'bg-emerald-50 text-emerald-600 border-emerald-200',
  success:   'bg-emerald-50 text-emerald-600 border-emerald-200',
  inactive:  'bg-slate-50 text-slate-500 border-slate-200',
  neutral:   'bg-slate-50 text-slate-500 border-slate-200',
  suspended: 'bg-amber-50 text-amber-600 border-amber-200',
  pending:   'bg-amber-50 text-amber-600 border-amber-200',
  danger:    'bg-rose-50 text-rose-600 border-rose-200',
  info:      'bg-sky-50 text-sky-600 border-sky-200',
};

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  className?: string;
}

export function Badge({ label, variant, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border',
        variantClasses[variant],
        className
      )}
    >
      {label}
    </span>
  );
}
