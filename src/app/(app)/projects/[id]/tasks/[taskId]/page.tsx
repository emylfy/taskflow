import * as React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { I } from '@/components/icons/Icons';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarStack } from '@/components/ui/AvatarStack';
import { StatusPill, Tag, PRIO_MAP } from '@/components/ui/Badge';
import { CommentList } from '@/components/task/CommentList';
import { VersionHistory } from '@/components/task/VersionHistory';
import { CollaborativeEditorLoader as CollaborativeEditor } from '@/components/task/CollaborativeEditorLoader';
import type { TaskStatus, Priority } from '@prisma/client';
import styles from './task.module.css';

export const metadata = { title: 'Задача — TaskFlow' };

const STATUS_MAP: Record<TaskStatus, 'todo' | 'doing' | 'review' | 'done'> = {
  TODO: 'todo',
  IN_PROGRESS: 'doing',
  IN_REVIEW: 'review',
  DONE: 'done',
};

const PRIO_LABEL: Record<Priority, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  CRITICAL: 'Срочный',
};

const DEMO_TASK = {
  id: 'demo-3',
  title: 'Подготовить макеты главной страницы',
  status: 'IN_PROGRESS' as TaskStatus,
  priority: 'HIGH' as Priority,
  projectName: 'Редизайн сайта',
  assignee: 'Мария Петрова',
  dueLabel: '15 мая 2026',
  comments: [
    {
      id: 'c1',
      author: 'Сергей Николаев',
      text: 'Ребята, давайте обсудим версию с тёмным hero до конца недели. Мне кажется, она лучше передаёт настроение.',
      timeLabel: 'вчера · 17:42',
    },
    {
      id: 'c2',
      author: 'Мария Петрова',
      text: 'Загрузила три варианта в Figma. В третьем поменяла порядок секций — сначала преимущества, потом тарифы.',
      timeLabel: 'сегодня · 09:14',
    },
    {
      id: 'c3',
      author: 'Иван Соколов',
      text: 'Да, в 15:00 созвон. @Мария Петрова, подключайся, пожалуйста.',
      timeLabel: 'сегодня · 11:20',
    },
  ],
  versions: [
    { id: 'v1', author: 'Мария Петрова', timeLabel: 'сегодня · 14:08', summary: 'Переписала требования к макетам и добавила пункт о разрешениях.' },
    { id: 'v2', author: 'Иван Соколов', timeLabel: 'сегодня · 11:20', summary: 'Добавил время созвона в описание.', current: true },
    { id: 'v3', author: 'Сергей Николаев', timeLabel: 'сегодня · 10:58', summary: 'Уточнил формулировку по палитре.', selected: true },
    { id: 'v4', author: 'Мария Петрова', timeLabel: 'вчера · 17:42', summary: 'Добавила список требований к результату.' },
    { id: 'v5', author: 'Иван Соколов', timeLabel: '28 апр · 11:24', summary: 'Создал задачу.' },
  ],
};

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id: projectId, taskId } = await params;

  let task = DEMO_TASK;
  let currentUser = 'Иван Соколов';

  try {
    const loaded = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: true,
        assignee: true,
        comments: { include: { author: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (loaded) {
      task = {
        id: loaded.id,
        title: loaded.title,
        status: loaded.status,
        priority: loaded.priority,
        projectName: loaded.project.name,
        assignee: loaded.assignee?.name ?? '—',
        dueLabel: loaded.dueDate
          ? loaded.dueDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
          : '—',
        comments: loaded.comments.map((c) => ({
          id: c.id,
          author: c.author.name,
          text: c.content,
          timeLabel: c.createdAt.toLocaleString('ru-RU'),
        })),
        versions: DEMO_TASK.versions,
      };
    }
  } catch {
    // Оставляем демо-данные для демонстрации UI при недоступной БД.
  }

  const statusKey = STATUS_MAP[task.status];

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <div className={styles.crumbs}>
          <Link href="/projects">Проекты</Link>
          <I.ChevronRight size={12} stroke="#8B939C" />
          <Link href={`/projects/${projectId}`}>{task.projectName}</Link>
          <I.ChevronRight size={12} stroke="#8B939C" />
          <span className={styles.taskId}>ЗАД-{taskId.slice(-4).toUpperCase()}</span>
        </div>

        <div className={styles.banner}>
          <AvatarStack names={['Иван Соколов', 'Мария Петрова', 'Сергей Николаев']} size={22} max={3} />
          <div className={styles.bannerText}>
            <span className={styles.pulse} />
            <span>
              <b>Иван, Мария и Сергей</b> редактируют сейчас
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <div className={styles.bannerHint}>
            <I.Cursor size={12} stroke="#5B6670" />в реальном времени
          </div>
        </div>

        <h1 className={styles.title}>{task.title}</h1>

        <div className={styles.sectionLabel}>Описание</div>
        <CollaborativeEditor taskId={task.id} user={{ id: 'current', name: currentUser }} />

        <div className={styles.sectionLabel} style={{ marginTop: 22 }}>
          Комментарии
        </div>
        <CommentList taskId={task.id} currentUser={currentUser} initialComments={task.comments} />
      </div>

      <aside className={styles.aside}>
        <div className={styles.sectionLabel}>Информация</div>
        <MetaRow label="Статус">
          <StatusPill status={statusKey} size="sm" />
        </MetaRow>
        <MetaRow label="Приоритет">
          <span className={styles.prioRow}>
            <span className={styles.prioDot} style={{ background: PRIO_MAP[prioKey(task.priority)].color }} />
            {PRIO_LABEL[task.priority]}
          </span>
        </MetaRow>
        <MetaRow label="Исполнитель">
          <span className={styles.assignee}>
            <Avatar name={task.assignee} size={22} />
            {task.assignee}
          </span>
        </MetaRow>
        <MetaRow label="Срок">
          <span className={styles.meta}>
            <I.Calendar size={13} stroke="#5B6670" />
            {task.dueLabel}
          </span>
        </MetaRow>
        <MetaRow label="Теги">
          <div className={styles.tags}>
            <Tag>дизайн</Tag>
            <Tag color="#FBF3DC" fg="#8A6A12">
              UI
            </Tag>
          </div>
        </MetaRow>

        <div className={styles.divider} />

        <div className={styles.sectionLabel}>История версий</div>
        <VersionHistory versions={task.versions} />
      </aside>
    </div>
  );
}

function prioKey(p: Priority) {
  return ({
    LOW: 'low',
    MEDIUM: 'normal',
    HIGH: 'high',
    CRITICAL: 'urgent',
  } as const)[p];
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.metaRow}>
      <div className={styles.metaLabel}>{label}</div>
      <div className={styles.metaValue}>{children}</div>
    </div>
  );
}
