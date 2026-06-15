import Link from 'next/link';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;
const STATUS_OPTIONS = ['ACTIVE', 'REVOKED', 'EXPIRED', 'LOGGED_OUT'] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number];

function parsePage(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function buildQuery(params: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value?.trim()) searchParams.set(key, value.trim());
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

function getStatusBadgeVariant(status: StatusFilter): 'active' | 'danger' | 'neutral' | 'pending' {
  switch (status) {
    case 'ACTIVE':
      return 'active';
    case 'REVOKED':
      return 'danger';
    case 'EXPIRED':
      return 'neutral';
    case 'LOGGED_OUT':
      return 'pending';
  }
}

function formatShortDateTime(value: Date | null): string {
  if (!value) return '—';
  return value.toISOString().slice(5, 16).replace('T', ' ');
}

function formatTimeAgo(value: Date): { text: string; className: string } {
  const diffMs = Date.now() - value.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 5) return { text: `${diffMinutes}m ago`, className: 'text-emerald-600' };
  if (diffMinutes < 30) return { text: `${diffMinutes}m ago`, className: 'text-sky-600' };
  if (diffMinutes < 120) return { text: `${diffMinutes}m ago`, className: 'text-amber-600' };
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return { text: `${diffHours}h ago`, className: 'text-rose-600' };
  const diffDays = Math.floor(diffHours / 24);
  return { text: `${diffDays}d ago`, className: 'text-slate-500' };
}

type SearchParams = Promise<{
  search?: string;
  app?: string;
  status?: string;
  page?: string;
}>;

