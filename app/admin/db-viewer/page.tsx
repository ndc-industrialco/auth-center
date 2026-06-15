import { db } from '@/lib/db';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CollapsePanel } from './CollapsePanel';

// ─── Table registry ──────────────────────────────────────────────────────────

const TABLES = [
  { key: 'users',                label: 'Users',              icon: 'U' },
  { key: 'employeeProfile',      label: 'Profiles',           icon: 'P' },
  { key: 'department',           label: 'Departments',        icon: 'D' },
  { key: 'identityAccount',      label: 'Identity Accts',     icon: 'I' },
  { key: 'externalIdentityLink', label: 'Entra Links',        icon: 'E' },
  { key: 'localCredential',      label: 'Credentials',        icon: 'C' },
  { key: 'appRegistration',      label: 'Apps',               icon: 'A' },
  { key: 'roleGrant',            label: 'Role Grants',        icon: 'R' },
  { key: 'permissionGrant',      label: 'Perm Grants',        icon: 'G' },
  { key: 'emailGroup',           label: 'Email Groups',       icon: 'M' },
  { key: 'emailGroupMember',     label: 'Group Members',      icon: 'B' },
  { key: 'userSession',          label: 'Sessions',           icon: 'S' },
  { key: 'consumerAppSession',   label: 'Consumer Sessions',  icon: 'C' },
  { key: 'loginAudit',           label: 'Login Audits',       icon: 'L' },
  { key: 'adminAudit',           label: 'Admin Audits',       icon: 'X' },
  { key: 'defaultRolePolicy',    label: 'Default Policies',   icon: 'F' },
  { key: 'directorySyncLog',     label: 'Sync Logs',          icon: 'Y' },
] as const;

type TableKey = typeof TABLES[number]['key'];
type Row = Record<string, unknown>;

// ─── Lookup maps ──────────────────────────────────────────────────────────────
// Keyed by the FK column name that uses each lookup.

interface Lookups {
  byUserId: Record<string, string>;       // User.id          → "Name (empId)"
  byEmployeeId: Record<string, string>;   // User.employeeId  → "Name (empId)"
  byAppId: Record<string, string>;        // AppRegistration.id → displayName
  byGroupId: Record<string, string>;      // EmailGroup.id    → displayName
  byDeptCode: Record<string, string>;     // Department.code  → displayName
                                          //   (departmentId FK references code, not id)
}

async function fetchLookups(): Promise<Lookups> {
  const [userList, appList, groupList, deptList] = await Promise.all([
    db.user.findMany({ select: { id: true, employeeId: true, displayName: true } }),
    db.appRegistration.findMany({ select: { id: true, displayName: true } }),
    db.emailGroup.findMany({ select: { id: true, displayName: true } }),
    db.department.findMany({ select: { code: true, displayName: true } }),
  ]);

  const byUserId: Record<string, string> = {};
  const byEmployeeId: Record<string, string> = {};
  for (const u of userList) {
    const label = u.displayName ? `${u.displayName} (${u.employeeId})` : u.employeeId;
    byUserId[u.id] = label;
    byEmployeeId[u.employeeId] = label;
  }

  const byAppId: Record<string, string> = {};
  for (const a of appList) byAppId[a.id] = a.displayName;

  const byGroupId: Record<string, string> = {};
  for (const g of groupList) byGroupId[g.id] = g.displayName;

  const byDeptCode: Record<string, string> = {};
  for (const d of deptList) byDeptCode[d.code] = d.displayName;

  return { byUserId, byEmployeeId, byAppId, byGroupId, byDeptCode };
}

// ─── Cell helpers ─────────────────────────────────────────────────────────────

function shortId(val: unknown): string {
  const s = String(val ?? '');
  return s.length > 12 ? '…' + s.slice(-10) : s;
}

/** Returns true for the row's own primary key (col === 'id') — shown as short monospace. */
function isSelfId(col: string): boolean {
  return col === 'id';
}

/**
 * Resolve a FK column to a human name via lookup maps.
 * Returns undefined if no lookup applies.
 */
