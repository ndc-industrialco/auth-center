'use client';

import { useState, useMemo, useCallback, useTransition } from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { setUserRoleAction, removeUserRoleAction, bulkSetRoleAction } from './actions';

export interface UserRow {
  id: string;
  employeeId: string;
  displayName: string | null;
  email: string | null;
  department: string | null;
  currentRole: string | null;
}

interface Props {
  appId: string;
  availableRoles: string[];
  users: UserRow[];
}

const NO_ACCESS = '';

export function UserRoleRoster({ appId, availableRoles, users }: Props) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortCol, setSortCol] = useState<'id' | 'name' | 'dept' | 'role'>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  // optimistic role map: userId → role | null
  const [roleMap, setRoleMap] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(users.map((u) => [u.id, u.currentRole]))
  );
  // per-user pending state
  const [pendingUsers, setPendingUsers] = useState<Set<string>>(new Set());

  // bulk assign state
  const [bulkRole, setBulkRole] = useState(availableRoles[0] ?? '');
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [isBulkPending, startBulkTransition] = useTransition();

  const hasRoleOptions = availableRoles.length > 0;

  function handleSort(col: typeof sortCol) {
    if (col === sortCol) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      if (roleFilter === '__none__' && roleMap[u.id]) return false;
      if (roleFilter && roleFilter !== '__none__' && roleMap[u.id] !== roleFilter) return false;
      if (q) {
        return (
          u.employeeId.toLowerCase().includes(q) ||
          (u.displayName ?? '').toLowerCase().includes(q) ||
          (u.department ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [users, search, roleFilter, roleMap]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string, bv: string;
      switch (sortCol) {
        case 'name': av = a.displayName ?? ''; bv = b.displayName ?? ''; break;
        case 'dept': av = a.department ?? ''; bv = b.department ?? ''; break;
        case 'role': av = roleMap[a.id] ?? ''; bv = roleMap[b.id] ?? ''; break;
        default: av = a.employeeId; bv = b.employeeId;
      }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortCol, sortDir, roleMap]);

  const handleRoleChange = useCallback(
    async (userId: string, newRole: string | null) => {
      const prevRole = roleMap[userId];
      // Optimistic update
      setRoleMap((prev) => ({ ...prev, [userId]: newRole }));
      setPendingUsers((prev) => new Set(prev).add(userId));

      const result =
        newRole === null
          ? await removeUserRoleAction(appId, userId)
          : await setUserRoleAction(appId, userId, newRole);

      setPendingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });

      if (!result.ok) {
        setRoleMap((prev) => ({ ...prev, [userId]: prevRole }));
        toast.error(result.error ?? 'Failed to update role');
      }
    },
    [appId, roleMap],
  );

  const grantedCount = Object.values(roleMap).filter(Boolean).length;

  function handleBulkConfirm() {
    if (!bulkRole.trim()) return;
    startBulkTransition(async () => {
      const result = await bulkSetRoleAction(appId, bulkRole);
      setBulkConfirmOpen(false);
      if (result.ok) {
        // Optimistically update all users in the map
        setRoleMap((prev) => Object.fromEntries(Object.keys(prev).map((id) => [id, bulkRole])));
        toast.success(`Set ${result.count ?? users.length} users to ${bulkRole}`);
      } else {
        toast.error(result.error ?? 'Bulk assign failed');
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-slate-800">User Roster</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {grantedCount} of {users.length} users have access
            {sorted.length !== users.length && ` · showing ${sorted.length}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name or department…"
            className="w-full sm:w-56 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-[#0F1059] bg-slate-50/50"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:border-[#0F1059]"
          >
            <option value="">All Roles</option>
            <option value="__none__">No Access</option>
            {availableRoles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Bulk Assign Bar */}
      {hasRoleOptions && (
        <div className="px-6 py-3 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-slate-500 shrink-0">Bulk assign:</span>
          <select
            value={bulkRole}
            onChange={(e) => setBulkRole(e.target.value)}
            disabled={isBulkPending}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:border-[#0F1059] disabled:opacity-50"
          >
            {availableRoles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <Dialog.Root open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                disabled={isBulkPending || !bulkRole}
                className="text-xs px-3 py-1.5 bg-[#0F1059] text-white rounded-lg hover:bg-[#0F1059]/90 disabled:opacity-40 shrink-0"
              >
                {isBulkPending ? 'Applying…' : `Apply to all ${users.length} users`}
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
              <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 w-full max-w-sm">
                <Dialog.Title className="text-lg font-semibold text-slate-800 mb-2">
                  Bulk Assign Role
                </Dialog.Title>
                <Dialog.Description className="text-sm text-slate-600 mb-6">
                  Set all <span className="font-semibold text-slate-800">{users.length}</span> active users
                  to <span className="font-mono font-semibold text-[#0F1059]">{bulkRole}</span>.
                  Users with other roles will be changed. Users already on{' '}
                  <span className="font-mono font-semibold">{bulkRole}</span> are unaffected.
                </Dialog.Description>
                <div className="flex justify-end gap-2">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="button"
                    onClick={handleBulkConfirm}
                    disabled={isBulkPending}
                    className="px-4 py-2 text-sm bg-[#0F1059] text-white rounded-xl hover:bg-[#0F1059]/90 disabled:opacity-50"
                  >
                    {isBulkPending ? 'Applying…' : 'Confirm'}
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">No users match your filters.</div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th
                    className="text-slate-500 text-xs font-medium px-6 py-2.5 text-left cursor-pointer select-none hover:text-[#0F1059]"
                    onClick={() => handleSort('id')}
                  >
                    Employee{sortCol === 'id' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                  </th>
                  <th
                    className="text-slate-500 text-xs font-medium px-4 py-2.5 text-left cursor-pointer select-none hover:text-[#0F1059]"
                    onClick={() => handleSort('dept')}
                  >
                    Department{sortCol === 'dept' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                  </th>
                  <th className="text-slate-500 text-xs font-medium px-4 py-2.5 text-left">Email</th>
                  <th
                    className="text-slate-500 text-xs font-medium px-4 py-2.5 text-left w-52 cursor-pointer select-none hover:text-[#0F1059]"
                    onClick={() => handleSort('role')}
                  >
                    Role{sortCol === 'role' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sorted.map((user) => {
                  const currentRole = roleMap[user.id] ?? null;
                  const isPending = pendingUsers.has(user.id);
                  return (
                    <tr
                      key={user.id}
                      className={cn(
                        'transition-colors',
                        isPending ? 'bg-slate-50/80' : 'hover:bg-slate-50/50',
                      )}
                    >
                      <td className="px-6 py-3">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="font-mono text-sm font-semibold text-slate-700 hover:text-[#0F1059] hover:underline"
                        >
                          {user.employeeId}
                        </Link>
                        {user.displayName && (
                          <p className="text-xs text-slate-400">{user.displayName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {user.department ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                        {user.email ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <RoleCell
                          userId={user.id}
                          currentRole={currentRole}
                          availableRoles={availableRoles}
                          isPending={isPending}
                          onChange={handleRoleChange}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="lg:hidden divide-y divide-slate-100">
            {sorted.map((user) => {
              const currentRole = roleMap[user.id] ?? null;
              const isPending = pendingUsers.has(user.id);
              return (
                <div key={user.id} className={cn('px-4 py-3', isPending && 'bg-slate-50/80')}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="font-mono text-sm font-semibold text-slate-700 hover:underline"
                      >
                        {user.employeeId}
                      </Link>
                      {user.displayName && (
                        <p className="text-xs text-slate-400">{user.displayName}</p>
                      )}
                      {user.department && (
                        <p className="text-xs text-slate-400">{user.department}</p>
                      )}
                    </div>
                  </div>
                  <RoleCell
                    userId={user.id}
                    currentRole={currentRole}
                    availableRoles={availableRoles}
                    isPending={isPending}
                    onChange={handleRoleChange}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Inline role cell ─────────────────────────────────────────────────────────

interface RoleCellProps {
  userId: string;
  currentRole: string | null;
  availableRoles: string[];
  isPending: boolean;
  onChange: (userId: string, role: string | null) => void;
}

function RoleCell({ userId, currentRole, availableRoles, isPending, onChange }: RoleCellProps) {
  const [freeText, setFreeText] = useState(currentRole ?? '');

  if (availableRoles.length > 0) {
    // Dropdown mode
    return (
      <select
        value={currentRole ?? NO_ACCESS}
        disabled={isPending}
        onChange={(e) => onChange(userId, e.target.value === NO_ACCESS ? null : e.target.value)}
        className={cn(
          'w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#0F1059] transition-colors',
          isPending
            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-wait'
            : currentRole
              ? 'border-slate-200 bg-white text-slate-700'
              : 'border-slate-200 bg-white text-slate-400',
        )}
      >
        <option value={NO_ACCESS}>— No Access —</option>
        {availableRoles.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
    );
  }

  // Free-text mode (no roles configured yet)
  return (
    <div className="flex items-center gap-1.5">
      <input
        value={freeText}
        onChange={(e) => setFreeText(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onChange(userId, freeText.trim() || null);
          }
        }}
        placeholder="Type role…"
        disabled={isPending}
        className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:border-[#0F1059] bg-white disabled:bg-slate-50 disabled:text-slate-400"
      />
      <button
        type="button"
        disabled={isPending || !freeText.trim()}
        onClick={() => onChange(userId, freeText.trim() || null)}
        className="text-xs px-2 py-1.5 bg-[#0F1059] text-white rounded-lg hover:bg-[#0F1059]/90 disabled:opacity-40 shrink-0"
      >
        Set
      </button>
      {currentRole && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => { setFreeText(''); onChange(userId, null); }}
          className="text-xs px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-40 shrink-0"
        >
          ×
        </button>
      )}
    </div>
  );
}
