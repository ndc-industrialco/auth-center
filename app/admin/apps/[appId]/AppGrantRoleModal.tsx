'use client';

import { useState, useTransition, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { grantRoleForAppAction } from './actions';

const schema = z.object({
  userId:    z.string().min(1, 'Please select a user'),
  role:      z.string().min(1, 'Role is required').max(100),
  expiresAt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface User { id: string; employeeId: string; displayName: string | null; }

interface Props {
  appId: string;
  users: User[];
  availableRoles: string[];
}

export function AppGrantRoleModal({ appId, users, availableRoles }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [userSearch, setUserSearch] = useState('');

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const selectedUserId = useWatch({ control, name: 'userId' });

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    if (!q) return users.slice(0, 50);
    return users
      .filter(
        (u) =>
          u.employeeId.toLowerCase().includes(q) ||
          (u.displayName ?? '').toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [userSearch, users]);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) {
      reset();
      setUserSearch('');
    }
  }

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('userId', values.userId);
      fd.set('role', values.role);
      if (values.expiresAt) fd.set('expiresAt', values.expiresAt);
      const result = await grantRoleForAppAction(appId, fd);
      if (result.ok) {
        toast.success('Role granted');
        handleOpen(false);
      } else {
        toast.error(result.error ?? 'Failed to grant role');
      }
    });
  }

  const fieldClass = (hasError: boolean) =>
    cn(
      'w-full bg-slate-50/50 border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors',
      hasError
        ? 'border-rose-300 text-rose-700 focus:border-rose-500'
        : 'border-slate-200 text-slate-700 focus:border-[#0F1059] focus:bg-white',
    );

  return (
    <Dialog.Root open={open} onOpenChange={handleOpen}>
      <Dialog.Trigger asChild>
        <Button variant="primary">Grant Role</Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 w-full max-w-md">
          <Dialog.Title className="text-lg font-semibold text-slate-800 mb-1">Grant Role</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500 mb-4">
            Assign a role to a user for{' '}
            <span className="font-mono font-semibold text-slate-700">{appId}</span>.
          </Dialog.Description>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* User selector */}
            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">
                User <span className="text-rose-600">*</span>
              </label>
              <input
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  if (selectedUserId) setValue('userId', '', { shouldValidate: false });
                }}
                placeholder="Search by Employee ID or name…"
                className={fieldClass(!!errors.userId)}
              />
              {userSearch && !selectedUser && (
                <div className="mt-1 border border-slate-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto shadow-sm">
                  {filteredUsers.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-400">No users found</p>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setValue('userId', u.id, { shouldValidate: true });
                          setUserSearch(`${u.employeeId}${u.displayName ? ` — ${u.displayName}` : ''}`);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors flex items-center gap-3"
                      >
                        <span className="font-mono text-slate-700">{u.employeeId}</span>
                        {u.displayName && <span className="text-slate-400 truncate">{u.displayName}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
              <input {...register('userId')} type="hidden" />
              {errors.userId && <p className="text-rose-600 text-xs mt-1">{errors.userId.message}</p>}
            </div>

            {/* Role — dropdown when roles are defined, free text otherwise */}
            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">
                Role <span className="text-rose-600">*</span>
              </label>
              {availableRoles.length > 0 ? (
                <select {...register('role')} className={fieldClass(!!errors.role)}>
                  <option value="">— Select role —</option>
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              ) : (
                <input
                  {...register('role')}
                  placeholder="e.g. ADMIN, USER, VIEWER"
                  className={fieldClass(!!errors.role)}
                />
              )}
              {errors.role && <p className="text-rose-600 text-xs mt-1">{errors.role.message}</p>}
            </div>

            {/* Expires */}
            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">
                Expires At <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input type="datetime-local" {...register('expiresAt')} className={fieldClass(false)} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button variant="secondary" type="button">Cancel</Button>
              </Dialog.Close>
              <Button variant="primary" type="submit" disabled={isPending}>
                {isPending ? 'Granting…' : 'Grant Role'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
