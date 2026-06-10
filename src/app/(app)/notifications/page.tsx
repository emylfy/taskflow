import * as React from 'react';
import Link from 'next/link';
import { I } from '@/components/icons/Icons';
import { Avatar } from '@/components/ui/Avatar';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import {
  listNotifications,
  getCounts,
  markAllAsRead,
  markAsRead,
  type NotificationFilter,
} from '@/server/actions/notifications';
import styles from './notifications.module.css';

export const metadata = { title: 'Уведомления — TaskFlow' };
export const dynamic = 'force-dynamic';

type IconKey = 'comment' | 'assigned' | 'review' | 'done' | 'edit' | 'status' | 'invite' | 'subscription';

const ICON_MAP: Record<IconKey, { i: React.ReactElement; c: string; b: string }> = {
  comment: { i: <I.Message size={14} />, c: '#2B5FA4', b: '#E8EEF7' },
  assigned: { i: <I.User size={14} />, c: '#2B5FA4', b: '#E8EEF7' },
  review: { i: <I.Eye size={14} />, c: '#8A6A12', b: '#FBF3DC' },
  done: { i: <I.Check size={14} />, c: '#2E7D3E', b: '#E4F2E6' },
  edit: { i: <I.Bold size={14} />, c: '#5B6670', b: '#EEF0F3' },
  status: { i: <I.Kanban size={14} />, c: '#5B6670', b: '#EEF0F3' },
  invite: { i: <I.User size={14} />, c: '#2E7D3E', b: '#E4F2E6' },
  subscription: { i: <I.Shield size={14} />, c: '#2E7D3E', b: '#E4F2E6' },
};

function iconFor(type: string): IconKey {
  if (type.startsWith('task.completed')) return 'done';
  if (type.startsWith('task.assigned')) return 'assigned';
  if (type.startsWith('task.status')) return 'status';
  if (type === 'mention' || type.includes('mention')) return 'comment';
  if (type.startsWith('member.invited')) return 'invite';
  if (type.startsWith('subscription')) return 'subscription';
  return 'edit';
}

function formatRelative(d: Date): string {
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} дн назад`;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

function describe(n: { type: string; payload: unknown }, projectsById: Map<string, string>, tasksById: Map<string, string>) {
  const p = (n.payload as Record<string, unknown>) ?? {};
  switch (n.type) {
    case 'task.assigned':
      return {
        action: 'назначил(а) вам задачу',
        target: tasksById.get(String(p.taskId ?? '')) ?? 'Задача',
        actor: String(p.by ?? 'Система'),
      };
    case 'task.completed':
      return {
        action: 'завершил(а) вашу задачу',
        target: tasksById.get(String(p.taskId ?? '')) ?? 'Задача',
        actor: String(p.by ?? 'Система'),
      };
    case 'mention':
    case 'comment.mention':
      return {
        action: 'упомянул(а) вас в комментарии',
        target: String(p.projectName ?? 'Проект'),
        actor: String(p.actor ?? 'Система'),
      };
    case 'member.invited':
      return {
        action: 'пригласил(а) вас в организацию',
        target: String(p.organizationName ?? 'Организация'),
        actor: String(p.invitedBy ?? 'Администратор'),
      };
    case 'member.role.changed':
      return {
        action: 'изменил(а) вашу роль на',
        target: String(p.role ?? 'роль'),
        actor: 'Администратор',
      };
    case 'member.removed':
      return { action: 'удалил(а) вас из организации', target: '', actor: 'Администратор' };
    case 'subscription.activated':
      return {
        action: 'тариф активирован',
        target: '',
        actor: 'TaskFlow',
      };
    default:
      return { action: n.type, target: '', actor: 'Система' };
  }
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const filter = ((typeof sp.filter === 'string' ? sp.filter : 'all') as NotificationFilter) ?? 'all';

  const [items, counts] = await Promise.all([listNotifications(filter), getCounts()]);

  // Достаём связанные данные одним батчем, чтобы не делать N+1.
  const taskIds = items.map((n) => (n.payload as { taskId?: string })?.taskId).filter(Boolean) as string[];
  const projectIds = items.map((n) => (n.payload as { projectId?: string })?.projectId).filter(Boolean) as string[];
  const [tasks, projects] = await Promise.all([
    taskIds.length
      ? prisma.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, title: true } })
      : Promise.resolve([]),
    projectIds.length
      ? prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);
  const tasksById = new Map(tasks.map((t) => [t.id, t.title]));
  const projectsById = new Map(projects.map((p) => [p.id, p.name]));

  const TABS: { key: NotificationFilter; t: string; n: number }[] = [
    { key: 'all', t: 'Все', n: counts.all },
    { key: 'unread', t: 'Непрочитанные', n: counts.unread },
    { key: 'mentions', t: 'Упоминания', n: counts.mentions },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.head}>
          <div className={styles.title}>Уведомления</div>
          <div style={{ flex: 1 }} />
          {counts.unread > 0 ? (
            <form action={markAllAsRead}>
              <button className={styles.readAll} type="submit">
                Отметить всё прочитанным
              </button>
            </form>
          ) : null}
        </div>
        <div className={styles.tabs}>
          {TABS.map((x) => (
            <Link
              key={x.key}
              href={`/notifications?filter=${x.key}`}
              className={`${styles.tab} ${filter === x.key ? styles.tabActive : ''}`}
            >
              {x.t}
              <span className={styles.tabCount}>{x.n}</span>
            </Link>
          ))}
        </div>
        <div className={styles.list}>
          {items.length === 0 ? (
            <div style={{ padding: 24, color: '#5B6670' }}>Нет уведомлений в выбранной категории.</div>
          ) : null}
          {items.map((n) => {
            const ic = ICON_MAP[iconFor(n.type)];
            const d = describe(n, projectsById, tasksById);
            const unread = !n.readAt;
            return (
              <form
                key={n.id}
                action={markAsRead.bind(null, n.id)}
                className={`${styles.item} ${unread ? styles.unread : ''}`}
                style={{ padding: 0 }}
              >
                <button
                  type="submit"
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    width: '100%',
                    padding: '14px 18px',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 0,
                    cursor: unread ? 'pointer' : 'default',
                  }}
                >
                  {unread && <span className={styles.unreadDot} />}
                  <div className={styles.avatarWrap}>
                    <Avatar name={d.actor} size={32} />
                    <div className={styles.iconBadge} style={{ background: ic.b, color: ic.c }}>
                      {ic.i}
                    </div>
                  </div>
                  <div className={styles.info}>
                    <div className={styles.row}>
                      <span className={styles.who}>{d.actor}</span>{' '}
                      <span className={styles.text}>{d.action}</span>
                    </div>
                    {d.target ? <div className={styles.target}>{d.target}</div> : null}
                    <div className={styles.time}>{formatRelative(n.createdAt)}</div>
                  </div>
                </button>
              </form>
            );
          })}
        </div>
      </div>
    </div>
  );
}
