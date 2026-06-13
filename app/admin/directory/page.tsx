import Link from 'next/link';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { DirectorySyncClient } from './DirectorySyncClient';

async function getDirectoryData() {
  const [users, departments, groups] = await Promise.all([
    db.user.count({ where: { m365Linked: true } }),
    db.department.findMany({ orderBy: [{ userCount: 'desc' }, { displayName: 'asc' }], take: 50 }),
    db.emailGroup.findMany({ orderBy: [{ memberCount: 'desc' }, { displayName: 'asc' }], take: 50 }),
  ]);

  return { users, departments, groups };
}

export default async function DirectoryPage() {
  const { users, departments, groups } = await getDirectoryData();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <span>Admin</span>
            <span>/</span>
            <span>Directory</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">Directory Sync</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Sync Microsoft Entra users, departments, and email groups into Auth Center. User profile edits
            can be pushed back to Graph, and email group memberships can be managed from group detail pages.
          </p>
        </div>
        <DirectorySyncClient />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'M365 Users', value: users },
          { label: 'Departments', value: departments.length },
          { label: 'Email Groups', value: groups.length },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <p className="text-slate-400 text-sm mb-2">{item.label}</p>
            <p className="text-3xl font-bold text-[#0F1059]">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">Departments</h2>
          </div>
          {departments.length === 0 ? (
            <div className="px-6 py-8 text-sm text-slate-400">No departments synced yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {departments.map((department) => (
                <div key={department.id} className="px-6 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{department.displayName}</p>
                    <p className="text-xs text-slate-400 font-mono">{department.code}</p>
                  </div>
                  <Badge label={`${department.userCount} users`} variant="neutral" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">Email Groups</h2>
          </div>
          {groups.length === 0 ? (
            <div className="px-6 py-8 text-sm text-slate-400">No email groups synced yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/admin/groups/${group.id}`}
                  className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{group.displayName}</p>
                    <p className="text-xs text-slate-400">{group.mail ?? '-'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.securityEnabled && <Badge label="Security" variant="neutral" />}
                    <Badge label={`${group.memberCount} members`} variant="info" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
