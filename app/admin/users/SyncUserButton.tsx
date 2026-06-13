'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { syncUserFromM365Action } from './actions';

export function SyncUserButton({
  userId,
  linked,
  size = 'sm',
  variant = 'secondary',
}: {
  userId: string;
  linked: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    startTransition(async () => {
      const result = await syncUserFromM365Action(userId);
      if (result.ok) toast.success('User synced from M365');
      else toast.error(result.error ?? 'Failed to sync user from M365');
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      disabled={isPending || !linked}
      onClick={handleSync}
      title={linked ? 'Sync this user from Microsoft 365' : 'Link Entra identity before syncing'}
    >
      {isPending ? 'Syncing...' : 'Sync M365'}
    </Button>
  );
}
