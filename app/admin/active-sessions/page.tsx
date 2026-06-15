import Link from 'next/link';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getActiveSessions() {
  return db.userSession.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: {
          id: true,
          employeeId: true,
          displayName: true,
          email: true,
          roleGrants: {
            where: { isActive: true },
            include: { app: { select: { appId: true, displayName: true } } },
            orderBy: { app: { displayName: 'asc' } },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeLeft(expiresAt: Date): { text: string; cls: string } {
  const ms = expiresAt.getTime() - Date.now();
  const hrs = ms / (1000 * 60 * 60);
  if (hrs > 4) return { text: `${Math.floor(hrs)}h left`, cls: 'text-emerald-600' };
  if (hrs > 1) return { text: `${Math.floor(hrs)}h left`, cls: 'text-amber-500' };
  if (ms > 0) return { text: `${Math.floor(ms / 60000)}m left`, cls: 'text-rose-500' };
  return { text: 'Expired', cls: 'text-slate-400' };
}

// Group roleGrants by app — { appDisplayName: role[] }
type RoleGrant = { role: string; app: { appId: string; displayName: string } };

function groupByApp(grants: RoleGrant[]): { displayName: string; appId: string; roles: string[] }[] {
  const map = new Map<string, { displayName: string; appId: string; roles: string[] }>();
  for (const g of grants) {
    const key = g.app.appId;
    if (!map.has(key)) map.set(key, { displayName: g.app.displayName, appId: g.app.appId, roles: [] });
    map.get(key)!.roles.push(g.role);
  }
  return [...map.values()];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ActiveSessionsPage() {
  const sessions = await getActiveSessions();

  const uniqueUsers = new Set(sessions.map((s) => s.userId)).size;
  const totalApps = new Set(
    sessions.flatMap((s) => s.user.roleGrants.map((g) => g.app.appId))
  ).size;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <span>Admin</span>
          <span>/</span>
          <span>Active Sessions</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">Active Sessions</h1>
        <p className="text-sm text-slate-400 mt-1">
          Users ที่ session ยัง active — Apps แสดงจาก Role Grants ที่มี ไม่ใช่การใช้งานจริง
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active Sessions', value: sessions.length, icon: 'S' },
          { label: 'Unique Users', value: uniqueUsers, icon: 'U' },
          { label: 'Apps w/ Grants', value: totalApps, icon: 'A' },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5"
          >
            <p className="text-slate-400 text-sm mb-1">{s.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-[#0F1059]">{s.value}</p>
              <span className="text-2xl text-slate-200">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
        <span className="mt-0.5 shrink-0">!</span>
        <span>
          JWT เป็น stateless — Auth Center ไม่รู้ว่าตอนนี้ user กำลังเรียก API ของ app ไหน
          คอลัมน์ <strong>Apps &amp; Roles</strong> แสดงสิทธิ์ที่ได้รับ ไม่ใช่ real-time usage
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <span className="text-slate-400 text-xl">S</span>
            </div>
            <p className="text-slate-800 font-semibold text-base mb-1">ไม่มี session active ตอนนี้</p>
            <p className="text-slate-400 text-sm">Sessions จะปรากฏเมื่อ user login</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Auth</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Started</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Expires</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Apps &amp; Roles
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => {
                    const appGroups = groupByApp(s.user.roleGrants);
                    const { text: expText, cls: expCls } = timeLeft(s.expiresAt);
                    return (
                      <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors align-top">
                        {/* User */}
                        <td className="px-4 py-3">
                          <Link href={`/admin/users/${s.user.id}`} className="hover:underline">
                            <p className="font-medium text-slate-800">
                              {s.user.displayName ?? s.user.email ?? '—'}
                            </p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{s.user.employeeId}</p>
                          </Link>
                        </td>

                        {/* Auth method */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge
                            label={s.authMethod}
                            variant={s.authMethod === 'ENTRA' ? 'info' : 'neutral'}
                          />
                        </td>

                        {/* IP */}
                        <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                          {s.ipAddress ?? '—'}
                        </td>

                        {/* Started */}
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {s.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                        </td>

                        {/* Expires */}
                        <td className={cn('px-4 py-3 text-xs font-medium whitespace-nowrap', expCls)}>
                          {expText}
                          <p className="text-slate-400 font-normal">
                            {s.expiresAt.toISOString().slice(11, 16)}
                          </p>
                        </td>

                        {/* Apps & Roles */}
                        <td className="px-4 py-3">
                          {appGroups.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">ไม่มี role grant</span>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {appGroups.map((app) => (
                                <div key={app.appId} className="flex items-start gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                                    {app.displayName}
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {app.roles.map((role) => (
                                      <span
                                        key={role}
                                        className="text-[11px] font-mono bg-indigo-50 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded"
                                      >
                                        {role}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Link
                            href={`/admin/users/${s.user.id}`}
                            className="text-xs text-[#0F1059] font-medium hover:underline"
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="lg:hidden divide-y divide-slate-100">
              {sessions.map((s) => {
                const appGroups = groupByApp(s.user.roleGrants);
                const { text: expText, cls: expCls } = timeLeft(s.expiresAt);
                return (
                  <div key={s.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link href={`/admin/users/${s.user.id}`} className="font-medium text-slate-800 hover:underline">
                          {s.user.displayName ?? s.user.email ?? '—'}
                        </Link>
                        <p className="text-xs text-slate-400 font-mono">{s.user.employeeId}</p>
                      </div>
                      <Badge label={s.authMethod} variant={s.authMethod === 'ENTRA' ? 'info' : 'neutral'} />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="font-mono">{s.ipAddress ?? '—'}</span>
                      <span className="text-slate-300">·</span>
                      <span className={cn('font-medium', expCls)}>{expText}</span>
                    </div>

                    {appGroups.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {appGroups.map((app) => (
                          <div key={app.appId} className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              {app.displayName}
                            </span>
                            {app.roles.map((role) => (
                              <span
                                key={role}
                                className="text-[11px] font-mono bg-indigo-50 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
