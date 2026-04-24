import * as React from 'react';
import styles from './EmptyState.module.css';

type EmptyStateProps = { icon?: React.ReactNode; title?: string; desc?: string };

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title = 'Пока пусто', desc }) => (
  <div className={styles.wrap}>
    {icon && <div className={styles.icon}>{icon}</div>}
    <div className={styles.title}>{title}</div>
    {desc && <div className={styles.desc}>{desc}</div>}
  </div>
);

export default EmptyState;
