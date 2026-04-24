import * as React from 'react';
import { I } from '@/components/icons/Icons';
import { AvatarStack } from '@/components/ui/AvatarStack';
import { Tag, PRIO_MAP } from '@/components/ui/Badge';
import type { PrioKey } from '@/components/ui/Badge';
import styles from './mobile.module.css';

export const metadata = { title: 'Мобильный канбан — TaskFlow' };

type MCard = {
  t: string;
  tag: string;
  prio: PrioKey;
  com?: number;
  att?: number;
  assignees: string[];
};

const COLUMNS: { t: string; c: string; n: number; cards: MCard[] }[] = [
  {
    t: 'Сделать',
    c: '#8B939C',
    n: 5,
    cards: [
      { t: 'Согласовать техническое задание с заказчиком', tag: 'планирование', prio: 'urgent', com: 3, att: 2, assignees: ['Иван Соколов', 'Мария Петрова'] },
      { t: 'Обновить схему базы данных', tag: 'архитектура', prio: 'normal', com: 1, assignees: ['Сергей Николаев'] },
      { t: 'Провести исследование пользователей', tag: 'продукт', prio: 'normal', com: 0, assignees: ['Елена Куликова'] },
    ],
  },
  {
    t: 'В работе',
    c: '#2B5FA4',
    n: 3,
    cards: [
      { t: 'Подготовить макеты главной страницы', tag: 'дизайн', prio: 'high', com: 8, att: 4, assignees: ['Иван Соколов', 'Мария Петрова'] },
      { t: 'Настроить развёртывание через Docker Compose', tag: 'инфраструктура', prio: 'high', com: 2, assignees: ['Сергей Николаев'] },
    ],
  },
  { t: 'На проверке', c: '#D4A017', n: 2, cards: [] },
  { t: 'Готово', c: '#2E7D3E', n: 6, cards: [] },
];

export default function MobileBoardPage() {
  return (
    <div className={styles.frame}>
      <div className={styles.statusBar}>9:41</div>
      <div className={styles.header}>
        <I.ArrowLeft size={20} stroke="#1A1D23" />
        <div className={styles.project}>
          <div className={styles.projectName}>Редизайн сайта</div>
          <div className={styles.projectSub}>Канбан · 48 задач · 5 участников</div>
        </div>
        <I.Filter size={18} stroke="#5B6670" />
        <I.MoreH size={18} stroke="#5B6670" />
      </div>

      <div className={styles.tabs}>
        {[
          { t: 'Канбан', a: true },
          { t: 'Список' },
          { t: 'Календарь' },
        ].map((x) => (
          <div key={x.t} className={`${styles.tab} ${x.a ? styles.tabActive : ''}`}>
            {x.t}
          </div>
        ))}
      </div>

      <div className={styles.board}>
        {COLUMNS.map((col, idx) => (
          <div key={col.t} className={styles.column} style={{ opacity: idx > 1 ? 0.55 : 1 }}>
            <div className={styles.columnHead}>
              <span className={styles.columnDot} style={{ background: col.c }} />
              <span className={styles.columnTitle}>{col.t}</span>
              <span className={styles.columnCount}>{col.n}</span>
              <div style={{ flex: 1 }} />
              <I.Plus size={14} stroke="#8B939C" />
            </div>
            <div className={styles.cards}>
              {col.cards.map((c) => (
                <div key={c.t} className={styles.card}>
                  <div className={styles.cardBar} style={{ background: PRIO_MAP[c.prio].color }} />
                  <div className={styles.cardTitle}>{c.t}</div>
                  <div className={styles.cardRow}>
                    <Tag>{c.tag}</Tag>
                  </div>
                  <div className={styles.cardMeta}>
                    {c.com != null && c.com > 0 && (
                      <span className={styles.cardMetaItem}>
                        <I.Message size={12} stroke="#8B939C" />
                        {c.com}
                      </span>
                    )}
                    {c.att != null && c.att > 0 && (
                      <span className={styles.cardMetaItem}>
                        <I.Paperclip size={12} stroke="#8B939C" />
                        {c.att}
                      </span>
                    )}
                    <div style={{ flex: 1 }} />
                    <AvatarStack names={c.assignees} size={20} max={3} />
                  </div>
                </div>
              ))}
              {col.cards.length === 0 && (
                <div className={styles.empty}>Пока пусто. Задачи появятся здесь, когда будут готовы.</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.fab}>
        <I.Plus size={24} stroke="#fff" sw={2} />
      </div>

      <div className={styles.bottomNav}>
        {[
          { i: <I.Folder size={22} />, t: 'Проекты', a: true },
          { i: <I.CheckCircle size={22} />, t: 'Задачи' },
          { i: <I.Message size={22} />, t: 'Чат', b: 2 },
          { i: <I.User size={22} />, t: 'Профиль' },
        ].map((x) => (
          <div key={x.t} className={`${styles.bottomItem} ${x.a ? styles.bottomActive : ''}`}>
            {x.i}
            <span className={styles.bottomLabel}>{x.t}</span>
            {x.b && <span className={styles.bottomBadge}>{x.b}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
