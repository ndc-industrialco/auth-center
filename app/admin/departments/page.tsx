import Link from 'next/link';
import type { Prisma } from '@/app/generated/prisma/client';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { CreateDepartmentButton, EditDepartmentButton, DeleteDepartmentButton, SyncFromM365Button, SyncDeptToM365Button } from './DepartmentClient';

interface Props {
  searchParams: Promise<{ q?: string; sort?: string; order?: string; source?: string }>;
}

async function getDepartments(search?: string, sort = 'name', order: 'asc' | 'desc' = 'asc', source?: string) {
  const dir = order === 'desc' ? 'desc' as const : 'asc' as const;
  let orderBy: Prisma.DepartmentOrderByWithRelationInput;
  if (sort === 'code') orderBy = { code: dir };
  else if (sort === 'users') orderBy = { profiles: { _count: dir } };
  else if (sort === 'synced') orderBy = { syncedAt: { sort: dir, nulls: 'last' } };
  else orderBy = { displayName: dir };

  const where: Prisma.DepartmentWhereInput = {};
  if (search) {
    where.OR = [
      { displayName: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (source === 'graph') where.source = 'GRAPH';
  else if (source === 'manual') where.source = { not: 'GRAPH' };

  return db.department.findMany({
    where,
    orderBy,
    include: {
      _count: { select: { profiles: { where: { user: { employmentStatus: 'ACTIVE' } } } } },
    },
  });
}

function sortHref(col: string, cur: string, ord: string, q?: string, source?: string) {
  const p = new URLSearchParams();
  if (q) p.set('q', q);
  if (source) p.set('source', source);
  p.set('sort', col);
  p.set('order', cur === col && ord === 'asc' ? 'desc' : 'asc');
  return `/admin/departments?${p}`;
}

function si(col: string, cur: string, ord: string) {
  if (col !== cur) return <span className="ml-1 text-slate-300 font-normal">↕</span>;
  return <span className="ml-1 text-[#0F1059] font-normal">{ord === 'asc' ? '↑' : '↓'}</span>;
}

export default async function AdminDepartmentsPage({ searchParams }: Props) {
  const { q, sort = 'name', order = 'asc', source } = await searchParams;
  const departments = await getDepartments(q, sort, order as 'asc' | 'desc', source);

  const graphCount = departments.filter((d) => d.source === 'GRAPH').length;
  const manualCount = departments.filter((d) => d.source !== 'GRAPH').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <span>Admin</span><span>/</span><span>Departments</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">Departments</h1>
          <p className="text-sm text-slate-400 mt-1">
            {departments.length} department{departments.length !== 1 ? 's' : ''}
            {q ? ` matching "${q}"` : ''}
            {source === 'graph' ? ' · M365 only' : source === 'manual' ? ' · Manual only' : ` · ${graphCount} from M365${manualCount > 0 ? `, ${manualCount} manual` : ''}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <SyncFromM365Button />
          <CreateDepartmentButton />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <form method="GET" className="flex flex-wrap items-center gap-3 p-4 border-b border-slate-100">
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="order" value={order} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by code or name..."
            className="flex-1 min-w-48 bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors"
          />
          <select
            name="source"
            defaultValue={source ?? ''}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:border-[#0F1059]"
          >
            <option value="">All Sources</option>
            <option value="graph">M365</option>
            <option value="manual">Manual</option>
          </select>
          <button
            type="submit"
            className="h-10 px-4 rounded-xl bg-[#0F1059] text-white text-sm font-medium hover:bg-[#161875] transition-colors"
          >
            Filter
          </button>
          {(q || source) && (
            <Link
              href="/admin/departments"
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center"
            >
              Clear
            </Link>
          )}
        </form>

        {departments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-slate-800 font-semibold text-base mb-1">No departments found</p>
            <p className="text-slate-400 text-sm">
              {q ? 'Try a different search term.' : 'Click "Sync from M365" or add a manual department.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">
                    <Link href={sortHref('code', sort, order, q, source)} className="hover:text-[#0F1059] flex items-center gap-0.5">
                      Code{si('code', sort, order)}
                    </Link>
                  </th>
                  <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">
                    <Link href={sortHref('name', sort, order, q, source)} className="hover:text-[#0F1059] flex items-center gap-0.5">
                      Display Name{si('name', sort, order)}
                    </Link>
                  </th>
                  <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Source</th>
                  <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">
                    <Link href={sortHref('users', sort, order, q, source)} className="hover:text-[#0F1059] flex items-center justify-center gap-0.5">
                      Users{si('users', sort, order)}
                    </Link>
                  </th>
                  <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">
                    <Link href={sortHref('synced', sort, order, q, source)} className="hover:text-[#0F1059] flex items-center gap-0.5">
                      Last Synced{si('synced', sort, order)}
                    </Link>
                  </th>
                  <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-700">{dept.code}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{dept.displayName}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        label={dept.source === 'GRAPH' ? 'M365' : 'Manual'}
                        variant={dept.source === 'GRAPH' ? 'info' : 'neutral'}
                      />
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-slate-600">{dept._count.profiles}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {dept.syncedAt
                        ? new Date(dept.syncedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/departments/${dept.code}`}
                          className="text-[#0F1059] text-xs font-medium hover:underline"
                        >
                          Members
                        </Link>
                        <SyncDeptToM365Button code={dept.code} />
                        <EditDepartmentButton code={dept.code} currentName={dept.displayName} />
                        <DeleteDepartmentButton code={dept.code} userCount={dept._count.profiles} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