export default async function ConsumerSessionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const search = params.search?.trim() ?? '';
  const appFilter = params.app?.trim() ?? '';
  const statusFilter = STATUS_OPTIONS.includes((params.status ?? 'ACTIVE') as StatusFilter)
    ? (params.status as StatusFilter)
    : 'ACTIVE';
  const page = parsePage(params.page);

  const where = {
    status: statusFilter,
    ...(appFilter ? { app: { appId: appFilter } } : {}),
    ...(search
      ? {
          OR: [
            { user: { employeeId: { contains: search, mode: 'insensitive' as const } } },
            { user: { displayName: { contains: search, mode: 'insensitive' as const } } },
            { user: { email: { contains: search, mode: 'insensitive' as const } } },
            { sessionId: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [sessions, totalCount, appOptions, totalSessions, activeSessions, inactiveSessions, uniqueUsers, uniqueApps] =
    await Promise.all([
      db.consumerAppSession.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              employeeId: true,
              displayName: true,
              email: true,
            },
          },
          app: {
            select: {
              appId: true,
              displayName: true,
            },
          },
        },
        orderBy: [{ lastSeenAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.consumerAppSession.count({ where }),
      db.appRegistration.findMany({
        where: { consumerAppSessions: { some: {} } },
        orderBy: { displayName: 'asc' },
        select: { appId: true, displayName: true },
      }),
      db.consumerAppSession.count(),
      db.consumerAppSession.count({ where: { status: 'ACTIVE' } }),
      db.consumerAppSession.count({ where: { status: { in: ['REVOKED', 'EXPIRED', 'LOGGED_OUT'] } } }),
      db.consumerAppSession.findMany({ distinct: ['userId'], select: { userId: true } }).then((rows) => rows.length),
      db.consumerAppSession.findMany({ distinct: ['appRegistrationId'], select: { appRegistrationId: true } }).then((rows) => rows.length),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const baseParams = {
    search: search || undefined,
    app: appFilter || undefined,
    status: statusFilter || undefined,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <span>Admin</span>
            <span>/</span>
            <span>Consumer Sessions</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">Consumer App Sessions</h1>
          <p className="text-sm text-slate-400 mt-1">
            Active and historical sessions reported by QMS and future consumer apps via Auth Center session registry.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/active-sessions"
            className="h-11 min-w-[44px] bg-white text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Auth Sessions
          </Link>
          <Link
            href="/admin/db-viewer?table=consumerAppSession"
            className="h-11 min-w-[44px] bg-[#0F1059] text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-[#161875] transition-colors"
          >
            Open DB View
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'All Consumer Sessions', value: totalSessions, icon: 'C' },
          { label: 'Active', value: activeSessions, icon: 'A' },
          { label: 'Inactive / Closed', value: inactiveSessions, icon: 'I' },
          { label: 'Apps Reporting', value: uniqueApps, icon: 'P' },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5"
          >
            <p className="text-slate-400 text-sm mb-1">{item.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-[#0F1059]">{item.value}</p>
              <span className="text-2xl text-slate-200">{item.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5">
          <p className="text-slate-400 text-sm mb-1">Users Seen</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-[#0F1059]">{uniqueUsers}</p>
            <span className="text-2xl text-slate-200">U</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5">
          <p className="text-slate-400 text-sm mb-1">Filtered Rows</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-[#0F1059]">{totalCount}</p>
            <span className="text-2xl text-slate-200">F</span>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-sm text-sky-700">
        <span className="mt-0.5 shrink-0">i</span>
        <span>
          This page shows sessions reported by consumer apps themselves. If a user signs in to QMS successfully but no row
          appears here, check the app secret, registry endpoint deployment, and callback register request.
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <form className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-4 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row gap-3 flex-1">
            <input
              name="search"
              defaultValue={search}
              placeholder="Search employeeId, name, email, or sessionId"
              className="w-full lg:max-w-sm bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors"
            />
            <select
              name="app"
              defaultValue={appFilter}
              className="h-11 min-w-[44px] bg-white text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1059] focus-visible:ring-offset-2"
            >
              <option value="">All apps</option>
              {appOptions.map((app) => (
                <option key={app.appId} value={app.appId}>
                  {app.displayName}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={statusFilter}
              className="h-11 min-w-[44px] bg-white text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1059] focus-visible:ring-offset-2"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="h-11 min-w-[44px] bg-[#0F1059] text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-[#161875] transition-colors"
            >
              Apply
            </button>
            <Link
              href="/admin/consumer-sessions"
              className="h-11 min-w-[44px] inline-flex items-center justify-center bg-white text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Reset
            </Link>
          </div>
        </form>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <span className="text-slate-400 text-xl">C</span>
            </div>
            <p className="text-slate-800 font-semibold text-base mb-1">No consumer app sessions found</p>
            <p className="text-slate-400 text-sm">Try a different filter or complete a login flow from a connected app.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[1120px]">
                <thead className="sticky top-0 z-10 bg-white border-b border-slate-100">
                  <tr>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">User</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">App</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Roles</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Status</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Last Seen</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Login At</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Expires</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Session</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => {
                    const lastSeen = formatTimeAgo(session.lastSeenAt);
                    return (
                      <tr key={session.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors align-top">
                        <td className="text-slate-600 text-sm px-4 py-3 text-left">
                          <Link href={`/admin/users/${session.user.id}`} className="hover:underline">
                            <p className="font-medium text-slate-800">{session.user.displayName ?? session.user.email ?? '—'}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{session.user.employeeId}</p>
                          </Link>
                        </td>
                        <td className="text-slate-600 text-sm px-4 py-3 text-left">
                          <p className="font-medium text-slate-800">{session.app.displayName}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{session.app.appId}</p>
                        </td>
                        <td className="text-slate-600 text-sm px-4 py-3 text-left">
                          <div className="flex flex-wrap gap-1.5">
                            {session.appRoles.length > 0 ? (
                              session.appRoles.map((role) => (
                                <span
                                  key={role}
                                  className="text-[11px] font-mono bg-indigo-50 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded"
                                >
                                  {role}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic">No app roles</span>
                            )}
                            <span className="text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded">
                              effective:{session.effectiveRole}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge label={session.status} variant={getStatusBadgeVariant(session.status)} />
                          {session.revokeReason ? (
                            <p className="mt-1 text-[11px] text-slate-400 font-mono">{session.revokeReason}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs">
                          <p className={cn('font-medium', lastSeen.className)}>{lastSeen.text}</p>
                          <p className="text-slate-400 mt-1">{formatShortDateTime(session.lastSeenAt)}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs text-slate-500">
                          {formatShortDateTime(session.loginAt)}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs text-slate-500">
                          {formatShortDateTime(session.expiresAt)}
                        </td>
                        <td className="px-4 py-3 text-left font-mono text-xs text-slate-500">
                          <p>{session.sessionId}</p>
                          {session.ipAddress ? <p className="mt-1 text-slate-400">{session.ipAddress}</p> : null}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/admin/users/${session.user.id}`} className="text-[#0F1059] text-sm font-medium hover:underline">
                              User
                            </Link>
                            <Link href="/admin/apps" className="text-slate-600 text-sm font-medium hover:underline">
                              Apps
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden space-y-3 p-4">
              {sessions.map((session) => {
                const lastSeen = formatTimeAgo(session.lastSeenAt);
                return (
                  <div key={session.id} className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <Link href={`/admin/users/${session.user.id}`} className="text-slate-800 font-semibold text-sm hover:underline">
                          {session.user.displayName ?? session.user.email ?? '—'}
                        </Link>
                        <p className="text-slate-400 text-xs font-mono">{session.user.employeeId}</p>
                      </div>
                      <Badge label={session.status} variant={getStatusBadgeVariant(session.status)} />
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-slate-400 text-xs">App</p>
                        <p className="text-slate-800 font-medium">{session.app.displayName}</p>
                        <p className="text-slate-400 text-xs font-mono">{session.app.appId}</p>
                      </div>

                      <div>
                        <p className="text-slate-400 text-xs mb-1">Roles</p>
                        <div className="flex flex-wrap gap-1.5">
                          {session.appRoles.map((role) => (
                            <span
                              key={role}
                              className="text-[11px] font-mono bg-indigo-50 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded"
                            >
                              {role}
                            </span>
                          ))}
                          <span className="text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded">
                            effective:{session.effectiveRole}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-slate-400 text-xs">Last Seen</p>
                          <p className={cn('text-sm font-medium', lastSeen.className)}>{lastSeen.text}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Expires</p>
                          <p className="text-slate-600 text-sm font-mono">{formatShortDateTime(session.expiresAt)}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-slate-400 text-xs">Session</p>
                        <p className="text-slate-600 text-xs font-mono break-all">{session.sessionId}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 border-t border-slate-100">
              <p className="text-sm text-slate-400">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} consumer sessions
              </p>
              <div className="flex gap-2">
                {canGoPrev ? (
                  <Link
                    href={`/admin/consumer-sessions${buildQuery({ ...baseParams, page: String(currentPage - 1) })}`}
                    className="h-11 min-w-[44px] inline-flex items-center justify-center bg-white text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="h-11 min-w-[44px] inline-flex items-center justify-center bg-slate-50 text-slate-300 border border-slate-100 rounded-xl px-4 py-2 text-sm font-medium">
                    Previous
                  </span>
                )}
                <span className="h-11 min-w-[44px] inline-flex items-center justify-center bg-slate-50 text-slate-600 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium">
                  {currentPage} / {totalPages}
                </span>
                {canGoNext ? (
                  <Link
                    href={`/admin/consumer-sessions${buildQuery({ ...baseParams, page: String(currentPage + 1) })}`}
                    className="h-11 min-w-[44px] inline-flex items-center justify-center bg-white text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="h-11 min-w-[44px] inline-flex items-center justify-center bg-slate-50 text-slate-300 border border-slate-100 rounded-xl px-4 py-2 text-sm font-medium">
                    Next
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
