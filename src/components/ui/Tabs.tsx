'use client';

import * as React from 'react';
import styles from './Tabs.module.css';

type TabsProps = {
  items: { key: string; label: React.ReactNode; icon?: React.ReactNode }[];
  value: string;
  onChange: (key: string) => void;
};

export const Tabs: React.FC<TabsProps> = ({ items, value, onChange }) => (
  <div className={styles.tabs}>
    {items.map((it) => (
      <button
        key={it.key}
        className={`${styles.tab} ${value === it.key ? styles.active : ''}`}
        onClick={() => onChange(it.key)}
      >
        {it.icon}
        {it.label}
      </button>
    ))}
  </div>
);

export default Tabs;
