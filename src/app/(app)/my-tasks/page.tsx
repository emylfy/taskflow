import * as React from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { ProjectIcon } from '@/components/ui/ProjectIcon';
import { StatusPill, PriorityBar } from '@/components/ui/Badge';
import type { StatusKey, PrioKey } from '@/components/ui/Badge';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { moveTask } from '@/server/actions/tasks';
import type { TaskStatus, Priority } from '@prisma/client';
import styles from './mytasks.module.css';

export const metadata = { title: 'Мои задачи — TaskFlow' };
export const dynamic = 'force-dynamic';

type Filter = 'all' | 'today' | 'week' | 'overdue' | 'done';

const STATUS_KEY: Record<TaskStatus, StatusKey> = {
  TODO: 'todo',
  IN_PROGRESS: 'doing',
  IN_REVIEW: 'review',
  DONE: 'done',
};

const PRIO_KEY: Record<Priority, PrioKey> = {
  LOW: 'low',
  MEDIUM: 'normal',
  HIGH: 'high',
  CRITICAL: 'urgent',
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function endOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const dayOfWeek = (x.getDay() + 6) % 7; // понедельник = 0
  x.setDate(x.getDate() + (6 - dayOfWeek));
  x.setHours(23, 59, 59, 999);
  return x;
}

function formatDue(d: Date | null): { label: string; overdue: boolean } {
  if (!d) return { label: 'без срока', overdue: false };
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return { label: 'Сегодня', overdue: false };
  if (diffDays === 1) return { label: 'Завтра', overdue: false };
  if (diffDays === -1) return { label: 'Вчера · просрочено', overdue: true };
  if (diffDays < 0) return { label: `просрочено на ${-diffDays} д.`, overdue: true };
  if (diffDays <= 7) {
    const wd = d.toLocaleDateString('ru-RU', { weekday: 'short' });
    const dm = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    return { label: `${wd}, ${dm}`, overdue: false };
  }
  return { label: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }), overdue: false };
}

export default async function MyTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const filter = ((typeof sp.filter === 'string' ? sp.filter : 'all') as Filter) ?? 'all';

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfWeek(now);

  // Базовая выборка: все задачи где assignee = текущий пользователь.
  const allRows = await prisma.task.findMany({
    where: { assigneeId: user.id, status: { not: 'DONE' } },
    include: { project: { select: { id: true, name: true } } },
    orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { priority: 'desc' }],
  });

  const counts = {
    all: allRows.length,
    today: allRows.filter((t) => t.dueDate && t.dueDate >= todayStart && t.dueDate <= todayEnd).length,
    week: allRows.filter((t) => t.dueDate && t.dueDate >= todayStart && t.dueDate <= weekEnd).length,
    overdue: allRows.filter((t) => t.dueDate && t.dueDate < todayStart).length,
  };

  let filtered = allRows;
  if (filter === 'today') {
    filtered = allRows.filter((t) => t.dueDate && t.dueDate >= todayStart && t.dueDate <= todayEnd);
  } else if (filter === 'week') {
    filtered = allRows.filter((t) => t.dueDate && t.dueDate >= todayStart && t.dueDate <= weekEnd);
  } else if (filter === 'overdue') {
    filtered = allRows.filter((t) => t.dueDate && t.dueDate < todayStart);
  }

  const completedThisMonth = await prisma.task.count({
    where: {
      assigneeId: user.id,
      status: 'DONE',
      updatedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
    },
  });

  // Завершённые задачи: в активных вкладках они скрыты (status ≠ DONE), поэтому
  // отдельной вкладкой «Завершённые» показываем последние закрытые задачи —
  // иначе их вообще негде увидеть списком (только в колонке «Готово» на доске).
  const doneRows = await prisma.task.findMany({
    where: { assigneeId: user.id, status: 'DONE' },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });
  const showDone = filter === 'done';
  const rows = showDone ? doneRows : filtered;

  const TABS: { key: Filter; t: string; n: number }[] = [
    { key: 'all', t: 'Все', n: counts.all },
    { key: 'today', t: 'Сегодня', n: counts.today },
    { key: 'week', t: 'На этой неделе', n: counts.week },
    { key: 'overdue', t: 'Просрочены', n: counts.overdue },
    { key: 'done', t: 'Завершённые', n: doneRows.length },
  ];

  // Server Action для отметки задачи выполненной.
  async function markDone(taskId: string) {
    'use server';
    await moveTask({ taskId, status: 'DONE', orderIndex: 0 });
  }

  // Возврат завершённой задачи в работу (со вкладки «Завершённые»).
  async function reopen(taskId: string) {
    'use server';
    await moveTask({ taskId, status: 'TODO', orderIndex: 0 });
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1>Мои задачи</h1>
          <div className={styles.sub}>
            {counts.all} активных · {counts.overdue} просрочены · {completedThisMonth} завершены за месяц
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/my-tasks?filter=${t.key}`}
            className={`${styles.tab} ${filter === t.key ? styles.tabActive : ''}`}
          >
            {t.t}
            <span className={`${styles.tabBadge} ${filter === t.key ? styles.tabBadgeActive : ''}`}>{t.n}</span>
          </Link>
        ))}
      </div>

      <div className={styles.list}>
        {rows.length === 0 ? (
          <div style={{ padding: 32, color: '#5B6670', textAlign: 'center' }}>
            {showDone ? 'Пока нет завершённых задач.' : 'В этой категории нет задач.'}
          </div>
        ) : null}
        {rows.map((t) => {
          const due = formatDue(t.dueDate);
          return (
            <div key={t.id} className={`${styles.row} ${!showDone && due.overdue ? styles.overdue : ''}`}>
              <form action={(showDone ? reopen : markDone).bind(null, t.id)}>
                <button
                  type="submit"
                  className={`${styles.check} ${showDone ? styles.checkOn : ''}`}
                  aria-label={showDone ? 'Вернуть в работу' : 'Отметить выполненной'}
                  title={showDone ? 'Вернуть в работу' : 'Отметить выполненной'}
                  style={{ cursor: 'pointer', padding: 0 }}
                />
              </form>
              <PriorityBar level={PRIO_KEY[t.priority]} thickness={3} />
              <div className={styles.titleWrap}>
                <Link
                  href={`/projects/${t.projectId}/tasks/${t.id}`}
                  className={styles.rowTitle}
                  style={{ textDecoration: showDone ? 'line-through' : 'none', color: showDone ? 'var(--text-3)' : 'inherit' }}
                >
                  {t.title}
                </Link>
              </div>
              <Link
                href={`/projects/${t.projectId}`}
                className={styles.project}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <ProjectIcon name={t.project.name} size={14} />
                {t.project.name}
              </Link>
              {t.labels.length > 0 ? <span className={styles.tag}>{t.labels[0]}</span> : null}
              <StatusPill status={STATUS_KEY[t.status]} size="sm" />
              <div className={`${styles.due} ${!showDone && due.overdue ? styles.dueOverdue : ''}`}>{showDone ? 'завершена' : due.label}</div>
              <Avatar name={user.name ?? user.email} size={24} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
