import { db } from '@/lib/db';
import { AuditTable } from './AuditTable';

async function getAuditLogs() {
  return db.adminAudit.findMany({
    orderBy: { performedAt: 'desc' },
    take: 200,
  });
}

export default async function AdminAuditPage() {
  const logs = await getAuditLogs();

  const serialized = logs.map((l) => ({
    id: l.id,
    action: l.action,
    actorId: l.actorId,
    resourceType: l.resourceType,
    resourceId: l.resourceId,
    targetAppId: l.targetAppId,
    targetUserId: l.targetUserId,
    performedAt: l.performedAt.toISOString(),
  }));

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
          <AuditTable logs={serialized} />
        )}
      </div>
    </div>
  );
}
