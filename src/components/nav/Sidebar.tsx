'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { I } from '@/components/icons/Icons';
import { Logo } from '@/components/ui/Logo';
import { Dropdown } from '@/components/ui/Dropdown';
import { useMobileNav } from '@/components/nav/MobileNavProvider';
import { logoutDemo } from '@/server/actions/demo';
import styles from './Sidebar.module.css';

type NavKey = 'projects' | 'mytasks' | 'notifications' | 'chat' | 'settings';

type NavItemProps = {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  href?: string;
};

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, badge, href = '#' }) => (
  <Link href={href} className={`${styles.item} ${active ? styles.active : ''}`}>
    <span className={styles.itemIcon}>{icon}</span>
    <span className={styles.itemLabel}>{label}</span>
    {badge != null && <span className={`${styles.badge} ${active ? styles.badgeActive : ''}`}>{badge}</span>}
  </Link>
);

type SidebarProps = {
  active?: NavKey;
  org?: string;
  orgName?: string;
  planName?: string;
  isAuthed?: boolean;
};

export const Sidebar: React.FC<SidebarProps> = ({
  active = 'projects',
  org,
  orgName = 'Команда TaskFlow',
  planName,
  isAuthed = true,
}) => {
  const router = useRouter();
  const { open, closeNav } = useMobileNav();
  const displayOrg = org ?? orgName;
  return (
  <>
  <div
    className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`}
    onClick={closeNav}
    aria-hidden="true"
  />
  <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
    <div className={styles.logoBlock}>
      <Logo size={18} />
    </div>

    <Dropdown
      align="left"
      trigger={
        <div className={styles.org} style={{ cursor: 'pointer' }}>
          <div className={styles.orgIcon}>{displayOrg.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}</div>
          <div className={styles.orgText}>
            <div className={styles.orgName}>{displayOrg}</div>
            <div className={styles.orgRole}>{planName ? `Организация · ${planName}` : 'Организация'}</div>
          </div>
          <I.ChevronDown size={14} stroke="#8B939C" />
        </div>
      }
      items={[
        { label: 'Участники и роли', icon: <I.Users size={14} />, onClick: () => router.push('/admin/members') },
        { label: 'Тарифы и оплата', icon: <I.CreditCard size={14} />, onClick: () => router.push('/admin/billing') },
        { label: 'Журнал действий', icon: <I.Shield size={14} />, onClick: () => router.push('/admin/journal') },
      ]}
    />

    <nav className={styles.nav}>
      <NavItem href="/projects" icon={<I.Folder size={16} />} label="Проекты" active={active === 'projects'} />
      <NavItem href="/my-tasks" icon={<I.CheckCircle size={16} />} label="Мои задачи" active={active === 'mytasks'} />
      <NavItem href="/notifications" icon={<I.Bell size={16} />} label="Уведомления" active={active === 'notifications'} />
      <NavItem href="/chat" icon={<I.Message size={16} />} label="Чат" active={active === 'chat'} />
      <NavItem href="/settings" icon={<I.Settings size={16} />} label="Настройки" active={active === 'settings'} />
    </nav>

    <div className={styles.flex} />

    {isAuthed && (
      <form action={logoutDemo} className={styles.logoutForm}>
        <button type="submit" className={styles.logoutBtn}>Выйти</button>
      </form>
    )}
  </aside>
  </>
  );
};

export default Sidebar;
