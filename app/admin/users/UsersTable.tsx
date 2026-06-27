'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { SyncUserButton } from './SyncUserButton';
import { bulkToggleDelegatedMailAction } from './actions';

type BadgeVariant = React.ComponentProps<typeof Badge>['variant'];

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  TERMINATED: 'danger',
};

interface User {
  id: string;
  employeeId: string;
  displayName: string | null;
  email: string | null;
  defaultAuthMethod: string;
  m365Linked: boolean;
  canSendDelegatedMail: boolean;
  employmentStatus: string;
  createdAt: Date;
  externalLinks: { id: string }[];
  localCredential: { id: string } | null;
}

interface Props {
  users: User[];
  sort: string;
  order: string;
  q?: string;
  status?: string;
  m365?: string;
  delegated?: string;
}

function sortHref(col: string, cur: string, ord: string, q?: string, status?: string, m365?: string, delegated?: string) {
  const p = new URLSearchParams();
  if (q) p.set('q', q);
  if (status) p.set('status', status);
  if (m365) p.set('m365', m365);
  if (delegated) p.set('delegated', delegated);
  p.set('sort', col);
  p.set('order', cur === col && ord === 'asc' ? 'desc' : 'asc');
  return `/admin/users?${p}`;
}

function si(col: string, cur: string, ord: string) {
  if (col !== cur) return <span className="ml-1 text-slate-300 font-normal">↕</span>;
  return <span className="ml-1 text-[#0F1059] font-normal">{ord === 'asc' ? '↑' : '↓'}</span>;
}

export function UsersTable({ users, sort, order, q, status, m365, delegated }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const allIds = users.map(u => u.id);
  const allChecked = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someChecked = selected.size > 0;

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(allIds));
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function bulkToggle(enable: boolean) {
    setFeedback(null);
    startTransition(async () => {
      const res = await bulkToggleDelegatedMailAction(Array.from(selected), enable);
      if (!res.ok) {
        setFeedback(res.error ?? 'Failed');
      } else {
        const skipped = (res as { skipped?: number }).skipped ?? 0;
        setFeedback(
          skipped > 0
            ? `Done. ${skipped} user(s) skipped (not M365-linked).`
            : `Done. ${selected.size} user(s) updated.`
        );
        setSelected(new Set());
      }
    });
  }

  return (
    <>
      {/* Bulk action toolbar */}
      {someChecked && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0F1059]/5 border-b border-[#0F1059]/10 text-sm">
          <span className="font-medium text-[#0F1059]">{selected.size} selected</span>
          <button
            disabled={isPending}
            onClick={() => bulkToggle(true)}
            className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Enable Delegated Mail
          </button>
          <button
            disabled={isPending}
            onClick={() => bulkToggle(false)}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Disable Delegated Mail
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            Clear
          </button>
          {feedback && <span className="text-slate-500">{feedback}</span>}
        </div>
      )}
      {/* Feedback when no row selected */}
      {!someChecked && feedback && (
        <div className="px-4 py-2 text-sm text-slate-500 border-b border-slate-100">{feedback}</div>
      )}

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="rounded border-slate-300 text-[#0F1059] focus:ring-[#0F1059]"
                />
              </th>
              <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">
                <Link href={sortHref('id', sort, order, q, status, m365, delegated)} className="hover:text-[#0F1059] flex items-center gap-0.5">
                  Employee ID{si('id', sort, order)}
                </Link>
              </th>
              <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">
                <Link href={sortHref('name', sort, order, q, status, m365, delegated)} className="hover:text-[#0F1059] flex items-center gap-0.5">
                  Name{si('name', sort, order)}
                </Link>
              </th>
              <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">
                <Link href={sortHref('email', sort, order, q, status, m365, delegated)} className="hover:text-[#0F1059] flex items-center gap-0.5">
                  Email{si('email', sort, order)}
                </Link>
              </th>
              <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Auth</th>
              <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">M365</th>
              <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">
                <Link href={sortHref('delegated', sort, order, q, status, m365, delegated)} className="hover:text-[#0F1059] inline-flex items-center gap-0.5">
                  Delegated Mail{si('delegated', sort, order)}
                </Link>
              </th>
              <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Status</th>
              <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-right">
                <Link href={sortHref('created', sort, order, q, status, m365, delegated)} className="hover:text-[#0F1059] flex items-center justify-end gap-0.5">
                  Created{si('created', sort, order)}
                </Link>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${selected.has(u.id) ? 'bg-blue-50/40' : ''}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggleOne(u.id)}
                    className="rounded border-slate-300 text-[#0F1059] focus:ring-[#0F1059]"
                  />
                </td>
                <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-700">{u.employeeId}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{u.displayName ?? '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{u.email ?? '-'}</td>
                <td className="px-4 py-3 text-center">
                  <Badge label={u.defaultAuthMethod} variant={u.defaultAuthMethod === 'ENTRA' ? 'info' : 'neutral'} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge label={u.m365Linked ? 'Linked' : 'Local only'} variant={u.m365Linked ? 'success' : 'neutral'} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge label={u.canSendDelegatedMail ? 'Enabled' : 'Disabled'} variant={u.canSendDelegatedMail ? 'success' : 'neutral'} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge label={u.employmentStatus} variant={STATUS_VARIANT[u.employmentStatus] ?? 'neutral'} />
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">
                  <div className="flex items-center justify-end gap-2">
                    <span>{u.createdAt.toISOString().slice(0, 10)}</span>
                    <SyncUserButton userId={u.id} linked={u.m365Linked} size="sm" variant="ghost" />
                    <Link href={`/admin/users/${u.id}`} className="text-[#0F1059] text-sm font-medium hover:underline font-sans">
                      Manage
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="lg:hidden divide-y divide-slate-100">
        {users.map((u) => (
          <div key={u.id} className={`p-4 hover:bg-slate-50 transition-colors ${selected.has(u.id) ? 'bg-blue-50/40' : ''}`}>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(u.id)}
                onChange={() => toggleOne(u.id)}
                className="mt-1 rounded border-slate-300 text-[#0F1059] focus:ring-[#0F1059]"
              />
              <Link href={`/admin/users/${u.id}`} className="flex-1 block">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-mono text-sm font-semibold text-slate-800">{u.employeeId}</p>
                    <p className="text-sm text-slate-600">{u.displayName ?? u.email ?? '-'}</p>
                  </div>
                  <Badge label={u.employmentStatus} variant={STATUS_VARIANT[u.employmentStatus] ?? 'neutral'} />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge label={u.defaultAuthMethod} variant={u.defaultAuthMethod === 'ENTRA' ? 'info' : 'neutral'} />
                  {u.m365Linked && <Badge label="M365" variant="success" />}
                  <Badge label={u.canSendDelegatedMail ? 'Delegated' : 'No Delegated'} variant={u.canSendDelegatedMail ? 'success' : 'neutral'} />
                </div>
              </Link>
            </div>
            <div className="mt-3 ml-7 flex items-center gap-2">
              <SyncUserButton userId={u.id} linked={u.m365Linked} size="sm" variant="secondary" />
              <Link href={`/admin/users/${u.id}`} className="text-[#0F1059] text-sm font-medium hover:underline">
                Open Detail
              </Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
