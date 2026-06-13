'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { rebuildDepartmentsAction, syncGroupsAction, syncUsersAction } from './actions';

export function DirectorySyncClient() {
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message ?? 'Completed');
      else toast.error(result.error ?? 'Failed');
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="primary" size="sm" disabled={isPending} onClick={() => run(syncUsersAction)}>
        {isPending ? 'Working...' : 'Sync Users'}
      </Button>
      <Button variant="secondary" size="sm" disabled={isPending} onClick={() => run(syncGroupsAction)}>
        Sync Email Groups
      </Button>
      <Button variant="secondary" size="sm" disabled={isPending} onClick={() => run(rebuildDepartmentsAction)}>
        Rebuild Departments
      </Button>
    </div>
  );
}
