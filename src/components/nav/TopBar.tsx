'use client';

import * as React from 'react';
import Link from 'next/link';
import { I } from '@/components/icons/Icons';
import { Avatar } from '@/components/ui/Avatar';
import styles from './TopBar.module.css';

type TopBarProps = {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  searchValue?: string;
  actions?: React.ReactNode;
  user?: string;
  unreadCount?: number;
  prioritySupport?: boolean;
};

export const TopBar: React.FC<TopBarProps> = ({
  title,
  subtitle,
  showSearch = true,
  searchValue = 'Поиск по задачам, проектам, участникам…',
  actions,
  user = 'Иван Соколов',
  unreadCount = 0,
  prioritySupport = false,
}) => (
  <header className={styles.bar}>
    {title && (
      <div className={styles.title}>
        <div className={styles.titleText}>{title}</div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      </div>
    )}
    <div className={styles.spacer} />
    {showSearch && (
      <Link href="/search" className={styles.search}>
        <I.Search size={15} stroke="#8B939C" />
        <span className={styles.searchText}>{searchValue}</span>
        <span className={styles.kbd}>Ctrl K</span>
      </Link>
    )}
    {actions}
    {prioritySupport ? (
      <span
        className={styles.priorityBadge}
        title="Приоритетная поддержка — тариф «Бизнес»"
        aria-label="Приоритетная поддержка"
      >
        <I.Shield size={11} stroke="#fff" />
        Priority
      </span>
    ) : null}
    <Link
      href="/notifications"
      className={styles.iconBtn}
      aria-label={`Уведомления${unreadCount ? `: ${unreadCount} непрочитанных` : ''}`}
    >
      <I.Bell size={16} stroke="#5B6670" />
      {unreadCount > 0 ? <span className={styles.iconDot} /> : null}
    </Link>
    <Link href="/projects/new" className={styles.iconBtn} aria-label="Создать проект">
      <I.Plus size={16} stroke="#5B6670" />
    </Link>
    <Link href="/settings" aria-label="Профиль и настройки" style={{ display: 'inline-flex', borderRadius: '50%' }}>
      <Avatar name={user} size={32} />
    </Link>
  </header>
);

export default TopBar;
