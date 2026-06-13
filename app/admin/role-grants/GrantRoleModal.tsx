'use client';

import { useState, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { grantRoleAction } from './actions';

const schema = z.object({
  userId:    z.string().min(1, 'Please select a user'),
  appId:     z.string().min(1, 'App is required'),
  role:      z.string().min(1, 'Role is required').max(100),
  expiresAt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface User { id: string; employeeId: string; displayName: string | null; }

interface GrantRoleModalProps {
  apps:  { appId: string; displayName: string }[];
  users: User[];
  /** Pre-fill userId (used when opened from User Detail page) */
  prefillUserId?: string;
  prefillEmployeeId?: string;
}

export function GrantRoleModal({ apps, users, prefillUserId, prefillEmployeeId }: GrantRoleModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [userSearch, setUserSearch] = useState(prefillEmployeeId ?? '');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { userId: prefillUserId ?? '' },
  });

  const selectedUserId = watch('userId');

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    if (!q) return users.slice(0, 50);
    return users.filter(
      (u) =>
        u.employeeId.toLowerCase().includes(q) ||
        (u.displayName ?? '').toLowerCase().includes(q)
    ).slice(0, 50);
  }, [userSearch, users]);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) {
      reset({ userId: prefillUserId ?? '' });
      setUserSearch(prefillEmployeeId ?? '');
    }
  }

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => { if (v) fd.set(k, v); });
      const result = await grantRoleAction(fd);
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
        : 'border-slate-200 text-slate-700 focus:border-[#0F1059] focus:bg-white'
    );

  return (
    <Dialog.Root open={open} onOpenChange={handleOpen}>
      <Dialog.Trigger asChild>
        <Button variant="primary">Grant Role</Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 w-full max-w-md">
          <Dialog.Title className="text-lg font-semibold text-slate-800 mb-4">Grant Role</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-600 mb-4">
            Assign a role to a user for a registered application.
          </Dialog.Description>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* User selector */}
            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">
                User <span className="text-rose-600">*</span>
              </label>

              {prefillUserId ? (
                /* Pre-filled from User Detail page — show readonly */
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700">
                  <span className="font-mono font-semibold">{prefillEmployeeId}</span>
                  {selectedUser?.displayName && (
                    <span className="text-slate-400 ml-2">{selectedUser.displayName}</span>
                  )}
                </div>
              ) : (
                <>
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by Employee ID or name…"
                    className={fieldClass(!!errors.userId)}
                  />
                  {userSearch && (
                    <div className="mt-1 border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto shadow-sm">
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
                            className={cn(
                              'w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors flex items-center gap-3',
                              selectedUserId === u.id ? 'bg-slate-50 font-semibold' : ''
                            )}
                          >
                            <span className="font-mono text-slate-700">{u.employeeId}</span>
                            {u.displayName && <span className="text-slate-400 truncate">{u.displayName}</span>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}

              <input {...register('userId')} type="hidden" />
              {errors.userId && <p className="text-rose-600 text-xs mt-1">{errors.userId.message}</p>}
            </div>

            {/* App */}
            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">
                App <span className="text-rose-600">*</span>
              </label>
              <select {...register('appId')} className={fieldClass(!!errors.appId)}>
                <option value="">Select app…</option>
                {apps.map((a) => (
                  <option key={a.appId} value={a.appId}>{a.displayName} ({a.appId})</option>
                ))}
              </select>
              {errors.appId && <p className="text-rose-600 text-xs mt-1">{errors.appId.message}</p>}
            </div>

            {/* Role */}
            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">
                Role <span className="text-rose-600">*</span>
              </label>
              <input {...register('role')} placeholder="e.g. ADMIN, QMS_VIEWER" className={fieldClass(!!errors.role)} />
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
