'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { RevokeButton } from './RevokeButton';

export type SerializedGrant = {
  id: string;
  role: string;
  grantedAt: string;
  expiresAt: string | null;
  user: { employeeId: string; displayName: string | null };
  app: { displayName: string };
};

type SortCol = 'employee' | 'app' | 'role' | 'granted' | 'expires';

function si(col: SortCol, active: SortCol, dir: 'asc' | 'desc') {
  return col === active ? (dir === 'asc' ? ' ↑' : ' ↓') : ' ↕';
}

interface Props {
  grants: SerializedGrant[];
  appNames: string[];
}

export function RoleGrantsTable({ grants, appNames }: Props) {
  const [search, setSearch] = useState('');
  const [appFilter, setAppFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortCol, setSortCol] = useState<SortCol>('granted');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const uniqueRoles = useMemo(() => [...new Set(grants.map((g) => g.role))].sort(), [grants]);

  const now = new Date().toISOString();

  function handleSort(col: SortCol) {
    if (col === sortCol) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  }

  const result = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = grants.filter((g) => {
      if (appFilter && g.app.displayName !== appFilter) return false;
      if (roleFilter && g.role !== roleFilter) return false;
      if (q) {
        return (
          g.user.employeeId.toLowerCase().includes(q) ||
          (g.user.displayName ?? '').toLowerCase().includes(q) ||
          g.app.displayName.toLowerCase().includes(q) ||
          g.role.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      let av: string, bv: string;
      switch (sortCol) {
        case 'employee': av = a.user.employeeId; bv = b.user.employeeId; break;
        case 'app': av = a.app.displayName; bv = b.app.displayName; break;
        case 'role': av = a.role; bv = b.role; break;
        case 'expires': av = a.expiresAt ?? ''; bv = b.expiresAt ?? ''; break;
        default: av = a.grantedAt; bv = b.grantedAt;
      }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [grants, search, appFilter, roleFilter, sortCol, sortDir]);

  const thClass = 'text-slate-800 text-sm font-semibold px-4 py-3 cursor-pointer select-none hover:text-[#0F1059]';

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-slate-100">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employee, app, role…"
          className="flex-1 min-w-48 bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors"
        />
        <select
          value={appFilter}
          onChange={(e) => setAppFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:border-[#0F1059]"
        >
          <option value="">All Apps</option>
          {appNames.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:border-[#0F1059]"
        >
          <option value="">All Roles</option>
          {uniqueRoles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="text-xs text-slate-400 shrink-0">{result.length} of {grants.length}</span>
      </div>

      {result.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">No grants match your filters.</div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className={`${thClass} text-left`} onClick={() => handleSort('employee')}>
                    Employee{si('employee', sortCol, sortDir)}
                  </th>
                  <th className={`${thClass} text-left`} onClick={() => handleSort('app')}>
                    App{si('app', sortCol, sortDir)}
                  </th>
                  <th className={`${thClass} text-left`} onClick={() => handleSort('role')}>
                    Role{si('role', sortCol, sortDir)}
                  </th>
                  <th className={`${thClass} text-center`} onClick={() => handleSort('granted')}>
                    Granted{si('granted', sortCol, sortDir)}
                  </th>
                  <th className={`${thClass} text-center`} onClick={() => handleSort('expires')}>
                    Expires{si('expires', sortCol, sortDir)}
                  </th>
                  <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.map((g) => (
                  <tr key={g.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm font-semibold text-slate-700">{g.user.employeeId}</p>
                      {g.user.displayName && <p className="text-xs text-slate-400">{g.user.displayName}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{g.app.displayName}</td>
                    <td className="px-4 py-3">
                      <Badge label={g.role} variant="info" />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400 text-center">
                      {g.grantedAt.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-center">
                      {g.expiresAt ? (
                        <span className={g.expiresAt < now ? 'text-rose-500' : 'text-slate-400'}>
                          {g.expiresAt.slice(0, 10)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <RevokeButton grantId={g.id} role={g.role} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="lg:hidden divide-y divide-slate-100">
            {result.map((g) => (
              <div key={g.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-slate-800">{g.user.employeeId}</p>
                    <p className="text-xs text-slate-400">{g.app.displayName}</p>
                  </div>
                  <Badge label={g.role} variant="info" />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-mono">{g.grantedAt.slice(0, 10)}</p>
                  <RevokeButton grantId={g.id} role={g.role} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
