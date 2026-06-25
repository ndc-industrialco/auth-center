'use client';

import { useRef } from 'react';
import Link from 'next/link';

interface Props {
  q?: string;
  status?: string;
  m365?: string;
  delegated?: string;
  sort: string;
  order: string;
  hasFilter: boolean;
}

export function UsersFilterBar({ q, status, m365, delegated, sort, order, hasFilter }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.submit();

  return (
    <form ref={formRef} method="GET" className="flex flex-wrap items-center gap-3 p-4 border-b border-slate-100">
      <input type="hidden" name="sort" value={sort} />
      <input type="hidden" name="order" value={order} />
      <input
        name="q"
        defaultValue={q}
        placeholder="Search by Employee ID, name, or email..."
        className="flex-1 min-w-48 bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors"
      />
      <select
        name="status"
        defaultValue={status ?? ''}
        onChange={submit}
        className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:border-[#0F1059]"
      >
        <option value="">All Statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
        <option value="SUSPENDED">Suspended</option>
        <option value="TERMINATED">Terminated</option>
      </select>
      <select
        name="m365"
        defaultValue={m365 ?? ''}
        onChange={submit}
        className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:border-[#0F1059]"
      >
        <option value="">All M365</option>
        <option value="linked">Linked</option>
        <option value="unlinked">Local Only</option>
      </select>
      <select
        name="delegated"
        defaultValue={delegated ?? ''}
        onChange={submit}
        className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:border-[#0F1059]"
      >
        <option value="">All Delegated</option>
        <option value="enabled">Enabled</option>
        <option value="disabled">Disabled</option>
      </select>
      <button
        type="submit"
        className="h-10 px-4 rounded-xl bg-[#0F1059] text-white text-sm font-medium hover:bg-[#161875] transition-colors"
      >
        Filter
      </button>
      {hasFilter && (
        <Link
          href="/admin/users"
          className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center"
        >
          Clear
        </Link>
      )}
    </form>
  );
}
