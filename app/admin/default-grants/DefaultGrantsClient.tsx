'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createPolicyAction, deactivatePolicyAction, syncAllUsersAction } from './actions';

const schema = z.object({
  appId:        z.string().min(1, 'App is required'),
  role:         z.string().min(1, 'Role is required').max(100),
  applyTo:      z.enum(['ALL', 'ENTRA_ONLY', 'LOCAL_ONLY']),
  departmentId: z.string().max(100).optional(),
  description:  z.string().max(200).optional(),
});
type FormValues = z.infer<typeof schema>;

const APPLY_TO_LABEL = {
  ALL:        'All users',
  ENTRA_ONLY: 'Entra (M365) users only',
  LOCAL_ONLY: 'Local login users only',
};

// ─── Create Policy Modal ────────────────────────────────────────────────────
export function CreatePolicyModal({ apps }: { apps: { appId: string; displayName: string }[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { applyTo: 'ALL' },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => { if (v) fd.set(k, String(v)); });
      const result = await createPolicyAction(fd);
      if (result.ok) { toast.success('Default grant policy created'); reset(); setOpen(false); }
      else toast.error(result.error ?? 'Failed to create policy');
    });
  }

  const fc = (err: boolean) => cn(
    'w-full bg-slate-50/50 border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors',
    err ? 'border-rose-300 text-rose-700 focus:border-rose-500'
        : 'border-slate-200 text-slate-700 focus:border-[#0F1059] focus:bg-white'
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="primary">Add Policy</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-lg font-semibold text-slate-800 mb-1">Add Default Grant Policy</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-400 mb-4">New users matching this policy will automatically receive this role on first sign-in.</Dialog.Description>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">App <span className="text-rose-600">*</span></label>
              <select {...register('appId')} className={fc(!!errors.appId)}>
                <option value="">Select app…</option>
                {apps.map((a) => <option key={a.appId} value={a.appId}>{a.displayName} ({a.appId})</option>)}
              </select>
              {errors.appId && <p className="text-rose-600 text-xs mt-1">{errors.appId.message}</p>}
            </div>

            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">Role <span className="text-rose-600">*</span></label>
              <input {...register('role')} placeholder="e.g. QMS_VIEWER" className={fc(!!errors.role)} />
              {errors.role && <p className="text-rose-600 text-xs mt-1">{errors.role.message}</p>}
            </div>

            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">Apply To</label>
              <select {...register('applyTo')} className={fc(false)}>
                {Object.entries(APPLY_TO_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">
                Department ID
                <span className="ml-2 text-slate-400 font-normal text-xs">(blank = all departments)</span>
              </label>
              <input
                {...register('departmentId')}
                placeholder="e.g. IT, HR, QA, FINANCE"
                className={fc(false)}
              />
              <p className="text-slate-400 text-xs mt-1">
                Must match the <code className="bg-slate-100 px-1 rounded">department</code> value from Microsoft Graph.
              </p>
            </div>

            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input {...register('description')} placeholder="e.g. All IT staff get read access to QMS" className={fc(false)} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild><Button variant="secondary" type="button">Cancel</Button></Dialog.Close>
              <Button variant="primary" type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create Policy'}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Deactivate Button ──────────────────────────────────────────────────────
export function DeactivatePolicyButton({ id, role }: { id: string; role: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const result = await deactivatePolicyAction(id);
      if (result.ok) { toast.success('Policy deactivated'); setOpen(false); }
      else toast.error(result.error ?? 'Failed');
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
          Deactivate
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 w-full max-w-sm">
          <Dialog.Title className="text-lg font-semibold text-slate-800 mb-2">Deactivate Policy</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-600 mb-6">
            Deactivate policy for <span className="font-mono font-semibold text-slate-800">{role}</span>?
            New users will no longer receive this role automatically. Existing grants are not affected.
          </Dialog.Description>
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild><Button variant="secondary">Cancel</Button></Dialog.Close>
            <Button variant="danger" onClick={handle} disabled={isPending}>
              {isPending ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Sync All Users Button ──────────────────────────────────────────────────
export function SyncAllUsersButton({ userCount }: { userCount: number }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const result = await syncAllUsersAction();
      if (result.ok) {
        toast.success(`Sync complete — checked ${result.count} user${result.count !== 1 ? 's' : ''}`);
        setOpen(false);
      } else {
        toast.error(result.error ?? 'Sync failed');
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="secondary">Sync All Users</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 w-full max-w-sm">
          <Dialog.Title className="text-lg font-semibold text-slate-800 mb-2">Sync Default Grants</Dialog.Title>
          <Dialog.Description className="space-y-2 text-sm text-slate-600 mb-6">
            <p>
              Re-apply all active default grant policies to{' '}
              <strong>{userCount} active user{userCount !== 1 ? 's' : ''}</strong>.
            </p>
            <p className="text-slate-400 text-xs">
              Grants that already exist are skipped. Only missing grants will be added.
              Safe to run multiple times.
            </p>
          </Dialog.Description>
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild><Button variant="secondary">Cancel</Button></Dialog.Close>
            <Button variant="primary" onClick={handle} disabled={isPending}>
              {isPending ? 'Syncing…' : 'Sync Now'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