function resolveName(col: string, val: unknown, lookups: Lookups): string | undefined {
  if (val === null || val === undefined) return undefined;
  const s = String(val);

  switch (col) {
    // User FK (by DB id)
    case 'userId':
    case 'targetUserId':
      return lookups.byUserId[s];

    // Actor / revokedBy — may store DB id OR employeeId depending on call site
    case 'actorId':
    case 'revokedBy':
      return lookups.byUserId[s] ?? lookups.byEmployeeId[s];

    // App FK (by DB id)
    case 'appId':
    case 'targetAppId':
      return lookups.byAppId[s];

    case 'appRegistrationId':
      return lookups.byAppId[s];

    // Email group FK (by DB id)
    case 'groupId':
      return lookups.byGroupId[s];

    // Department FK — references Department.code, not Department.id
    case 'departmentId':
      return lookups.byDeptCode[s];

    default:
      return undefined;
  }
}

function fmtCell(col: string, val: unknown, lookups: Lookups): { text: string; resolved: boolean } {
  if (val === null || val === undefined) return { text: '—', resolved: false };

  // Own primary key — always show as short monospace
  if (isSelfId(col)) return { text: shortId(val), resolved: false };

  // Date
  if (val instanceof Date)
    return { text: val.toISOString().slice(0, 19).replace('T', ' '), resolved: false };

  // Boolean
  if (typeof val === 'boolean')
    return { text: val ? 'yes' : 'no', resolved: false };

  // Object / JSON
  if (typeof val === 'object')
    return { text: JSON.stringify(val).slice(0, 60), resolved: false };

  // Try name lookup for FK columns
  const name = resolveName(col, val, lookups);
  if (name) return { text: name, resolved: true };

  // Remaining ID-like fields — truncate to short form
  const s = String(val);
  if (col.endsWith('Id') || col.endsWith('ObjectId'))
    return { text: shortId(val), resolved: false };

  return { text: s.length > 50 ? s.slice(0, 48) + '…' : s, resolved: false };
}

function isBoolCol(col: string, rows: Row[]): boolean {
  return rows.length > 0 && typeof rows[0][col] === 'boolean';
}

// ─── Count fetcher ────────────────────────────────────────────────────────────

async function fetchAllCounts(): Promise<Record<TableKey, number>> {
  const [
    users, employeeProfile, department, identityAccount, externalIdentityLink,
    localCredential, appRegistration, roleGrant, permissionGrant, emailGroup,
    emailGroupMember, userSession, consumerAppSession, loginAudit, adminAudit, defaultRolePolicy, directorySyncLog,
  ] = await Promise.all([
    db.user.count(),
    db.employeeProfile.count(),
    db.department.count(),
    db.identityAccount.count(),
    db.externalIdentityLink.count(),
    db.localCredential.count(),
    db.appRegistration.count(),
    db.roleGrant.count(),
    db.permissionGrant.count(),
    db.emailGroup.count(),
    db.emailGroupMember.count(),
    db.userSession.count(),
    db.consumerAppSession.count(),
    db.loginAudit.count(),
    db.adminAudit.count(),
    db.defaultRolePolicy.count(),
    db.directorySyncLog.count(),
  ]);
  return {
    users, employeeProfile, department, identityAccount, externalIdentityLink,
    localCredential, appRegistration, roleGrant, permissionGrant, emailGroup,
    emailGroupMember, userSession, consumerAppSession, loginAudit, adminAudit, defaultRolePolicy, directorySyncLog,
  };
}

// ─── Data fetcher (per table) ─────────────────────────────────────────────────

