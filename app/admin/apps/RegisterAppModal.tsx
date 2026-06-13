'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { registerAppAction } from './actions';

const schema = z.object({
  appId:       z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Lowercase, numbers and hyphens only'),
  displayName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

export function RegisterAppModal() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('appId', values.appId);
      fd.set('displayName', values.displayName);
      if (values.description) fd.set('description', values.description);

      const result = await registerAppAction(fd);
      if (result.ok) {
        toast.success('App registered successfully');
        reset();
        setOpen(false);
      } else {
        toast.error(result.error ?? 'Failed to register app');
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="primary">Register App</Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 w-full max-w-md">
          <Dialog.Title className="text-lg font-semibold text-slate-800 mb-4">
            Register Consumer App
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-600 mb-4">
            Register a new consumer application that can integrate with Auth Center.
          </Dialog.Description>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">
                App ID <span className="text-rose-600">*</span>
              </label>
              <input
                {...register('appId')}
                placeholder="e.g. qms, hr-center"
                className={cn(
                  'w-full bg-slate-50/50 border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors',
                  errors.appId
                    ? 'border-rose-300 text-rose-700 focus:border-rose-500'
                    : 'border-slate-200 text-slate-700 focus:border-[#0F1059] focus:bg-white'
                )}
              />
              {errors.appId && (
                <p className="text-rose-600 text-xs mt-1">{errors.appId.message}</p>
              )}
              <p className="text-slate-400 text-xs mt-1">Lowercase, numbers, and hyphens only.</p>
            </div>

            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">
                Display Name <span className="text-rose-600">*</span>
              </label>
              <input
                {...register('displayName')}
                placeholder="e.g. Quality Management System"
                className={cn(
                  'w-full bg-slate-50/50 border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors',
                  errors.displayName
                    ? 'border-rose-300 text-rose-700 focus:border-rose-500'
                    : 'border-slate-200 text-slate-700 focus:border-[#0F1059] focus:bg-white'
                )}
              />
              {errors.displayName && (
                <p className="text-rose-600 text-xs mt-1">{errors.displayName.message}</p>
              )}
            </div>

            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 text-sm resize-none focus:outline-none focus:border-[#0F1059] focus:bg-white transition-colors"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button variant="secondary" type="button">Cancel</Button>
              </Dialog.Close>
              <Button variant="primary" type="submit" disabled={isPending}>
                {isPending ? 'Registering…' : 'Register'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
