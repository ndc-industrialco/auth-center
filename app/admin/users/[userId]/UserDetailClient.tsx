'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  linkEntraAction,
  unlinkEntraAction,
  setPasswordAction,
  toggleLocalLoginAction,
  revokeSessionAction,
  revokeAllSessionsAction,
  updateUserProfileAction,
  grantRoleFromUserAction,
  syncUserFromM365DetailAction,
  toggleDelegatedMailAction,
} from './actions';

const linkSchema = z.object({
  entraObjectId: z.string().min(1, 'Entra Object ID is required'),
  entraUpn: z.string().email().optional().or(z.literal('')),
});

const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  department: z.string().optional().or(z.literal('')),
  jobTitle: z.string().optional().or(z.literal('')),
  officeLocation: z.string().optional().or(z.literal('')),
  mobilePhone: z.string().optional().or(z.literal('')),
});

const pwSchema = z.object({ newPassword: z.string() });

function fieldClass(err: boolean) {
  return cn(
    'w-full bg-slate-50/50 border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors',
    err
      ? 'border-rose-300 text-rose-700 focus:border-rose-500'
      : 'border-slate-200 text-slate-700 focus:border-[#0F1059] focus:bg-white'
  );
}

export function LinkEntraModal({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof linkSchema>>({
    resolver: zodResolver(linkSchema),
  });

  function onSubmit(values: z.infer<typeof linkSchema>) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('entraObjectId', values.entraObjectId);
      if (values.entraUpn) fd.set('entraUpn', values.entraUpn);
      const result = await linkEntraAction(userId, fd);
      if (result.ok) {
        toast.success('Entra identity linked');
        reset();
        setOpen(false);
      } else {
        toast.error(result.error ?? 'Failed to link');
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="primary" size="sm">Link Entra Identity</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 w-full max-w-md">
          <Dialog.Title className="text-lg font-semibold text-slate-800 mb-4">Link Entra Identity</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-600 mb-4">
            Link a Microsoft Entra ID identity to this user account for SSO sign-in.
          </Dialog.Description>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">Entra Object ID</label>
              <input {...register('entraObjectId')} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={fieldClass(!!errors.entraObjectId)} />
              {errors.entraObjectId && <p className="text-rose-600 text-xs mt-1">{errors.entraObjectId.message}</p>}
            </div>
            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">UPN (optional)</label>
              <input {...register('entraUpn')} placeholder="user@ndc.co.th" className={fieldClass(!!errors.entraUpn)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild><Button variant="secondary" type="button">Cancel</Button></Dialog.Close>
              <Button variant="primary" type="submit" disabled={isPending}>{isPending ? 'Linking...' : 'Link'}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function EditProfileModal({
  userId,
  defaults,
  canSyncToGraph,
}: {
  userId: string;
  defaults: {
    displayName: string;
    department: string;
    jobTitle: string;
    officeLocation: string;
    mobilePhone: string;
  };
  canSyncToGraph: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [syncToGraph, setSyncToGraph] = useState(canSyncToGraph);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults,
  });

  function onSubmit(values: z.infer<typeof profileSchema>) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('displayName', values.displayName);
      fd.set('department', values.department ?? '');
      fd.set('jobTitle', values.jobTitle ?? '');
      fd.set('officeLocation', values.officeLocation ?? '');
      fd.set('mobilePhone', values.mobilePhone ?? '');
      fd.set('syncToGraph', syncToGraph ? 'true' : 'false');

      const result = await updateUserProfileAction(userId, fd);
      if (result.ok) {
        toast.success(syncToGraph ? 'Profile saved and synced to Graph' : 'Profile saved');
        reset(values);
        setOpen(false);
      } else {
        toast.error(result.error ?? 'Failed to update profile');
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="secondary" size="sm">Edit Profile</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 w-full max-w-lg">
          <Dialog.Title className="text-lg font-semibold text-slate-800 mb-4">Edit Profile</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-600 mb-4">
            Update the user&apos;s profile information.
          </Dialog.Description>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-slate-800 text-sm font-semibold mb-2 block">Display Name</label>
                <input {...register('displayName')} className={fieldClass(!!errors.displayName)} />
                {errors.displayName && <p className="text-rose-600 text-xs mt-1">{errors.displayName.message}</p>}
              </div>
              <div>
                <label className="text-slate-800 text-sm font-semibold mb-2 block">Department</label>
                <input {...register('department')} className={fieldClass(!!errors.department)} />
              </div>
              <div>
                <label className="text-slate-800 text-sm font-semibold mb-2 block">Job Title</label>
                <input {...register('jobTitle')} className={fieldClass(!!errors.jobTitle)} />
              </div>
              <div>
                <label className="text-slate-800 text-sm font-semibold mb-2 block">Office Location</label>
                <input {...register('officeLocation')} className={fieldClass(!!errors.officeLocation)} />
              </div>
              <div>
                <label className="text-slate-800 text-sm font-semibold mb-2 block">Mobile Phone</label>
                <input {...register('mobilePhone')} className={fieldClass(!!errors.mobilePhone)} />
              </div>
            </div>
            {canSyncToGraph && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={syncToGraph} onChange={(e) => setSyncToGraph(e.target.checked)} />
                Sync changes back to Microsoft Graph
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild><Button variant="secondary" type="button">Cancel</Button></Dialog.Close>
              <Button variant="primary" type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function UnlinkEntraButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const result = await unlinkEntraAction(userId);
      if (result.ok) {
        toast.success('Entra identity unlinked');
        setOpen(false);
      } else {
        toast.error(result.error ?? 'Failed to unlink');
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="danger" size="sm">Unlink Entra</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 w-full max-w-sm">
          <Dialog.Title className="text-lg font-semibold text-slate-800 mb-2">Unlink Entra Identity</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-600 mb-6">This removes the Microsoft 365 link. The user will no longer be able to sign in via Entra until re-linked.</Dialog.Description>
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild><Button variant="secondary">Cancel</Button></Dialog.Close>
            <Button variant="danger" onClick={handle} disabled={isPending}>{isPending ? 'Unlinking...' : 'Unlink'}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function SetPasswordModal({ userId, hasCredential }: { userId: string; hasCredential: boolean }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof pwSchema>>({
    resolver: zodResolver(pwSchema),
  });

  function onSubmit(values: z.infer<typeof pwSchema>) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('newPassword', values.newPassword);
      const result = await setPasswordAction(userId, fd);
      if (result.ok) {
        toast.success(hasCredential ? 'Password reset successfully' : 'Password set and local login enabled');
        reset();
        setOpen(false);
      } else {
        toast.error(result.error ?? 'Failed');
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="secondary" size="sm">{hasCredential ? 'Reset Password' : 'Set Password'}</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 w-full max-w-sm">
          <Dialog.Title className="text-lg font-semibold text-slate-800 mb-4">{hasCredential ? 'Reset Password' : 'Set Initial Password'}</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-600 mb-4">
            {hasCredential ? 'Set a new password for this user.' : 'Set an initial password to enable local login for this user.'}
          </Dialog.Description>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">New Password</label>
              <input type="password" {...register('newPassword')} className={fieldClass(!!errors.newPassword)} />
              {errors.newPassword && <p className="text-rose-600 text-xs mt-1">{errors.newPassword.message}</p>}
              <p className="text-slate-400 text-xs mt-1">Share password securely with the user.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild><Button variant="secondary" type="button">Cancel</Button></Dialog.Close>
              <Button variant="primary" type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Set Password'}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ToggleLocalLoginButton({ userId, isEnabled }: { userId: string; isEnabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const result = await toggleLocalLoginAction(userId, !isEnabled);
      if (result.ok) {
        toast.success(isEnabled ? 'Local login disabled' : 'Local login enabled');
        setOpen(false);
      } else {
        toast.error(result.error ?? 'Failed');
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant={isEnabled ? 'ghost' : 'secondary'} size="sm" className={isEnabled ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50' : ''}>
          {isEnabled ? 'Disable Local Login' : 'Enable Local Login'}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 w-full max-w-sm">
          <Dialog.Title className="text-lg font-semibold text-slate-800 mb-2">{isEnabled ? 'Disable Local Login' : 'Enable Local Login'}</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-600 mb-6">
            {isEnabled
              ? 'The user will no longer be able to sign in with Employee ID and password.'
              : 'The user will be able to sign in with Employee ID and password.'}
          </Dialog.Description>
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild><Button variant="secondary">Cancel</Button></Dialog.Close>
            <Button variant={isEnabled ? 'danger' : 'primary'} onClick={handle} disabled={isPending}>
              {isPending ? 'Saving...' : (isEnabled ? 'Disable' : 'Enable')}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function RevokeSessionButton({ userId, sessionId }: { userId: string; sessionId: string }) {
  const [isPending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const result = await revokeSessionAction(userId, sessionId);
      if (result.ok) toast.success('Session revoked');
      else toast.error(result.error ?? 'Failed to revoke session');
    });
  }

  return (
    <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={handle} disabled={isPending}>
      {isPending ? 'Revoking...' : 'Revoke'}
    </Button>
  );
}

export function RevokeAllSessionsButton({ userId, count }: { userId: string; count: number }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const result = await revokeAllSessionsAction(userId);
      if (result.ok) {
        toast.success('All sessions revoked');
        setOpen(false);
      } else {
        toast.error(result.error ?? 'Failed to revoke sessions');
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="danger" size="sm" disabled={count === 0}>Revoke All ({count})</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 w-full max-w-sm">
          <Dialog.Title className="text-lg font-semibold text-slate-800 mb-2">Revoke All Sessions</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-600 mb-6">
            Revoke all <strong>{count}</strong> active session{count !== 1 ? 's' : ''}? The user will be signed out immediately.
          </Dialog.Description>
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild><Button variant="secondary">Cancel</Button></Dialog.Close>
            <Button variant="danger" onClick={handle} disabled={isPending}>{isPending ? 'Revoking...' : 'Revoke All'}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const grantRoleSchema = z.object({
  appId:     z.string().min(1, 'App is required'),
  role:      z.string().min(1, 'Role is required').max(100),
  expiresAt: z.string().optional(),
});

export function GrantRoleFromUserModal({
  userId,
  apps,
}: {
  userId: string;
  apps: { appId: string; displayName: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof grantRoleSchema>>({
    resolver: zodResolver(grantRoleSchema),
  });

  function onSubmit(values: z.infer<typeof grantRoleSchema>) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('appId', values.appId);
      fd.set('role', values.role);
      if (values.expiresAt) fd.set('expiresAt', values.expiresAt);
      const result = await grantRoleFromUserAction(userId, fd);
      if (result.ok) {
        toast.success('Role granted');
        reset();
        setOpen(false);
      } else {
        toast.error(result.error ?? 'Failed to grant role');
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <Dialog.Trigger asChild>
        <Button variant="secondary" size="sm">Grant Role</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 w-full max-w-md">
          <Dialog.Title className="text-lg font-semibold text-slate-800 mb-4">Grant Role</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-600 mb-4">
            Assign a role to this user for a registered application.
          </Dialog.Description>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">App <span className="text-rose-600">*</span></label>
              <select
                {...register('appId')}
                className={cn(
                  'w-full bg-slate-50/50 border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors',
                  errors.appId ? 'border-rose-300 text-rose-700' : 'border-slate-200 text-slate-700 focus:border-[#0F1059] focus:bg-white'
                )}
              >
                <option value="">Select app…</option>
                {apps.map((a) => (
                  <option key={a.appId} value={a.appId}>{a.displayName} ({a.appId})</option>
                ))}
              </select>
              {errors.appId && <p className="text-rose-600 text-xs mt-1">{errors.appId.message}</p>}
            </div>
            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">Role <span className="text-rose-600">*</span></label>
              <input
                {...register('role')}
                placeholder="e.g. ADMIN, QMS_VIEWER"
                className={cn(
                  'w-full bg-slate-50/50 border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors',
                  errors.role ? 'border-rose-300 text-rose-700' : 'border-slate-200 text-slate-700 focus:border-[#0F1059] focus:bg-white'
                )}
              />
              {errors.role && <p className="text-rose-600 text-xs mt-1">{errors.role.message}</p>}
            </div>
            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">
                Expires At <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="datetime-local"
                {...register('expiresAt')}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild><Button variant="secondary" type="button">Cancel</Button></Dialog.Close>
              <Button variant="primary" type="submit" disabled={isPending}>{isPending ? 'Granting…' : 'Grant Role'}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function SyncUserFromM365Button({ userId, disabled }: { userId: string; disabled: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    startTransition(async () => {
      const result = await syncUserFromM365DetailAction(userId);
      if (result.ok) toast.success('User synced from M365');
      else toast.error(result.error ?? 'Failed to sync user from M365');
    });
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={disabled || isPending}
      onClick={handleSync}
      title={disabled ? 'Link Entra identity before syncing' : 'Sync this user from Microsoft 365'}
    >
      {isPending ? 'Syncing...' : 'Sync From M365'}
    </Button>
  );
}

export function ToggleDelegatedMailButton({
  userId,
  enabled,
  m365Linked,
}: {
  userId: string;
  enabled: boolean;
  m365Linked: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleDelegatedMailAction(userId, !enabled);
      if (result.ok) toast.success(enabled ? 'Delegated mail disabled' : 'Delegated mail enabled');
      else toast.error(result.error ?? 'Failed to update delegated mail');
    });
  }

  return (
    <Button
      variant={enabled ? 'danger' : 'primary'}
      size="sm"
      disabled={isPending || (!enabled && !m365Linked)}
      onClick={handleToggle}
      title={!m365Linked ? 'Requires M365 link' : undefined}
    >
      {isPending ? 'Saving...' : enabled ? 'Disable Delegated Mail' : 'Enable Delegated Mail'}
    </Button>
  );
}
