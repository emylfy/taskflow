'use client';

import * as React from 'react';
import Link from 'next/link';
import { I } from '@/components/icons/Icons';
import { Logo } from '@/components/ui/Logo';
import { ProjectIcon } from '@/components/ui/ProjectIcon';
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

type SidebarProps = { active?: NavKey; org?: string };

export const Sidebar: React.FC<SidebarProps> = ({
  active = 'projects',
  org = 'Команда TaskFlow',
}) => (
  <aside className={styles.sidebar}>
    <div className={styles.logoBlock}>
      <Logo size={18} />
    </div>

    <div className={styles.org}>
      <div className={styles.orgIcon}>КТ</div>
      <div className={styles.orgText}>
        <div className={styles.orgName}>{org}</div>
        <div className={styles.orgRole}>Организация · Бизнес</div>
      </div>
      <I.ChevronDown size={14} stroke="#8B939C" />
    </div>

    <nav className={styles.nav}>
      <NavItem href="/projects" icon={<I.Folder size={16} />} label="Проекты" active={active === 'projects'} />
      <NavItem href="/my-tasks" icon={<I.CheckCircle size={16} />} label="Мои задачи" active={active === 'mytasks'} badge={12} />
      <NavItem href="/notifications" icon={<I.Bell size={16} />} label="Уведомления" active={active === 'notifications'} badge={4} />
      <NavItem href="/chat" icon={<I.Message size={16} />} label="Чат" active={active === 'chat'} badge={2} />
      <NavItem href="/settings" icon={<I.Settings size={16} />} label="Настройки" active={active === 'settings'} />
    </nav>

    <div className={styles.sectionTitle}>Избранные проекты</div>
    <div className={styles.favs}>
      {['Редизайн сайта', 'Запуск мобильного приложения', 'Маркетинговая кампания Q2 2026'].map((p) => (
        <Link key={p} href={`/projects`} className={styles.fav}>
          <ProjectIcon name={p} size={20} />
          <span className={styles.favName}>{p}</span>
        </Link>
      ))}
    </div>

    <div className={styles.flex} />

    <div className={styles.storage}>
      <div className={styles.storageTitle}>Занято 3,2 ГБ из 20 ГБ</div>
      <div className={styles.storageBar}>
        <div className={styles.storageFill} style={{ width: '16%' }} />
      </div>
    </div>

    <form action={logoutDemo} className={styles.logoutForm}>
      <button type="submit" className={styles.logoutBtn}>Выйти</button>
    </form>
  </aside>
);

export default Sidebar;
