import * as React from 'react';
import { Sidebar } from '@/components/nav/Sidebar';
import { TopBar } from '@/components/nav/TopBar';
import { getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import styles from './shell.module.css';

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

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const { user, org } = await resolveAuthContext();
  const userName = user?.name ?? 'Гость';
  const orgName = org?.name ?? 'Команда TaskFlow';
  const isAuthed = !!user;

  return (
    <div className={styles.shell}>
      <Sidebar orgName={orgName} isAuthed={isAuthed} />
      <div className={styles.column}>
        <TopBar user={userName} />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
