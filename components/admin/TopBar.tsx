'use client';

import { signOut } from 'next-auth/react';
import type { User } from 'next-auth';
import { Button } from '@/components/ui/button';

interface TopBarProps {
  user: User;
}

export function TopBar({ user }: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-6 lg:px-8 shrink-0">
      <div className="md:hidden">
        <span className="text-[#0F1059] font-bold text-base">NDC Auth Center</span>
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-slate-800 leading-none">
            {user.name ?? user.email}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-[#0F1059] flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-semibold">
            {(user.name ?? user.email ?? '?')[0].toUpperCase()}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
