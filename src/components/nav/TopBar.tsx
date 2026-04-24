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
};

export const TopBar: React.FC<TopBarProps> = ({
  title,
  subtitle,
  showSearch = true,
  searchValue = 'Поиск по задачам, проектам, участникам…',
  actions,
  user = 'Иван Соколов',
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
    <Link href="/notifications" className={styles.iconBtn} aria-label="Уведомления">
      <I.Bell size={16} stroke="#5B6670" />
      <span className={styles.iconDot} />
    </Link>
    <button className={styles.iconBtn} aria-label="Создать">
      <I.Plus size={16} stroke="#5B6670" />
    </button>
    <Avatar name={user} size={32} />
  </header>
);

export default TopBar;
