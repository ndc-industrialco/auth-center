import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { RegisterAppModal } from './RegisterAppModal';

async function getApps() {
  return db.appRegistration.findMany({ orderBy: { createdAt: 'desc' } });
}

export default async function AdminAppsPage() {
  const apps = await getApps();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <span>Admin</span><span>/</span><span>Apps</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">Consumer Apps</h1>
          <p className="text-sm text-slate-400 mt-1">Apps registered to receive Auth Center tokens.</p>
        </div>
        <RegisterAppModal />
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <span className="text-slate-400 text-xl">⊞</span>
            </div>
            <p className="text-slate-800 font-semibold text-base mb-1">No apps registered</p>
            <p className="text-slate-400 text-sm">Register your first consumer app to get started.</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white border-b border-slate-100">
                  <tr>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">App ID</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Display Name</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Description</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Status</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((app) => (
                    <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-slate-700 font-semibold">{app.appId}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{app.displayName}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{app.description ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          label={app.isActive ? 'Active' : 'Inactive'}
                          variant={app.isActive ? 'active' : 'inactive'}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400 font-mono text-center">
                        {app.createdAt.toISOString().slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="lg:hidden divide-y divide-slate-100">
              {apps.map((app) => (
                <div key={app.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-mono text-sm font-semibold text-slate-800">{app.appId}</p>
                      <p className="text-sm text-slate-600">{app.displayName}</p>
                    </div>
                    <Badge
                      label={app.isActive ? 'Active' : 'Inactive'}
                      variant={app.isActive ? 'active' : 'inactive'}
                    />
                  </div>
                  {app.description && (
                    <p className="text-xs text-slate-400 mt-1">{app.description}</p>
                  )}
                  <p className="text-xs text-slate-400 font-mono mt-2">
                    {app.createdAt.toISOString().slice(0, 10)}
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
