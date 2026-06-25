import { db } from '@/lib/db';
import { GrantRoleModal } from './GrantRoleModal';
import { RoleGrantsTable } from './RoleGrantsTable';

async function getData() {
  const [grants, apps, users] = await Promise.all([
    db.roleGrant.findMany({
      where: { isActive: true },
      include: { user: { select: { employeeId: true, displayName: true } }, app: { select: { displayName: true } } },
      orderBy: { grantedAt: 'desc' },
      take: 200,
    }),
    db.appRegistration.findMany({ where: { isActive: true }, select: { appId: true, displayName: true, availableRoles: true } }),
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

  const serialized = grants.map((g) => ({
    id: g.id,
    role: g.role,
    grantedAt: g.grantedAt.toISOString(),
    expiresAt: g.expiresAt?.toISOString() ?? null,
    user: g.user,
    app: g.app,
  }));

  const appNames = [...new Set(grants.map((g) => g.app.displayName))].sort();

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
          <RoleGrantsTable grants={serialized} appNames={appNames} />
        )}
      </div>
    </div>
  );
}
