'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { revokeRoleForAppAction } from './actions';

interface Props {
  appId: string;
  grantId: string;
  role: string;
  employeeId: string;
}

export function AppRevokeButton({ appId, grantId, role, employeeId }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleRevoke() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('grantId', grantId);
      const result = await revokeRoleForAppAction(appId, fd);
      if (result.ok) {
        toast.success('Role grant revoked');
        setOpen(false);
      } else {
        toast.error(result.error ?? 'Failed to revoke');
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
          Revoke
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 w-full max-w-sm">
          <Dialog.Title className="text-lg font-semibold text-slate-800 mb-2">
            Revoke Role Grant
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-600 mb-6">
            Revoke{' '}
            <span className="font-mono font-semibold text-slate-800">{role}</span>
            {' '}from{' '}
            <span className="font-mono font-semibold text-slate-800">{employeeId}</span>?
            This action cannot be undone.
          </Dialog.Description>
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Dialog.Close>
            <Button variant="danger" onClick={handleRevoke} disabled={isPending}>
              {isPending ? 'Revoking…' : 'Revoke'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
