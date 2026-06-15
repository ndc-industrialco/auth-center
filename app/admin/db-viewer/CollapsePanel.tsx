'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  subtitle?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsePanel({ title, subtitle, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      {/* Header — always visible, click to toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div>
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">{subtitle}</p>}
        </div>

        {/* Chevron icon */}
        <span
          className={cn(
            'shrink-0 w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center transition-transform duration-200',
            open ? 'rotate-0' : '-rotate-90',
          )}
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-slate-500">
            <path d="M2.5 5L7 9.5L11.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/* Body — collapsible */}
      <div
        className={cn(
          'transition-all duration-200 overflow-hidden',
          open ? 'max-h-[none]' : 'max-h-0',
        )}
      >
        {children}
      </div>
    </div>
  );
}
