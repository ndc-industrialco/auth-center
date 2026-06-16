'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  createDepartmentAction,
  updateDepartmentAction,
  deleteDepartmentAction,
  syncDepartmentsFromM365Action,
} from './actions';

// ── Create ──────────────────────────────────────────────────────────────────
const createSchema = z.object({
  code: z
    .string()
    .min(1, 'Required')
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, 'Alphanumeric, hyphens, underscores only')
    .transform((v) => v.trim().toUpperCase()),
  displayName: z.string().min(1, 'Required').max(200).transform((v) => v.trim()),
});

type CreateValues = z.infer<typeof createSchema>;

function fieldClass(err: boolean) {
  return cn(
    'w-full bg-slate-50/50 border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors',
    err
      ? 'border-rose-300 text-rose-700 focus:border-rose-500'
      : 'border-slate-200 text-slate-700 focus:border-[#0F1059] focus:bg-white'
  );
}

export function CreateDepartmentButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({ resolver: zodResolver(createSchema) });

  function onSubmit(values: CreateValues) {
    startTransition(async () => {
      const result = await createDepartmentAction(values.code, values.displayName);
      if (result.ok) {
        toast.success(result.message ?? 'Created');
        setOpen(false);
        reset();
        router.refresh();
      } else {
        toast.error(result.error ?? 'Failed');
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="primary" size="sm">+ Add Department</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
          <Dialog.Title className="text-lg font-semibold text-slate-800">Add Department</Dialog.Title>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Code</label>
              <input
                {...register('code')}
                placeholder="e.g. IT, HR, FINANCE"
                className={fieldClass(!!errors.code)}
              />
              {errors.code && <p className="mt-1 text-xs text-rose-500">{errors.code.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Display Name</label>
              <input
                {...register('displayName')}
                placeholder="e.g. Information Technology"
                className={fieldClass(!!errors.displayName)}
              />
              {errors.displayName && <p className="mt-1 text-xs text-rose-500">{errors.displayName.message}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="primary" size="sm" disabled={isPending} className="flex-1">
                {isPending ? 'Creating...' : 'Create'}
              </Button>
              <Dialog.Close asChild>
                <Button type="button" variant="secondary" size="sm">Cancel</Button>
              </Dialog.Close>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Edit ─────────────────────────────────────────────────────────────────────
const editSchema = z.object({
  displayName: z.string().min(1, 'Required').max(200).transform((v) => v.trim()),
});

type EditValues = z.infer<typeof editSchema>;

interface EditDepartmentButtonProps {
  code: string;
  currentName: string;
}

export function EditDepartmentButton({ code, currentName }: EditDepartmentButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { displayName: currentName },
  });

  function handleOpenChange(next: boolean) {
    if (!next) reset({ displayName: currentName });
    setOpen(next);
  }

  function onSubmit(values: EditValues) {
    startTransition(async () => {
      const result = await updateDepartmentAction(code, values.displayName);
      if (result.ok) {
        toast.success(result.message ?? 'Updated');
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? 'Failed');
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button className="text-[#0F1059] text-xs font-medium hover:underline">Edit</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
          <Dialog.Title className="text-lg font-semibold text-slate-800">Edit Department</Dialog.Title>
          <p className="text-xs text-slate-400 font-mono">{code}</p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Display Name</label>
              <input
                {...register('displayName')}
                className={fieldClass(!!errors.displayName)}
              />
              {errors.displayName && <p className="mt-1 text-xs text-rose-500">{errors.displayName.message}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="primary" size="sm" disabled={isPending} className="flex-1">
                {isPending ? 'Saving...' : 'Save'}
              </Button>
              <Dialog.Close asChild>
                <Button type="button" variant="secondary" size="sm">Cancel</Button>
              </Dialog.Close>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Delete ───────────────────────────────────────────────────────────────────
interface DeleteDepartmentButtonProps {
  code: string;
  userCount: number;
}

export function DeleteDepartmentButton({ code, userCount }: DeleteDepartmentButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onConfirm() {
    startTransition(async () => {
      const result = await deleteDepartmentAction(code);
      if (result.ok) {
        toast.success(result.message ?? 'Deleted');
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? 'Cannot delete');
        setOpen(false);
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="text-rose-500 text-xs font-medium hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={userCount > 0}
          title={userCount > 0 ? `${userCount} users assigned — reassign first` : undefined}
        >
          Delete
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
          <Dialog.Title className="text-lg font-semibold text-slate-800">Delete Department</Dialog.Title>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <span className="font-mono font-semibold">{code}</span>?
            This cannot be undone.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isPending}
              onClick={onConfirm}
              className="flex-1"
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </Button>
            <Dialog.Close asChild>
              <Button type="button" variant="secondary" size="sm">Cancel</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Sync from M365 ────────────────────────────────────────────────────────────
export function SyncFromM365Button() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSync() {
    startTransition(async () => {
      const result = await syncDepartmentsFromM365Action();
      if (result.ok) {
        toast.success(result.message ?? 'Sync complete');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Sync failed');
      }
    });
  }

  return (
    <Button variant="secondary" size="sm" disabled={isPending} onClick={handleSync}>
      {isPending ? 'Syncing...' : 'Sync from M365'}
    </Button>
  );
}
