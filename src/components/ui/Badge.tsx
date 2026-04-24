import * as React from 'react';
import styles from './Badge.module.css';

export const STATUS_MAP = {
  todo: { label: 'Сделать', fg: '#5B6670', bg: '#EEF0F3', dot: '#8B939C' },
  doing: { label: 'В работе', fg: '#2B5FA4', bg: '#E8EEF7', dot: '#2B5FA4' },
  review: { label: 'На проверке', fg: '#8A6A12', bg: '#FBF3DC', dot: '#D4A017' },
  done: { label: 'Готово', fg: '#2E7D3E', bg: '#E4F2E6', dot: '#2E7D3E' },
} as const;

export type StatusKey = keyof typeof STATUS_MAP;

type StatusPillProps = { status?: StatusKey; size?: 'sm' | 'md' };

export const StatusPill: React.FC<StatusPillProps> = ({ status = 'todo', size = 'md' }) => {
  const s = STATUS_MAP[status];
  return (
    <span
      className={styles.pill}
      style={{
        background: s.bg,
        color: s.fg,
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        fontSize: size === 'sm' ? 11 : 12,
      }}
    >
      <span className={styles.dot} style={{ background: s.dot }} />
      {s.label}
    </span>
  );
};

export const PRIO_MAP = {
  low: { label: 'Низкий', color: '#8B939C' },
  normal: { label: 'Средний', color: '#2B5FA4' },
  high: { label: 'Высокий', color: '#D4A017' },
  urgent: { label: 'Срочный', color: '#B23A3A' },
} as const;

export type PrioKey = keyof typeof PRIO_MAP;

type PriorityBarProps = { level?: PrioKey; vertical?: boolean; thickness?: number };

export const PriorityBar: React.FC<PriorityBarProps> = ({ level = 'normal', vertical = true, thickness = 3 }) => (
  <span
    className={styles.prioBar}
    style={{
      width: vertical ? thickness : 24,
      height: vertical ? 24 : thickness,
      background: PRIO_MAP[level].color,
    }}
  />
);

export const PrioDot: React.FC<{ level?: PrioKey; size?: number }> = ({ level = 'normal', size = 8 }) => (
  <span
    className={styles.prioDot}
    style={{ width: size, height: size, background: PRIO_MAP[level].color }}
  />
);

export const Tag: React.FC<{ children: React.ReactNode; color?: string; fg?: string }> = ({
  children,
  color = '#E8EEF7',
  fg = '#2B5FA4',
}) => (
  <span className={styles.tag} style={{ background: color, color: fg }}>
    {children}
  </span>
);

export const Chip: React.FC<{ children: React.ReactNode; active?: boolean; count?: number }> = ({
  children,
  active,
  count,
}) => (
  <span className={`${styles.chip} ${active ? styles.chipActive : ''}`}>
    {children}
    {count != null && <span className={styles.chipCount}>{count}</span>}
  </span>
);

export default StatusPill;
