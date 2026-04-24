import * as React from 'react';
import { Sidebar } from '@/components/nav/Sidebar';
import { TopBar } from '@/components/nav/TopBar';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';

async function resolveAuthContext() {
  try {
    const user = await getCurrentUser();
    if (!user) return { user: null, org: null };
    const member = await prisma.member.findFirst({
      where: { userId: user.id },
      include: { organization: true },
    });
    return { user, org: member?.organization ?? null };
  } catch {
    return { user: null, org: null };
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, org } = await resolveAuthContext();
  const userName = user?.name ?? 'Гость';
  const orgName = org?.name ?? 'Команда TaskFlow';
  const isAuthed = !!user;

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
      <Sidebar active="settings" orgName={orgName} isAuthed={isAuthed} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar user={userName} />
        <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
      </div>
    </div>
  );
}
