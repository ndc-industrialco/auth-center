import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { userRepository } from '@/repositories/userRepository';
import { Badge } from '@/components/ui/badge';
import { AvailableRolesEditor } from './AvailableRolesEditor';
import { UserRoleRoster } from './UserRoleRoster';
import { AppGrantRoleModal } from './AppGrantRoleModal';

interface Props {
  params: Promise<{ appId: string }>;
}

async function getAppData(appId: string) {
  const [app, users] = await Promise.all([
    db.appRegistration.findUnique({ where: { appId } }),
    userRepository.findAllActiveWithRolesAndProfile(appId),
  ]);
  return { app, users };
}

export default async function AppDetailPage({ params }: Props) {
  const { appId } = await params;
  const { app, users } = await getAppData(appId);
  if (!app) notFound();

  const availableRoles = app.availableRoles ?? [];
  const grantedCount = users.filter((u) => u.roleGrants.length > 0).length;

  const userRows = users.map((u) => ({
    id: u.id,
    employeeId: u.employeeId,
    displayName: u.displayName,
    email: u.email,
    department: u.profile?.department ?? null,
    currentRole: u.roleGrants[0]?.role ?? null,
  }));

  // For the free-text grant modal (edge cases / advanced use)
  const usersForModal = users.map((u) => ({
    id: u.id,
    employeeId: u.employeeId,
    displayName: u.displayName,
  }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <Link href="/admin/apps" className="hover:text-slate-600">Apps</Link>
            <span>/</span>
            <span className="font-mono">{app.appId}</span>
          </nav>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">{app.displayName}</h1>
            <Badge label={app.isActive ? 'Active' : 'Inactive'} variant={app.isActive ? 'active' : 'inactive'} />
          </div>
          <p className="text-sm font-mono text-slate-400">{app.appId}</p>
          {app.description && <p className="text-sm text-slate-500 mt-1">{app.description}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <p className="text-xs text-slate-400 font-mono hidden lg:block">
            Registered {app.createdAt.toISOString().slice(0, 10)}
          </p>
          <AppGrantRoleModal appId={app.appId} users={usersForModal} availableRoles={availableRoles} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-5 py-4">
          <p className="text-xs text-slate-400 mb-1">Total Users</p>
          <p className="text-2xl font-bold text-[#0F1059]">{users.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-5 py-4">
          <p className="text-xs text-slate-400 mb-1">Have Access</p>
          <p className="text-2xl font-bold text-[#0F1059]">{grantedCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-5 py-4">
          <p className="text-xs text-slate-400 mb-1">No Access</p>
          <p className="text-2xl font-bold text-slate-400">{users.length - grantedCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-5 py-4">
          <p className="text-xs text-slate-400 mb-1">Defined Roles</p>
          <p className="text-2xl font-bold text-[#0F1059]">{availableRoles.length}</p>
        </div>
      </div>

      {/* Available Roles Editor */}
      <AvailableRolesEditor appId={app.appId} initialRoles={availableRoles} />

      {/* User Roster */}
      <UserRoleRoster
        appId={app.appId}
        availableRoles={availableRoles}
        users={userRows}
      />
    </div>
  );
}
