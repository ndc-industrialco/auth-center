import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { GroupMembersClient } from './GroupMembersClient';

async function getGroup(id: string) {
  return db.emailGroup.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { employeeId: true } },
        },
        orderBy: [{ displayName: 'asc' }, { email: 'asc' }],
      },
    },
  });
}

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function GroupDetailPage({ params }: Props) {
  const { groupId } = await params;
  const group = await getGroup(groupId);
  if (!group) notFound();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <nav className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <Link href="/admin/directory" className="hover:text-slate-600">Directory</Link>
          <span>/</span>
          <span>{group.displayName}</span>
        </nav>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F1059]">{group.displayName}</h1>
            <p className="text-sm text-slate-400 mt-1">{group.mail ?? '-'}</p>
          </div>
          <div className="flex gap-2">
            {group.securityEnabled && <Badge label="Security" variant="neutral" />}
            <Badge label={`${group.memberCount} members`} variant="info" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400 mb-1">Description</p>
            <p className="text-slate-700">{group.description ?? '-'}</p>
          </div>
          <div>
            <p className="text-slate-400 mb-1">Group Type</p>
            <p className="text-slate-700">{group.groupTypes ?? '-'}</p>
          </div>
        </div>

        <GroupMembersClient
          groupId={group.id}
          members={group.members.map((member) => ({
            id: member.id,
            displayName: member.displayName,
            email: member.email,
            userEmployeeId: member.user?.employeeId ?? null,
          }))}
        />
      </div>
    </div>
  );
}
