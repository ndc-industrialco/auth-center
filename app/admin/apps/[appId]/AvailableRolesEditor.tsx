'use client';

import { useState, useTransition, useRef } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { updateAvailableRolesAction } from './actions';

interface Props {
  appId: string;
  initialRoles: string[];
}

export function AvailableRolesEditor({ appId, initialRoles }: Props) {
  const [roles, setRoles] = useState<string[]>(initialRoles);
  const [inputValue, setInputValue] = useState('');
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function save(nextRoles: string[]) {
    startTransition(async () => {
      const result = await updateAvailableRolesAction(appId, nextRoles);
      if (!result.ok) {
        toast.error(result.error ?? 'Failed to save roles');
        setRoles(roles); // revert
      }
    });
  }

  function addRole() {
    const normalized = inputValue.trim().toUpperCase();
    if (!normalized || roles.includes(normalized)) {
      setInputValue('');
      return;
    }
    const next = [...roles, normalized];
    setRoles(next);
    setInputValue('');
    save(next);
    inputRef.current?.focus();
  }

  function removeRole(role: string) {
    const next = roles.filter((r) => r !== role);
    setRoles(next);
    save(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRole();
    }
    if (e.key === 'Backspace' && !inputValue && roles.length > 0) {
      const last = roles[roles.length - 1];
      removeRole(last);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Available Roles</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Define the roles users can be assigned in this app. The roster dropdown will use these options.
          </p>
        </div>
        {isPending && (
          <span className="text-xs text-slate-400 mt-1 shrink-0">Saving…</span>
        )}
      </div>

      {/* Tags + input */}
      <div
        className={cn(
          'min-h-[44px] flex flex-wrap gap-2 items-center border rounded-xl px-3 py-2 transition-colors cursor-text',
          isPending ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white focus-within:border-[#0F1059]',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {roles.map((role) => (
          <span
            key={role}
            className="inline-flex items-center gap-1.5 bg-[#0F1059]/8 text-[#0F1059] text-xs font-mono font-semibold px-2.5 py-1 rounded-lg"
          >
            {role}
            <button
              type="button"
              disabled={isPending}
              onClick={(e) => { e.stopPropagation(); removeRole(role); }}
              className="text-[#0F1059]/50 hover:text-[#0F1059] leading-none disabled:opacity-40"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputValue.trim()) addRole(); }}
          placeholder={roles.length === 0 ? 'Type a role name and press Enter… e.g. QMS_USER' : ''}
          disabled={isPending}
          className="flex-1 min-w-[180px] bg-transparent text-sm text-slate-700 placeholder:text-slate-300 outline-none disabled:opacity-50"
        />
      </div>

      <p className="text-xs text-slate-400 mt-2">
        Press <kbd className="font-mono bg-slate-100 px-1 rounded">Enter</kbd> to add &middot; <kbd className="font-mono bg-slate-100 px-1 rounded">Backspace</kbd> to remove last &middot; Roles are auto-uppercased
      </p>
    </div>
  );
}