async function fetchTableRows(table: TableKey): Promise<Row[]> {
  switch (table) {
    case 'users':
      return db.user.findMany({
        orderBy: { createdAt: 'desc' }, take: 50,
        select: { id: true, employeeId: true, email: true, displayName: true, m365Linked: true, canSendDelegatedMail: true, employmentStatus: true, defaultAuthMethod: true, createdAt: true, updatedAt: true },
      });

    case 'employeeProfile':
      return db.employeeProfile.findMany({
        orderBy: { createdAt: 'desc' }, take: 50,
        select: { id: true, userId: true, departmentId: true, department: true, jobTitle: true, officeLocation: true, mobilePhone: true, createdAt: true, updatedAt: true },
      });

    case 'department':
      return db.department.findMany({
        orderBy: { displayName: 'asc' }, take: 50,
        select: { id: true, code: true, displayName: true, source: true, userCount: true, syncedAt: true, createdAt: true },
      });

    case 'identityAccount':
      return db.identityAccount.findMany({
        orderBy: { createdAt: 'desc' }, take: 50,
        select: { id: true, userId: true, type: true, providerAccountId: true, isActive: true, createdAt: true, updatedAt: true },
      });

    case 'externalIdentityLink':
      return db.externalIdentityLink.findMany({
        orderBy: { linkedAt: 'desc' }, take: 50,
        select: { id: true, userId: true, entraObjectId: true, entraUpn: true, linkedAt: true, linkedByMethod: true },
      });

    case 'localCredential':
      // passwordHash intentionally excluded
      return db.localCredential.findMany({
        orderBy: { createdAt: 'desc' }, take: 50,
        select: { id: true, userId: true, failedAttempts: true, lockedUntil: true, lastChangedAt: true, createdAt: true, updatedAt: true },
      });

    case 'appRegistration':
      // secretHash intentionally excluded
      return db.appRegistration.findMany({
        orderBy: { createdAt: 'desc' }, take: 50,
        select: { id: true, appId: true, displayName: true, description: true, isActive: true, createdAt: true, updatedAt: true },
      });

    case 'roleGrant':
      return db.roleGrant.findMany({
        orderBy: { grantedAt: 'desc' }, take: 50,
        select: { id: true, userId: true, appId: true, role: true, grantedBy: true, grantedAt: true, expiresAt: true, isActive: true },
      });

    case 'permissionGrant':
      return db.permissionGrant.findMany({
        orderBy: { grantedAt: 'desc' }, take: 50,
        select: { id: true, userId: true, appId: true, permission: true, grantedBy: true, grantedAt: true, expiresAt: true, isActive: true },
      });

    case 'emailGroup':
      return db.emailGroup.findMany({
        orderBy: { displayName: 'asc' }, take: 50,
        select: { id: true, entraGroupId: true, displayName: true, mail: true, securityEnabled: true, mailEnabled: true, memberCount: true, syncedAt: true, createdAt: true },
      });

    case 'emailGroupMember':
      return db.emailGroupMember.findMany({
        orderBy: { createdAt: 'desc' }, take: 50,
        select: { id: true, groupId: true, userId: true, entraObjectId: true, email: true, displayName: true, memberType: true, syncedAt: true },
      });

    case 'userSession':
      return db.userSession.findMany({
        orderBy: { createdAt: 'desc' }, take: 50,
        select: { id: true, userId: true, sessionId: true, authMethod: true, ipAddress: true, status: true, expiresAt: true, revokedAt: true, revokedBy: true, createdAt: true },
      });

    case 'consumerAppSession':
      return db.consumerAppSession.findMany({
        orderBy: { createdAt: 'desc' }, take: 50,
        select: {
          id: true,
          userId: true,
          appRegistrationId: true,
          sessionId: true,
          employeeId: true,
          appRoles: true,
          effectiveRole: true,
          status: true,
          loginAt: true,
          lastSeenAt: true,
          expiresAt: true,
          revokedAt: true,
          revokeReason: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
        },
      });

    case 'loginAudit':
      return db.loginAudit.findMany({
        orderBy: { attemptedAt: 'desc' }, take: 50,
        select: { id: true, userId: true, employeeId: true, authMethod: true, outcome: true, ipAddress: true, failReason: true, sessionId: true, attemptedAt: true },
      });

    case 'adminAudit':
      return db.adminAudit.findMany({
        orderBy: { performedAt: 'desc' }, take: 50,
        select: { id: true, actorId: true, action: true, targetUserId: true, targetAppId: true, resourceType: true, resourceId: true, detail: true, performedAt: true },
      });

    case 'defaultRolePolicy':
      return db.defaultRolePolicy.findMany({
        orderBy: { createdAt: 'desc' }, take: 50,
        select: { id: true, appId: true, role: true, applyTo: true, departmentId: true, description: true, isActive: true, createdBy: true, createdAt: true },
      });

    case 'directorySyncLog':
      return db.directorySyncLog.findMany({
        orderBy: { requestedAt: 'desc' }, take: 50,
        select: { id: true, entityType: true, entityId: true, direction: true, status: true, requestedBy: true, requestedAt: true, completedAt: true, errorMessage: true },
      });
  }
}

// ─── Column header label (strip 'Id' suffix for resolved columns) ─────────────

