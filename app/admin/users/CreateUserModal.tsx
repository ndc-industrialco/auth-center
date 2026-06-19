'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createUserAction } from './actions';

const schema = z.object({
  employeeId:      z.string().min(1, 'Required').max(50).regex(/^[A-Za-z0-9_-]+$/, 'Alphanumeric, hyphens, underscores only'),
  displayName:     z.string().max(200).optional().or(z.literal('')),
  email:           z.string().email('Invalid email').optional().or(z.literal('')),
  departmentCode:  z.string().max(100).optional().or(z.literal('')),
  department:      z.string().max(200).optional().or(z.literal('')),
  jobTitle:        z.string().max(200).optional().or(z.literal('')),
  initialPassword: z.string().max(128).optional().or(z.literal('')),
  entraObjectId:   z.string().optional().or(z.literal('')),
  entraUpn:        z.string().email('Invalid UPN').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface Department { code: string; displayName: string; }
interface EmailGroup { id: string; displayName: string; mail: string | null; }
interface Props { departments: Department[]; emailGroups: EmailGroup[]; }

function fieldClass(err: boolean) {
  return cn(
    'w-full bg-slate-50/50 border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors',
    err
      ? 'border-rose-300 text-rose-700 focus:border-rose-500'
      : 'border-slate-200 text-slate-700 focus:border-[#0F1059] focus:bg-white'
  );
}

function SectionDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{children}</p>
      <div className="flex-1 border-t border-slate-100" />
    </div>
  );
}

export function CreateUserModal({ departments, emailGroups }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const entraObjectId = useWatch({ control, name: 'entraObjectId' });
  const showGroups = !!entraObjectId?.trim() && emailGroups.length > 0;

  function handleClose(v: boolean) {
    setOpen(v);
    if (!v) { reset(); setSelectedGroups([]); }
  }

  function toggleGroup(id: string) {
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('employeeId', values.employeeId);
      fd.set('displayName', values.displayName ?? '');
      fd.set('email', values.email ?? '');
      fd.set('departmentCode', values.departmentCode ?? '');
      fd.set('department', values.department ?? '');
      fd.set('jobTitle', values.jobTitle ?? '');
      fd.set('initialPassword', values.initialPassword ?? '');
      fd.set('entraObjectId', values.entraObjectId ?? '');
      fd.set('entraUpn', values.entraUpn ?? '');
      selectedGroups.forEach((id) => fd.append('groupIds', id));

      const result = await createUserAction(fd);
      if (result.ok) {
        toast.success('User created successfully');
        handleClose(false);
        router.push(`/admin/users/${result.userId}`);
      } else {
        toast.error(result.error ?? 'Failed to create user');
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Trigger asChild>
        <Button variant="primary">Create User</Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-2xl max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 shrink-0">
            <Dialog.Title className="text-lg font-semibold text-slate-800">Create New User</Dialog.Title>
            <Dialog.Description className="text-sm text-slate-400 mt-0.5">
              Department, password, and Entra link are optional.
            </Dialog.Description>
          </div>

          {/* Scrollable body */}
          <form id="create-user-form" onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

            {/* ── Identity ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-slate-800 text-sm font-semibold mb-2 block">
                  Employee ID <span className="text-rose-600">*</span>
                </label>
                <input {...register('employeeId')} placeholder="e.g. EMP001" className={fieldClass(!!errors.employeeId)} />
                {errors.employeeId && <p className="text-rose-600 text-xs mt-1">{errors.employeeId.message}</p>}
              </div>
              <div>
                <label className="text-slate-800 text-sm font-semibold mb-2 block">Display Name</label>
                <input {...register('displayName')} placeholder="Full name" className={fieldClass(false)} />
              </div>
              <div>
                <label className="text-slate-800 text-sm font-semibold mb-2 block">Email</label>
                <input {...register('email')} type="email" placeholder="user@ndc.co.th" className={fieldClass(!!errors.email)} />
                {errors.email && <p className="text-rose-600 text-xs mt-1">{errors.email.message}</p>}
              </div>
            </div>

            {/* ── Profile ── */}
            <SectionDivider>Profile</SectionDivider>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-800 text-sm font-semibold mb-2 block">Department</label>
                {departments.length > 0 ? (
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const d = departments.find((x) => x.code === e.target.value);
                      setValue('departmentCode', d?.code ?? '');
                      setValue('department', d?.displayName ?? '');
                    }}
                    className={fieldClass(false)}
                  >
                    <option value="">— Select department —</option>
                    {departments.map((d) => (
                      <option key={d.code} value={d.code}>{d.displayName}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    placeholder="Department name"
                    className={fieldClass(false)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setValue('department', v);
                      setValue('departmentCode', v.trim().toUpperCase().replace(/\s+/g, '_'));
                    }}
                  />
                )}
                {/* Hidden registered fields for form submission */}
                <input {...register('departmentCode')} type="hidden" />
                <input {...register('department')} type="hidden" />
              </div>
              <div>
                <label className="text-slate-800 text-sm font-semibold mb-2 block">Job Title</label>
                <input {...register('jobTitle')} placeholder="e.g. Software Engineer" className={fieldClass(false)} />
              </div>
            </div>

            {/* ── Authentication ── */}
            <SectionDivider>Authentication</SectionDivider>
            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">
                Initial Password <span className="text-slate-400 font-normal text-xs">(optional)</span>
              </label>
              <input
                type="password"
                {...register('initialPassword')}
                placeholder="Enter password"
                className={fieldClass(!!errors.initialPassword)}
              />
              {errors.initialPassword
                ? <p className="text-rose-600 text-xs mt-1">{errors.initialPassword.message}</p>
                : <p className="text-slate-400 text-xs mt-1">Leave blank to create without local login. Share password securely with the user.</p>
              }
            </div>

            {/* ── Entra Link ── */}
            <SectionDivider>Entra Link (optional)</SectionDivider>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-800 text-sm font-semibold mb-2 block">Entra Object ID</label>
                <input
                  {...register('entraObjectId')}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={fieldClass(false)}
                />
                <p className="text-slate-400 text-xs mt-1">Required to assign Email Groups.</p>
              </div>
              <div>
                <label className="text-slate-800 text-sm font-semibold mb-2 block">Entra UPN</label>
                <input {...register('entraUpn')} placeholder="user@ndc.co.th" className={fieldClass(!!errors.entraUpn)} />
                {errors.entraUpn && <p className="text-rose-600 text-xs mt-1">{errors.entraUpn.message}</p>}
              </div>
            </div>

            {/* ── Groups (conditional) ── */}
            {showGroups && (
              <>
                <SectionDivider>Email Groups (optional)</SectionDivider>
                <div className="space-y-1 max-h-44 overflow-y-auto rounded-xl border border-slate-200 p-3">
                  {emailGroups.map((g) => (
                    <label
                      key={g.id}
                      className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(g.id)}
                        onChange={() => toggleGroup(g.id)}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{g.displayName}</span>
                      {g.mail && <span className="text-xs text-slate-400 shrink-0">{g.mail}</span>}
                    </label>
                  ))}
                </div>
                {selectedGroups.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {selectedGroups.length} group{selectedGroups.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </>
            )}
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
            <Dialog.Close asChild>
              <Button variant="secondary" type="button">Cancel</Button>
            </Dialog.Close>
            <Button variant="primary" type="submit" form="create-user-form" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create User'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
