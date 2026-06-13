import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { GrantRoleModal } from './GrantRoleModal';
import { RevokeButton } from './RevokeButton';

async function getData() {
  const [grants, apps, users] = await Promise.all([
    db.roleGrant.findMany({
      where: { isActive: true },
      include: { user: { select: { employeeId: true, displayName: true } }, app: { select: { displayName: true } } },
      orderBy: { grantedAt: 'desc' },
      take: 200,
    }),
    db.appRegistration.findMany({ where: { isActive: true }, select: { appId: true, displayName: true } }),
    db.user.findMany({
      where: { employmentStatus: 'ACTIVE' },
      select: { id: true, employeeId: true, displayName: true },
      orderBy: { employeeId: 'asc' },
    }),
  ]);
  return { grants, apps, users };
}

export default async function AdminRoleGrantsPage() {
  const { grants, apps, users } = await getData();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <span>Admin</span><span>/</span><span>Role Grants</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">Role Grants</h1>
          <p className="text-sm text-slate-400 mt-1">{grants.length} active grant{grants.length !== 1 ? 's' : ''}.</p>
        </div>
        <GrantRoleModal apps={apps} users={users} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {grants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <span className="text-slate-400 text-xl">⬡</span>
            </div>
            <p className="text-slate-800 font-semibold text-base mb-1">No role grants</p>
            <p className="text-slate-400 text-sm">Grant a role to a user to get started.</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white border-b border-slate-100">
                  <tr>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Employee</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">App</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Role</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Granted</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Expires</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grants.map((g) => (
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
                        {g.grantedAt.toISOString().slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-center">
                        {g.expiresAt ? (
                          <span className={g.expiresAt < new Date() ? 'text-rose-500' : 'text-slate-400'}>
                            {g.expiresAt.toISOString().slice(0, 10)}
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
              {grants.map((g) => (
                <div key={g.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm font-semibold text-slate-800">{g.user.employeeId}</p>
                      <p className="text-xs text-slate-400">{g.app.displayName}</p>
                    </div>
                    <Badge label={g.role} variant="info" />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-mono">{g.grantedAt.toISOString().slice(0, 10)}</p>
                    <RevokeButton grantId={g.id} role={g.role} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
