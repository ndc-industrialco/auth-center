import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import {
  LinkEntraModal,
  UnlinkEntraButton,
  SetPasswordModal,
  ToggleLocalLoginButton,
  RevokeSessionButton,
  RevokeAllSessionsButton,
  EditProfileModal,
  GrantRoleFromUserModal,
  SyncUserFromM365Button,
} from './UserDetailClient';

interface Props {
  params: Promise<{ userId: string }>;
}

async function getUserDetail(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      externalLinks: true,
      localCredential: true,
      identityAccounts: true,
      sessions: {
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      loginAudits: {
        orderBy: { attemptedAt: 'desc' },
        take: 10,
      },
      roleGrants: {
        where: { isActive: true },
        include: { app: { select: { displayName: true, appId: true } } },
        orderBy: { grantedAt: 'desc' },
      },
    },
  });
}

const STATUS_VARIANT = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  TERMINATED: 'danger',
} as const;

const OUTCOME_VARIANT = {
  SUCCESS: 'success',
  FAILED_CREDENTIALS: 'danger',
  FAILED_RATE_LIMIT: 'danger',
  FAILED_ACCOUNT_LOCKED: 'danger',
  FAILED_NOT_FOUND: 'neutral',
  FAILED_ENTRA_ERROR: 'danger',
} as const;

