import { requireAdminPage } from '@/lib/requireAdminPage';
import { auth } from '@/lib/auth';
import { SidebarNav } from '@/components/admin/SidebarNav';
import { TopBar } from '@/components/admin/TopBar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();

  // session is guaranteed to exist after requireAdminPage()
  const session = await auth();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <SidebarNav />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar user={session!.user!} />
        <main className="flex-1 px-4 md:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