const RESOLVED_COLS = new Set([
  'userId', 'targetUserId', 'actorId', 'revokedBy',
  'appId', 'targetAppId', 'appRegistrationId', 'groupId', 'departmentId',
]);

function colLabel(col: string): string {
  if (RESOLVED_COLS.has(col)) return col.replace(/Id$/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
  return col;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  searchParams: Promise<{ table?: string }>;
}

export default async function DbViewerPage({ searchParams }: Props) {
  const { table: rawTable } = await searchParams;
  const activeKey = (TABLES.find((t) => t.key === rawTable)?.key ?? 'users') as TableKey;
  const activeLabel = TABLES.find((t) => t.key === activeKey)!.label;

  const [counts, rows, lookups] = await Promise.all([
    fetchAllCounts(),
    fetchTableRows(activeKey),
    fetchLookups(),
  ]);

  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <span>Admin</span>
          <span>/</span>
          <span>DB Viewer</span>
          <span>/</span>
          <span>{activeLabel}</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">DB Viewer</h1>
        <p className="text-sm text-slate-400 mt-1">Live read-only view of all database tables. Top 50 rows shown.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {TABLES.map((t) => (
          <Link
            key={t.key}
            href={`/admin/db-viewer?table=${t.key}`}
            className={cn(
              'rounded-xl border p-3 text-center transition-all',
              activeKey === t.key
                ? 'bg-[#0F1059] border-[#0F1059] shadow-md'
                : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm',
            )}
          >
            <p className={cn('text-lg font-bold', activeKey === t.key ? 'text-white' : 'text-[#0F1059]')}>
              {counts[t.key]}
            </p>
            <p className={cn('text-xs mt-0.5 truncate', activeKey === t.key ? 'text-slate-200' : 'text-slate-400')}>
              {t.label}
            </p>
          </Link>
        ))}
      </div>

      {/* Table panel */}
      <CollapsePanel
        title={activeLabel}
        subtitle={
          <>
            <span>{counts[activeKey]} total rows · showing latest {Math.min(50, rows.length)}</span>
            {activeKey === 'localCredential' && (
              <span className="text-amber-600 font-medium">passwordHash hidden</span>
            )}
            {activeKey === 'appRegistration' && (
              <span className="text-amber-600 font-medium">secretHash hidden</span>
            )}
            <span className="text-slate-300">|</span>
            <span className="text-indigo-500 font-medium">underlined = resolved name</span>
          </>
        }
      >
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <span className="text-slate-400 text-xl">0</span>
            </div>
            <p className="text-slate-800 font-semibold text-base mb-1">No rows yet</p>
            <p className="text-slate-400 text-sm">This table is empty.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                <tr>
                  {cols.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {colLabel(col)}
                      {RESOLVED_COLS.has(col) && (
                        <span className="ml-1 normal-case font-normal text-indigo-400">(name)</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={String(row.id ?? i)}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    {cols.map((col) => {
                      const val = row[col];
                      const bool = isBoolCol(col, rows);
                      const { text, resolved } = fmtCell(col, val, lookups);
                      return (
                        <td
                          key={col}
                          title={resolved ? String(val ?? '') : undefined}
                          className={cn(
                            'px-4 py-2.5 whitespace-nowrap',
                            resolved
                              ? 'text-slate-800 font-medium underline decoration-dotted decoration-slate-300 underline-offset-2'
                              : isSelfId(col)
                                ? 'font-mono text-xs text-slate-400'
                                : col.endsWith('Id') || col.endsWith('ObjectId')
                                  ? 'font-mono text-xs text-slate-400'
                                  : 'text-slate-700',
                            bool && val === true && 'text-emerald-600 font-medium',
                            bool && val === false && 'text-slate-400',
                          )}
                        >
                          {text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsePanel>

      {/* Tab bar (secondary navigation) */}
      <CollapsePanel title="All tables" defaultOpen={false}>
        <div className="p-4 flex flex-wrap gap-2">
          {TABLES.map((t) => (
            <Link
              key={t.key}
              href={`/admin/db-viewer?table=${t.key}`}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                activeKey === t.key
                  ? 'bg-[#0F1059] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  activeKey === t.key ? 'bg-white/20 text-white' : 'bg-white text-slate-500',
                )}
              >
                {counts[t.key]}
              </span>
            </Link>
          ))}
        </div>
      </CollapsePanel>
    </div>
  );
}
