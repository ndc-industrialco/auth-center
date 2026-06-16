import Link from 'next/link';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { CreateDepartmentButton, EditDepartmentButton, DeleteDepartmentButton, SyncFromM365Button } from './DepartmentClient';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

async function getDepartments(search?: string) {
  return db.department.findMany({
    where: search
      ? {
          OR: [
            { displayName: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { displayName: 'asc' },
  });
}

export default async function AdminDepartmentsPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const departments = await getDepartments(q);

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
            {' · '}{graphCount} from M365{manualCount > 0 ? `, ${manualCount} manual` : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <SyncFromM365Button />
          <CreateDepartmentButton />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <form method="GET" className="flex items-center gap-3 p-4 border-b border-slate-100">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by code or name..."
            className="flex-1 bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors"
          />
          <button
            type="submit"
            className="h-9 px-4 rounded-xl bg-[#0F1059] text-white text-sm font-medium hover:bg-[#161875] transition-colors"
          >
            Search
          </button>
          {q && (
            <Link
              href="/admin/departments"
              className="h-9 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center"
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
                  <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Code</th>
                  <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Display Name</th>
                  <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Source</th>
                  <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Users</th>
                  <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Last Synced</th>
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
                    <td className="px-4 py-3 text-center text-sm text-slate-600">{dept.userCount}</td>
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
                        <EditDepartmentButton code={dept.code} currentName={dept.displayName} />
                        <DeleteDepartmentButton code={dept.code} userCount={dept.userCount} />
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
