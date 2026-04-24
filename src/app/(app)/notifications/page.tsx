import * as React from 'react';
import { I } from '@/components/icons/Icons';
import { Avatar } from '@/components/ui/Avatar';
import styles from './notifications.module.css';

export const metadata = { title: 'Уведомления — TaskFlow' };

type IType = 'comment' | 'assigned' | 'review' | 'done' | 'edit' | 'status';

type Item = {
  type: IType;
  who: string;
  text: string;
  target: string;
  time: string;
  unread?: boolean;
  mention?: boolean;
};

const ITEMS: Item[] = [
  { type: 'comment', who: 'Мария Петрова', text: 'оставила комментарий в задаче', target: 'Подготовить макеты главной страницы', time: 'только что', unread: true, mention: true },
  { type: 'assigned', who: 'Сергей Николаев', text: 'назначил вам задачу', target: 'Настроить развёртывание через Docker Compose', time: '12 минут назад', unread: true },
  { type: 'review', who: 'Елена Куликова', text: 'отправила на проверку', target: 'Вёрстка страницы тарифов', time: '47 минут назад', unread: true },
  { type: 'done', who: 'Сергей Николаев', text: 'завершил задачу', target: 'Подключение ЮKassa', time: '2 часа назад', unread: true },
  { type: 'edit', who: 'Мария Петрова', text: 'отредактировала описание задачи', target: 'Согласовать техническое задание с заказчиком', time: 'вчера' },
  { type: 'comment', who: 'Тимур Белов', text: 'упомянул вас в комментарии', target: 'Черновик руководства пользователя', time: 'вчера', mention: true },
  { type: 'status', who: 'Иван Соколов', text: 'перенёс задачу в «В работе»', target: 'Обновить схему базы данных', time: '2 дня назад' },
];

const ICON_MAP: Record<IType, { i: React.ReactElement; c: string; b: string }> = {
  comment: { i: <I.Message size={14} />, c: '#2B5FA4', b: '#E8EEF7' },
  assigned: { i: <I.User size={14} />, c: '#2B5FA4', b: '#E8EEF7' },
  review: { i: <I.Eye size={14} />, c: '#8A6A12', b: '#FBF3DC' },
  done: { i: <I.Check size={14} />, c: '#2E7D3E', b: '#E4F2E6' },
  edit: { i: <I.Bold size={14} />, c: '#5B6670', b: '#EEF0F3' },
  status: { i: <I.Kanban size={14} />, c: '#5B6670', b: '#EEF0F3' },
};

export default function NotificationsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.head}>
          <div className={styles.title}>Уведомления</div>
          <div style={{ flex: 1 }} />
          <button className={styles.readAll}>Отметить всё прочитанным</button>
        </div>
        <div className={styles.tabs}>
          {[
            { t: 'Все', n: 22 },
            { t: 'Непрочитанные', n: 4, a: true },
            { t: 'Упоминания', n: 2 },
          ].map((x) => (
            <div key={x.t} className={`${styles.tab} ${x.a ? styles.tabActive : ''}`}>
              {x.t}
              <span className={styles.tabCount}>{x.n}</span>
            </div>
          ))}
        </div>
        <div className={styles.list}>
          {ITEMS.map((n, i) => {
            const ic = ICON_MAP[n.type];
            return (
              <div key={i} className={`${styles.item} ${n.unread ? styles.unread : ''}`}>
                {n.unread && <span className={styles.unreadDot} />}
                <div className={styles.avatarWrap}>
                  <Avatar name={n.who} size={32} />
                  <div className={styles.iconBadge} style={{ background: ic.b, color: ic.c }}>
                    {ic.i}
                  </div>
                </div>
                <div className={styles.info}>
                  <div className={styles.row}>
                    <span className={styles.who}>{n.who}</span>{' '}
                    <span className={styles.text}>{n.text}</span>
                  </div>
                  <div className={styles.target}>
                    {n.mention && <span className={styles.mention}>@Иван</span>}
                    {n.target}
                  </div>
                  <div className={styles.time}>{n.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
