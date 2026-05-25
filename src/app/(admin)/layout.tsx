import * as React from 'react';
import { Sidebar } from '@/components/nav/Sidebar';
import { TopBar } from '@/components/nav/TopBar';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getActivePlan } from '@/lib/plan-limits';

async function resolveAuthContext() {
  try {
    const user = await getCurrentUser();
    if (!user) return { user: null, org: null, unreadCount: 0, prioritySupport: false };
    const [member, unreadCount] = await Promise.all([
      prisma.member.findFirst({
        where: { userId: user.id },
        include: { organization: true },
      }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    let prioritySupport = false;
    if (member) {
      const plan = await getActivePlan(member.organizationId);
      prioritySupport = !!plan?.features.flags.prioritySupport;
    }
    return { user, org: member?.organization ?? null, unreadCount, prioritySupport };
  } catch {
    return { user: null, org: null, unreadCount: 0, prioritySupport: false };
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, org, unreadCount, prioritySupport } = await resolveAuthContext();
  const userName = user?.name ?? 'Гость';
  const orgName = org?.name ?? 'Команда TaskFlow';
  const isAuthed = !!user;

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
      <Sidebar active="settings" orgName={orgName} isAuthed={isAuthed} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar user={userName} unreadCount={unreadCount} prioritySupport={prioritySupport} />
        <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
      </div>
    </div>
  );
}
