import Link from 'next/link';
import type { Prisma } from '@/app/generated/prisma/client';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { CreateUserModal } from './CreateUserModal';
import { SyncUserButton } from './SyncUserButton';
import { UsersFilterBar } from './UsersFilterBar';

interface Props {
  searchParams: Promise<{ q?: string; status?: string; m365?: string; delegated?: string; sort?: string; order?: string }>;
}

async function getUsers(query?: string, status?: string, m365?: string, delegated?: string, sort = 'created', order: 'asc' | 'desc' = 'desc') {
  const dir = order === 'asc' ? 'asc' as const : 'desc' as const;
  let orderBy: Prisma.UserOrderByWithRelationInput;
  if (sort === 'id') orderBy = { employeeId: dir };
  else if (sort === 'name') orderBy = { displayName: { sort: dir, nulls: 'last' } };
  else if (sort === 'email') orderBy = { email: { sort: dir, nulls: 'last' } };
  else if (sort === 'delegated') orderBy = { canSendDelegatedMail: dir };
  else orderBy = { createdAt: dir };

  const where: Prisma.UserWhereInput = {};
  if (query) {
    where.OR = [
      { employeeId: { contains: query, mode: 'insensitive' } },
      { displayName: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
    ];
  }
  if (status) where.employmentStatus = status;
  if (m365 === 'linked') where.m365Linked = true;
  else if (m365 === 'unlinked') where.m365Linked = false;
  if (delegated === 'enabled') where.canSendDelegatedMail = true;
  else if (delegated === 'disabled') where.canSendDelegatedMail = false;

  return db.user.findMany({
    where,
    include: { externalLinks: { select: { id: true } }, localCredential: { select: { id: true } } },
    orderBy,
    take: 100,
  });
}

type BadgeVariant = React.ComponentProps<typeof Badge>['variant'];

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  TERMINATED: 'danger',
};

async function getDepartmentsAndGroups() {
  const [departments, emailGroups] = await Promise.all([
    db.department.findMany({ orderBy: { displayName: 'asc' }, select: { code: true, displayName: true } }),
    db.emailGroup.findMany({ orderBy: { displayName: 'asc' }, select: { id: true, displayName: true, mail: true } }),
  ]);
  return { departments, emailGroups };
}

function sortHref(col: string, cur: string, ord: string, q?: string, status?: string, m365?: string, delegated?: string) {
  const p = new URLSearchParams();
  if (q) p.set('q', q);
  if (status) p.set('status', status);
  if (m365) p.set('m365', m365);
  if (delegated) p.set('delegated', delegated);
  p.set('sort', col);
  p.set('order', cur === col && ord === 'asc' ? 'desc' : 'asc');
  return `/admin/users?${p}`;
}

function si(col: string, cur: string, ord: string) {
  if (col !== cur) return <span className="ml-1 text-slate-300 font-normal">↕</span>;
  return <span className="ml-1 text-[#0F1059] font-normal">{ord === 'asc' ? '↑' : '↓'}</span>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const { q, status, m365, delegated, sort = 'created', order = 'desc' } = await searchParams;

  const [users, { departments, emailGroups }] = await Promise.all([
    getUsers(q, status, m365, delegated, sort, order as 'asc' | 'desc'),
    getDepartmentsAndGroups(),
  ]);

  const hasFilter = !!(q || status || m365 || delegated);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <span>Admin</span><span>/</span><span>Users</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">Users</h1>
          <p className="text-sm text-slate-400 mt-1">
            {users.length} result{users.length !== 1 ? 's' : ''}{q ? ` for "${q}"` : ''}.
          </p>
        </div>
        <CreateUserModal departments={departments} emailGroups={emailGroups} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <UsersFilterBar q={q} status={status} m365={m365} delegated={delegated} sort={sort} order={order} hasFilter={hasFilter} />

        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <span className="text-slate-400 text-xl">O</span>
            </div>
            <p className="text-slate-800 font-semibold text-base mb-1">No users found</p>
            <p className="text-slate-400 text-sm">
              {hasFilter ? 'Try different filters.' : 'Users are created automatically on first sign-in.'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white border-b border-slate-100">
                  <tr>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">
                      <Link href={sortHref('id', sort, order, q, status, m365, delegated)} className="hover:text-[#0F1059] flex items-center gap-0.5">
                        Employee ID{si('id', sort, order)}
                      </Link>
                    </th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">
                      <Link href={sortHref('name', sort, order, q, status, m365, delegated)} className="hover:text-[#0F1059] flex items-center gap-0.5">
                        Name{si('name', sort, order)}
                      </Link>
                    </th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">
                      <Link href={sortHref('email', sort, order, q, status, m365, delegated)} className="hover:text-[#0F1059] flex items-center gap-0.5">
                        Email{si('email', sort, order)}
                      </Link>
                    </th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Auth</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">M365</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">
                      <Link href={sortHref('delegated', sort, order, q, status, m365, delegated)} className="hover:text-[#0F1059] inline-flex items-center gap-0.5">
                        Delegated Mail{si('delegated', sort, order)}
                      </Link>
                    </th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Status</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-right">
                      <Link href={sortHref('created', sort, order, q, status, m365, delegated)} className="hover:text-[#0F1059] flex items-center justify-end gap-0.5">
                        Created{si('created', sort, order)}
                      </Link>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-700">{u.employeeId}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{u.displayName ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{u.email ?? '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge label={u.defaultAuthMethod} variant={u.defaultAuthMethod === 'ENTRA' ? 'info' : 'neutral'} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge label={u.m365Linked ? 'Linked' : 'Local only'} variant={u.m365Linked ? 'success' : 'neutral'} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge label={u.canSendDelegatedMail ? 'Enabled' : 'Disabled'} variant={u.canSendDelegatedMail ? 'success' : 'neutral'} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge label={u.employmentStatus} variant={STATUS_VARIANT[u.employmentStatus] ?? 'neutral'} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">
                        <div className="flex items-center justify-end gap-2">
                          <span>{u.createdAt.toISOString().slice(0, 10)}</span>
                          <SyncUserButton userId={u.id} linked={u.m365Linked} size="sm" variant="ghost" />
                          <Link href={`/admin/users/${u.id}`} className="text-[#0F1059] text-sm font-medium hover:underline font-sans">
                            Manage
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden divide-y divide-slate-100">
              {users.map((u) => (
                <div key={u.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <Link href={`/admin/users/${u.id}`} className="block">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-mono text-sm font-semibold text-slate-800">{u.employeeId}</p>
                        <p className="text-sm text-slate-600">{u.displayName ?? u.email ?? '-'}</p>
                      </div>
                      <Badge label={u.employmentStatus} variant={STATUS_VARIANT[u.employmentStatus] ?? 'neutral'} />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge label={u.defaultAuthMethod} variant={u.defaultAuthMethod === 'ENTRA' ? 'info' : 'neutral'} />
                      {u.m365Linked && <Badge label="M365" variant="success" />}
                    </div>
                  </Link>
                  <div className="mt-3 flex items-center gap-2">
                    <SyncUserButton userId={u.id} linked={u.m365Linked} size="sm" variant="secondary" />
                    <Link href={`/admin/users/${u.id}`} className="text-[#0F1059] text-sm font-medium hover:underline">
                      Open Detail
                    </Link>
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
