'use client';

import { useState, useMemo } from 'react';

export type SerializedLog = {
  id: string;
  action: string;
  actorId: string;
  resourceType: string;
  resourceId: string | null;
  targetAppId: string | null;
  targetUserId: string | null;
  performedAt: string;
};

const ACTION_LABEL: Record<string, string> = {
  APP_REGISTERED: 'Registered app',
  APP_DEACTIVATED: 'Deactivated app',
  ROLE_GRANTED: 'Granted role',
  ROLE_REVOKED: 'Revoked role',
  ENTRA_LINKED: 'Linked Entra',
  ENTRA_UNLINKED: 'Unlinked Entra',
  SESSION_REVOKED_BY_ADMIN: 'Revoked session',
};

export function AuditTable({ logs }: { logs: SerializedLog[] }) {
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const uniqueActions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs]);

  const result = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = logs.filter((l) => {
      if (actionFilter && l.action !== actionFilter) return false;
      if (q) {
        return (
          l.actorId.toLowerCase().includes(q) ||
          l.resourceType.toLowerCase().includes(q) ||
          (l.targetAppId ?? '').toLowerCase().includes(q) ||
          (l.targetUserId ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
    return [...filtered].sort((a, b) =>
      sortDir === 'asc'
        ? a.performedAt.localeCompare(b.performedAt)
        : b.performedAt.localeCompare(a.performedAt)
    );
  }, [logs, actionFilter, search, sortDir]);

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-slate-100">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search actor, resource, target…"
          className="flex-1 min-w-48 bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors"
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:border-[#0F1059]"
        >
          <option value="">All Actions</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>{ACTION_LABEL[a] ?? a}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400 shrink-0">{result.length} of {logs.length}</span>
      </div>

      {result.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">No records match your filters.</div>
      ) : (
        <>
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Action</th>
                  <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Actor</th>
                  <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Resource</th>
                  <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Target</th>
                  <th
                    className="text-slate-800 text-sm font-semibold px-4 py-3 text-center cursor-pointer select-none hover:text-[#0F1059]"
                    onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  >
                    Performed At {sortDir === 'asc' ? '↑' : '↓'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {ACTION_LABEL[log.action] ?? log.action}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.actorId}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {log.resourceType}
                      {log.resourceId && (
                        <span className="font-mono text-slate-400"> #{log.resourceId.slice(-8)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {log.targetAppId && <span className="font-mono">{log.targetAppId}</span>}
                      {log.targetUserId && <span className="font-mono"> / {log.targetUserId.slice(-8)}</span>}
                      {!log.targetAppId && !log.targetUserId && '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400 text-center">
                      {log.performedAt.slice(0, 19).replace('T', ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden divide-y divide-slate-100">
            {result.map((log) => (
              <div key={log.id} className="p-4 space-y-1">
                <p className="text-sm font-medium text-slate-800">{ACTION_LABEL[log.action] ?? log.action}</p>
                <p className="text-xs text-slate-500 font-mono">
                  {log.resourceType} · {log.targetAppId ?? log.targetUserId?.slice(-8) ?? '-'}
                </p>
                <p className="text-xs text-slate-400 font-mono">
                  {log.performedAt.slice(0, 19).replace('T', ' ')}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
