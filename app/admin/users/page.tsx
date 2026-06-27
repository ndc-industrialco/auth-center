import type { Prisma, $Enums } from '@/app/generated/prisma/client';
import { db } from '@/lib/db';
import { CreateUserModal } from './CreateUserModal';
import { UsersFilterBar } from './UsersFilterBar';
import { UsersTable } from './UsersTable';

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
  if (status) where.employmentStatus = status as $Enums.EmploymentStatus;
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

async function getDepartmentsAndGroups() {
  const [departments, emailGroups] = await Promise.all([
    db.department.findMany({ orderBy: { displayName: 'asc' }, select: { code: true, displayName: true } }),
    db.emailGroup.findMany({ orderBy: { displayName: 'asc' }, select: { id: true, displayName: true, mail: true } }),
  ]);
  return { departments, emailGroups };
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
          <UsersTable users={users} sort={sort} order={order} q={q} status={status} m365={m365} delegated={delegated} />
        )}
      </div>
    </div>
  );
}
