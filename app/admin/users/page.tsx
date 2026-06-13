import Link from 'next/link';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { CreateUserModal } from './CreateUserModal';
import { SyncUserButton } from './SyncUserButton';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

async function getUsers(query?: string) {
  const where = query
    ? {
        OR: [
          { employeeId: { contains: query, mode: 'insensitive' as const } },
          { displayName: { contains: query, mode: 'insensitive' as const } },
          { email: { contains: query, mode: 'insensitive' as const } },
        ],
      }
    : {};

  return db.user.findMany({
    where,
    include: { externalLinks: { select: { id: true } }, localCredential: { select: { id: true } } },
    orderBy: { createdAt: 'desc' },
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

export default async function AdminUsersPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const [users, { departments, emailGroups }] = await Promise.all([
    getUsers(q),
    getDepartmentsAndGroups(),
  ]);

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
        <form method="GET" className="flex items-center gap-3 p-4 border-b border-slate-100">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by Employee ID, name, or email..."
            className="flex-1 bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors"
          />
          <button
            type="submit"
            className="h-11 px-4 rounded-xl bg-[#0F1059] text-white text-sm font-medium hover:bg-[#161875] transition-colors"
          >
            Search
          </button>
          {q && (
            <Link
              href="/admin/users"
              className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center"
            >
              Clear
            </Link>
          )}
        </form>

        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <span className="text-slate-400 text-xl">O</span>
            </div>
            <p className="text-slate-800 font-semibold text-base mb-1">No users found</p>
            <p className="text-slate-400 text-sm">
              {q ? 'Try a different search term.' : 'Users are created automatically on first sign-in.'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white border-b border-slate-100">
                  <tr>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Employee ID</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Name</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Email</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Auth</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">M365</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">Status</th>
                    <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-right">Actions</th>
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
                        <Badge label={u.employmentStatus} variant={STATUS_VARIANT[u.employmentStatus] ?? 'neutral'} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <SyncUserButton userId={u.id} linked={u.m365Linked} size="sm" variant="ghost" />
                          <Link href={`/admin/users/${u.id}`} className="text-[#0F1059] text-sm font-medium hover:underline">
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
