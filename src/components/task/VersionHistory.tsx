import * as React from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { I } from '@/components/icons/Icons';
import styles from './VersionHistory.module.css';

type Version = {
  id: string;
  author: string;
  timeLabel: string;
  summary: string;
  current?: boolean;
  selected?: boolean;
};

type VersionHistoryProps = { versions: Version[] };

export const VersionHistory: React.FC<VersionHistoryProps> = ({ versions }) => (
  <div className={styles.wrap}>
    <div className={styles.head}>
      <I.History size={15} stroke="#5B6670" />
      <span className={styles.title}>История версий</span>
      <div style={{ flex: 1 }} />
      <I.X size={14} stroke="#8B939C" />
    </div>
    <div className={styles.list}>
      {versions.map((v) => (
        <div key={v.id} className={`${styles.item} ${v.selected ? styles.selected : ''}`}>
          <Avatar name={v.author} size={26} />
          <div className={styles.info}>
            <div className={styles.name}>
              {v.author}
              {v.current && <span className={styles.badge}>ТЕКУЩАЯ</span>}
            </div>
            <div className={styles.time}>{v.timeLabel}</div>
            <div className={styles.summary}>{v.summary}</div>
          </div>
        </div>
      ))}
    </div>
    <div className={styles.foot}>
      <Button variant="secondary" size="sm" leading={<I.Compare size={13} stroke="#5B6670" />}>
        Сравнить
      </Button>
      <Button variant="primary" size="sm" leading={<I.Restore size={13} stroke="#fff" />}>
        Восстановить
      </Button>
    </div>
  </div>
);

export default VersionHistory;
