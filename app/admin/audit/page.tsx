import { db } from '@/lib/db';

async function getAuditLogs() {
  return db.adminAudit.findMany({
    orderBy: { performedAt: 'desc' },
    take: 200,
  });
}

const ACTION_LABEL: Record<string, string> = {
  APP_REGISTERED: 'Registered app',
  APP_DEACTIVATED: 'Deactivated app',
  ROLE_GRANTED: 'Granted role',
  ROLE_REVOKED: 'Revoked role',
  ENTRA_LINKED: 'Linked Entra',
  ENTRA_UNLINKED: 'Unlinked Entra',
  SESSION_REVOKED_BY_ADMIN: 'Revoked session',
};

export default async function AdminAuditPage() {
  const logs = await getAuditLogs();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <nav className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <span>Admin</span>
          <span>/</span>
          <span>Audit Log</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">Admin Audit Log</h1>
        <p className="text-sm text-slate-400 mt-1">Immutable record of all admin actions.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <span className="text-slate-400 text-xl">L</span>
            </div>
            <p className="text-slate-800 font-semibold text-base mb-1">No audit records yet</p>
            <p className="text-slate-400 text-sm">Admin actions will appear here.</p>
          </div>
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
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Performed At</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
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
                        {log.performedAt.toISOString().slice(0, 19).replace('T', ' ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden divide-y divide-slate-100">
              {logs.map((log) => (
                <div key={log.id} className="p-4 space-y-1">
                  <p className="text-sm font-medium text-slate-800">{ACTION_LABEL[log.action] ?? log.action}</p>
                  <p className="text-xs text-slate-500 font-mono">
                    {log.resourceType} · {log.targetAppId ?? log.targetUserId?.slice(-8) ?? '-'}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    {log.performedAt.toISOString().slice(0, 19).replace('T', ' ')}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
