import * as React from 'react';
import { Sidebar } from '@/components/nav/Sidebar';
import { TopBar } from '@/components/nav/TopBar';
import styles from './shell.module.css';

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.column}>
        <TopBar />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
