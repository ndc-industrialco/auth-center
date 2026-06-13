import { db } from '@/lib/db';

async function getDashboardStats() {
  const [totalUsers, activeSessions, registeredApps, recentAudit] = await Promise.all([
    db.user.count(),
    db.userSession.count({ where: { status: 'ACTIVE' } }),
    db.appRegistration.count({ where: { isActive: true } }),
    db.adminAudit.findMany({
      orderBy: { performedAt: 'desc' },
      take: 10,
    }),
  ]);
  return { totalUsers, activeSessions, registeredApps, recentAudit };
}

const ACTION_LABEL: Record<string, string> = {
  APP_REGISTERED: 'Registered app',
  APP_DEACTIVATED: 'Deactivated app',
  ROLE_GRANTED: 'Granted role',
  ROLE_REVOKED: 'Revoked role',
  ENTRA_LINKED: 'Linked Entra identity',
  ENTRA_UNLINKED: 'Unlinked Entra identity',
  SESSION_REVOKED_BY_ADMIN: 'Revoked session',
};

export default async function AdminDashboard() {
  const { totalUsers, activeSessions, registeredApps, recentAudit } = await getDashboardStats();

  const stats = [
    { label: 'Total Users', value: totalUsers, icon: 'U' },
    { label: 'Active Sessions', value: activeSessions, icon: 'S' },
    { label: 'Registered Apps', value: registeredApps, icon: 'A' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <nav className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <span>Admin</span>
          <span>/</span>
          <span>Dashboard</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Auth Center overview and recent activity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6"
          >
            <p className="text-slate-400 text-sm mb-2">{s.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-[#0F1059]">{s.value}</p>
              <span className="text-2xl text-slate-300">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Recent Admin Activity</h2>
        </div>

        {recentAudit.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <span className="text-slate-400 text-xl">O</span>
            </div>
            <p className="text-slate-800 font-semibold text-base mb-1">No activity yet</p>
            <p className="text-slate-400 text-sm">Admin actions will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentAudit.map((log) => (
              <div key={log.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-800 font-medium">
                    {ACTION_LABEL[log.action] ?? log.action}
                    {log.targetAppId && (
                      <span className="ml-1 text-slate-400">
                        in <span className="font-mono text-xs">{log.targetAppId}</span>
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Actor: {log.actorId}
                    {log.resourceType && ` · ${log.resourceType}`}
                  </p>
                </div>
                <p className="text-xs text-slate-400 font-mono whitespace-nowrap shrink-0">
                  {log.performedAt.toISOString().slice(0, 19).replace('T', ' ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
