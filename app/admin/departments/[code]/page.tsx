import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';

interface Props {
  params: Promise<{ code: string }>;
}

async function getDepartmentWithMembers(code: string) {
  return db.department.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      profiles: {
        where: { user: { employmentStatus: 'ACTIVE' } },
        include: {
          user: {
            select: {
              id: true,
              employeeId: true,
              displayName: true,
              email: true,
              m365Linked: true,
            },
          },
        },
        orderBy: { user: { displayName: 'asc' } },
      },
    },
  });
}

export default async function DepartmentDetailPage({ params }: Props) {
  const { code } = await params;
  const dept = await getDepartmentWithMembers(decodeURIComponent(code));
  if (!dept) notFound();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <nav className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <Link href="/admin/departments" className="hover:text-slate-600">Departments</Link>
          <span>/</span>
          <span>{dept.displayName}</span>
        </nav>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">{dept.displayName}</h1>
            <p className="text-sm text-slate-400 mt-1 font-mono">{dept.code}</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Badge
              label={dept.source === 'GRAPH' ? 'M365' : 'Manual'}
              variant={dept.source === 'GRAPH' ? 'info' : 'neutral'}
            />
            <Badge label={`${dept.profiles.length} active members`} variant="active" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Active Members</h2>
          {dept.syncedAt && (
            <p className="text-xs text-slate-400">
              Synced{' '}
              {new Date(dept.syncedAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
        </div>

        {dept.profiles.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-slate-800 font-semibold mb-1">No active members</p>
            <p className="text-slate-400 text-sm">
              Users are assigned here when their department field matches this code.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Employee ID</th>
                <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Name</th>
                <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Email</th>
                <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-center">M365</th>
                <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-left">Job Title</th>
                <th className="text-slate-800 text-sm font-semibold px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dept.profiles.map((profile) => (
                <tr key={profile.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-700">
                    {profile.user.employeeId}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{profile.user.displayName ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{profile.user.email ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      label={profile.user.m365Linked ? 'Linked' : 'Local'}
                      variant={profile.user.m365Linked ? 'success' : 'neutral'}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{profile.jobTitle ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${profile.user.id}`}
                      className="text-[#0F1059] text-xs font-medium hover:underline"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
