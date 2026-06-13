'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { addGroupMemberAction, removeGroupMemberAction, syncGroupAction } from './actions';

export function GroupMembersClient({
  groupId,
  members,
}: {
  groupId: string;
  members: Array<{
    id: string;
    displayName: string | null;
    email: string | null;
    userEmployeeId: string | null;
  }>;
}) {
  const [value, setValue] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!value.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('employeeIdOrEmail', value.trim());
      const result = await addGroupMemberAction(groupId, fd);
      if (result.ok) {
        toast.success('Member added');
        setValue('');
      } else {
        toast.error(result.error ?? 'Failed to add member');
      }
    });
  }

  function handleRemove(memberId: string) {
    startTransition(async () => {
      const result = await removeGroupMemberAction(groupId, memberId);
      if (result.ok) toast.success('Member removed');
      else toast.error(result.error ?? 'Failed to remove member');
    });
  }

  function handleSync() {
    startTransition(async () => {
      const result = await syncGroupAction(groupId);
      if (result.ok) toast.success('Group synced from M365');
      else toast.error(result.error ?? 'Failed to sync group from M365');
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Employee ID or email"
          className="flex-1 bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors"
        />
        <Button variant="primary" size="sm" disabled={isPending} onClick={handleAdd}>
          Add Member
        </Button>
        <Button variant="secondary" size="sm" disabled={isPending} onClick={handleSync}>
          Sync From M365
        </Button>
      </div>

      <div className="divide-y divide-slate-100">
        {members.map((member) => (
          <div key={member.id} className="py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-800">{member.displayName ?? member.email ?? member.userEmployeeId ?? '-'}</p>
              <p className="text-xs text-slate-400">
                {member.userEmployeeId ? `Employee: ${member.userEmployeeId}` : member.email ?? '-'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              disabled={isPending}
              onClick={() => handleRemove(member.id)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
