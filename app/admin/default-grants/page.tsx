import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { CreatePolicyModal, DeactivatePolicyButton, SyncAllUsersButton } from './DefaultGrantsClient';

const APPLY_TO_LABEL: Record<string, string> = {
  ALL:        'All users',
  ENTRA_ONLY: 'Entra only',
  LOCAL_ONLY: 'Local only',
};

async function getData() {
  const [policies, apps, userCount] = await Promise.all([
    db.defaultRolePolicy.findMany({
      orderBy: [{ isActive: 'desc' }, { departmentId: 'asc' }, { createdAt: 'asc' }],
      include: { app: { select: { appId: true, displayName: true } } },
    }),
    db.appRegistration.findMany({ where: { isActive: true }, select: { appId: true, displayName: true } }),
    db.user.count({ where: { employmentStatus: 'ACTIVE' } }),
  ]);
  return { policies, apps, userCount };
}

export default async function DefaultGrantsPage() {
  const { policies, apps, userCount } = await getData();
  const active = policies.filter((p) => p.isActive);
  const inactive = policies.filter((p) => !p.isActive);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <span>Admin</span><span>/</span><span>Default Grants</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">Default Grant Policies</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Roles defined here are automatically granted to new users when they sign in for the first time.
            Use <strong>Sync All Users</strong> to backfill existing users without waiting for re-login.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <SyncAllUsersButton userCount={userCount} />
          <CreatePolicyModal apps={apps} />
        </div>
      </div>

      {/* How it works */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl px-5 py-4 text-sm text-sky-700 space-y-1">
        <p className="font-semibold text-sky-800">How it works</p>
        <ul className="list-disc list-inside space-y-0.5 text-sky-700">
          <li>New Entra user signs in → matching policies are applied instantly.</li>
          <li><strong>Department ID</strong> is synced from Microsoft Graph <code className="bg-sky-100 px-1 rounded">department</code> field on every sign-in.</li>
          <li>Leave Department ID blank to apply to <em>all</em> departments (wildcard).</li>
          <li><strong>Sync All Users</strong> re-applies all active policies to existing active users — idempotent, safe to run anytime.</li>
        </ul>
      </div>

      {/* Active policies */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Active Policies</h2>
          <span className="text-sm text-slate-400">{active.length} active</span>
        </div>

        {active.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <span className="text-slate-400 text-xl">✦</span>
            </div>
            <p className="text-slate-800 font-semibold text-base mb-1">No active policies</p>
            <p className="text-slate-400 text-sm">New users will receive no automatic role grants.</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white border-b border-slate-100">
                  <tr>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">App</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Role</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Department</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Apply To</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Created</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((p) => {
                    const app = p.app as { appId: string; displayName: string };
                    return (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700">{app.displayName}</p>
                          <p className="text-xs text-slate-400 font-mono">{app.appId}</p>
                        </td>
                        <td className="px-4 py-3"><Badge label={p.role} variant="info" /></td>
                        <td className="px-4 py-3">
                          {p.departmentId ? (
                            <span className="font-mono text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {p.departmentId}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-sm italic">All departments</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            label={APPLY_TO_LABEL[p.applyTo] ?? p.applyTo}
                            variant={p.applyTo === 'ENTRA_ONLY' ? 'info' : p.applyTo === 'LOCAL_ONLY' ? 'neutral' : 'success'}
                          />
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs text-slate-400">
                          {p.createdAt.toISOString().slice(0, 10)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DeactivatePolicyButton id={p.id} role={p.role} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="lg:hidden divide-y divide-slate-100">
              {active.map((p) => {
                const app = p.app as { appId: string; displayName: string };
                return (
                  <div key={p.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{app.displayName}</p>
                        <p className="font-mono text-xs text-slate-400">{app.appId}</p>
                      </div>
                      <Badge label={p.role} variant="info" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge label={APPLY_TO_LABEL[p.applyTo] ?? p.applyTo} variant={p.applyTo === 'ENTRA_ONLY' ? 'info' : 'success'} />
                      {p.departmentId && <Badge label={p.departmentId} variant="neutral" />}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400 font-mono">{p.createdAt.toISOString().slice(0, 10)}</p>
                      <DeactivatePolicyButton id={p.id} role={p.role} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Inactive */}
      {inactive.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden opacity-60">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-500">Inactive Policies ({inactive.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {inactive.map((p) => {
              const app = p.app as { appId: string };
              return (
                <div key={p.id} className="px-6 py-3 flex items-center gap-3 text-sm text-slate-500">
                  <Badge label="Inactive" variant="inactive" />
                  <span className="font-mono">{p.role}</span>
                  <span className="text-slate-400">in {app.appId}</span>
                  {p.departmentId && <span className="font-mono text-slate-400">dept: {p.departmentId}</span>}
                  <span className="text-xs text-slate-400 ml-auto">{APPLY_TO_LABEL[p.applyTo]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
