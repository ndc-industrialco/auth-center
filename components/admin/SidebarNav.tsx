'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: 'D' },
  { href: '/admin/apps', label: 'Apps', icon: 'A' },
  { href: '/admin/users', label: 'Users', icon: 'U' },
  { href: '/admin/directory', label: 'Directory', icon: 'Y' },
  { href: '/admin/role-grants', label: 'Role Grants', icon: 'R' },
  { href: '/admin/default-grants', label: 'Default Grants', icon: 'G' },
  { href: '/admin/audit', label: 'Audit Log', icon: 'L' },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-[#0F1059] min-h-screen">
      <div className="h-16 flex items-center px-5 border-b border-white/10">
        <span className="text-white font-bold text-lg tracking-tight">NDC Auth Center</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 w-full h-11 px-4 rounded-xl text-sm font-medium transition-colors duration-200',
                isActive
                  ? 'bg-white text-[#0F1059] font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              )}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-slate-400 text-xs text-center">Auth Center v0.1</p>
      </div>
    </aside>
  );
}