export default async function UserDetailPage({ params }: Props) {
  const { userId } = await params;
  const [user, apps] = await Promise.all([
    getUserDetail(userId),
    db.appRegistration.findMany({ where: { isActive: true }, select: { appId: true, displayName: true } }),
  ]);
  if (!user) notFound();

  const entraLink = user.externalLinks[0] ?? null;
  const localAccount = user.identityAccounts.find((a) => a.type === 'LOCAL');
  const localEnabled = localAccount?.isActive ?? false;
  const hasCredential = !!user.localCredential;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <nav className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <Link href="/admin/users" className="hover:text-slate-600">Users</Link>
          <span>/</span>
          <span>{user.employeeId}</span>
        </nav>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">
              {user.displayName ?? user.employeeId}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5 font-mono">{user.employeeId}</p>
          </div>
          <Badge label={user.employmentStatus} variant={STATUS_VARIANT[user.employmentStatus] ?? 'neutral'} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-800">Identity Status</h2>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Microsoft Entra (M365)</p>
              <Badge label={user.m365Linked ? 'Linked' : 'Not linked'} variant={user.m365Linked ? 'success' : 'neutral'} />
            </div>
            {entraLink && (
              <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
                <p className="text-slate-500"><span className="font-semibold text-slate-700">Object ID:</span> <span className="font-mono">{entraLink.entraObjectId}</span></p>
                {entraLink.entraUpn && <p className="text-slate-500"><span className="font-semibold text-slate-700">UPN:</span> {entraLink.entraUpn}</p>}
                <p className="text-slate-400 font-mono">Linked {entraLink.linkedAt.toISOString().slice(0, 10)} via {entraLink.linkedByMethod}</p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              {user.m365Linked ? <UnlinkEntraButton userId={user.id} /> : <LinkEntraModal userId={user.id} />}
            </div>
          </div>

          <div className="border-t border-slate-100" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Local Login (Employee ID)</p>
              <Badge label={localEnabled ? 'Enabled' : 'Disabled'} variant={localEnabled ? 'active' : 'inactive'} />
            </div>
            {hasCredential && (
              <p className="text-xs text-slate-400">
                Last changed: <span className="font-mono">{user.localCredential!.lastChangedAt.toISOString().slice(0, 10)}</span>
                {user.localCredential!.lockedUntil && user.localCredential!.lockedUntil > new Date() && (
                  <span className="ml-2 text-rose-500 font-semibold">
                    Locked until {user.localCredential!.lockedUntil.toISOString().slice(0, 16).replace('T', ' ')}
                  </span>
                )}
              </p>
            )}
            <div className="flex gap-2 flex-wrap pt-1">
              <SetPasswordModal userId={user.id} hasCredential={hasCredential} />
              {hasCredential && <ToggleLocalLoginButton userId={user.id} isEnabled={localEnabled} />}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Profile</h2>
            <div className="flex items-center gap-2">
              <SyncUserFromM365Button userId={user.id} disabled={!user.m365Linked} />
              <EditProfileModal
                userId={user.id}
                canSyncToGraph={user.m365Linked}
                defaults={{
                  displayName: user.displayName ?? user.employeeId,
                  department: user.profile?.department ?? '',
                  jobTitle: user.profile?.jobTitle ?? '',
                  officeLocation: user.profile?.officeLocation ?? '',
                  mobilePhone: user.profile?.mobilePhone ?? '',
                }}
              />
            </div>
          </div>
          <dl className="space-y-2 text-sm">
            {[
              ['Email', user.email],
              ['Department', user.profile?.department],
              ['Department Code', user.profile?.departmentId],
              ['Job Title', user.profile?.jobTitle],
              ['Office', user.profile?.officeLocation],
              ['Mobile', user.profile?.mobilePhone],
              ['Default Auth', user.defaultAuthMethod],
              ['Created', user.createdAt.toISOString().slice(0, 10)],
            ].map(([label, value]) => value ? (
              <div key={label as string} className="flex justify-between gap-4">
                <dt className="text-slate-400 shrink-0">{label}</dt>
                <dd className="text-slate-700 font-mono text-right truncate">{value}</dd>
              </div>
            ) : null)}
          </dl>
          {user.m365Linked && (
            <p className="text-xs text-slate-400">
              Changes saved here can also be pushed back to Microsoft Graph for linked users.
            </p>
          )}
        </div>
      </div>

      {/* Role Grants */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">
            Role Grants
            {user.roleGrants.length > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-400">({user.roleGrants.length})</span>
            )}
          </h2>
          <GrantRoleFromUserModal userId={user.id} apps={apps} />
        </div>

        {user.roleGrants.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-slate-400 text-sm">No role grants. Grant a role to give this user access to an app.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {user.roleGrants.map((g) => (
              <div key={g.id} className="px-6 py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge label={g.role} variant="info" />
                    <span className="text-sm text-slate-600">{g.app.displayName}</span>
                    <span className="text-xs text-slate-400 font-mono">({g.app.appId})</span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Granted {g.grantedAt.toISOString().slice(0, 10)}
                    {g.expiresAt && (
                      <span className={g.expiresAt < new Date() ? 'text-rose-500 ml-2' : 'text-slate-400 ml-2'}>
                        · Expires {g.expiresAt.toISOString().slice(0, 10)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">
            Active Sessions
            {user.sessions.length > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-400">({user.sessions.length})</span>
            )}
          </h2>
          <RevokeAllSessionsButton userId={user.id} count={user.sessions.length} />
        </div>

        {user.sessions.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-slate-400 text-sm">No active sessions.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {user.sessions.map((session) => (
              <div key={session.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge label={session.authMethod} variant={session.authMethod === 'ENTRA' ? 'info' : 'neutral'} />
                    <span className="font-mono text-xs text-slate-400 truncate">{session.sessionId}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Started <span className="font-mono">{session.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</span>
                    {' '}Expires <span className="font-mono">{session.expiresAt.toISOString().slice(0, 16).replace('T', ' ')}</span>
                  </p>
                  {session.ipAddress && <p className="text-xs text-slate-400 font-mono">{session.ipAddress}</p>}
                </div>
                <RevokeSessionButton userId={user.id} sessionId={session.sessionId} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Recent Login Attempts</h2>
        </div>
        {user.loginAudits.length === 0 ? (
          <div className="py-10 text-center"><p className="text-slate-400 text-sm">No login records.</p></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {user.loginAudits.map((audit) => (
              <div key={audit.id} className="px-6 py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge label={audit.outcome} variant={(OUTCOME_VARIANT as Record<string, 'success' | 'danger' | 'neutral'>)[audit.outcome] ?? 'neutral'} />
                    <span className="text-xs text-slate-400">{audit.authMethod}</span>
                    {audit.failReason && <span className="text-xs text-rose-400">{audit.failReason}</span>}
                  </div>
                  {audit.ipAddress && <p className="text-xs text-slate-400 font-mono mt-0.5">{audit.ipAddress}</p>}
                </div>
                <p className="text-xs text-slate-400 font-mono whitespace-nowrap">
                  {audit.attemptedAt.toISOString().slice(0, 16).replace('T', ' ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
