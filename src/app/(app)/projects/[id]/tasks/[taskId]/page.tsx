import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { I } from '@/components/icons/Icons';
import { CommentList } from '@/components/task/CommentList';
import { CollaborativeEditorLoader as CollaborativeEditor } from '@/components/task/CollaborativeEditorLoader';
import { TaskMetaPanel } from '@/components/task/TaskMetaPanel';
import { requireUser } from '@/lib/session';
import styles from './task.module.css';

export const metadata = { title: 'Задача — TaskFlow' };
export const dynamic = 'force-dynamic';

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id: projectId, taskId } = await params;
  const user = await requireUser();

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { include: { organization: { include: { members: { include: { user: true } } } } } },
      assignee: true,
      comments: { include: { author: true }, orderBy: { createdAt: 'asc' } },
      snapshots: { orderBy: { updatedAt: 'desc' }, take: 10 },
    },
  });
  if (!task || task.projectId !== projectId) notFound();

  const access = task.project.organization.members.find((m) => m.userId === user.id);
  if (!access) notFound();

  const members = task.project.organization.members.map((m) => ({ id: m.user.id, name: m.user.name }));

  const comments = task.comments.map((c) => ({
    id: c.id,
    author: c.author.name,
    text: c.content,
    timeLabel: c.createdAt.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));

  // Последний снимок (base64) — засеивает редактор, чтобы описание не терялось
  // после рестарта сервера y-websocket.
  const initialSnapshot = task.snapshots[0]
    ? Buffer.from(task.snapshots[0].snapshot).toString('base64')
    : null;

  // Версии — реальные снимки Yjs из БД (последние 10).
  const versions = task.snapshots.map((s) => ({
    id: s.id,
    author: 'Автосохранение',
    timeLabel: s.updatedAt.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
    summary: 'Снимок CRDT-документа задачи',
  }));

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <div className={styles.crumbs}>
          <Link href="/projects">Проекты</Link>
          <I.ChevronRight size={12} stroke="#8B939C" />
          <Link href={`/projects/${projectId}`}>{task.project.name}</Link>
          <I.ChevronRight size={12} stroke="#8B939C" />
          <span className={styles.taskId}>ЗАД-{taskId.slice(-4).toUpperCase()}</span>
        </div>

        <div className={styles.banner}>
          <div className={styles.bannerText}>
            <span className={styles.pulse} />
            <span>
              <b>Совместное редактирование</b> — изменения других участников появятся здесь автоматически
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <div className={styles.bannerHint}>
            <I.Cursor size={12} stroke="#5B6670" />в реальном времени (Yjs CRDT)
          </div>
        </div>

        <h1 className={styles.title}>{task.title}</h1>

        <div className={styles.sectionLabel}>Описание</div>
        <CollaborativeEditor
          taskId={task.id}
          user={{ id: user.id, name: user.name ?? user.email }}
          initialSnapshot={initialSnapshot}
          versions={versions}
        />

        <div className={styles.sectionLabel} style={{ marginTop: 22 }}>
          Комментарии
        </div>
        <CommentList taskId={task.id} currentUser={user.name ?? user.email} initialComments={comments} />
      </div>

      <aside className={styles.aside}>
        <div className={styles.sectionLabel}>Информация</div>
        <TaskMetaPanel
          taskId={task.id}
          status={task.status}
          priority={task.priority}
          assigneeId={task.assigneeId}
          dueDate={task.dueDate}
          members={members}
        />

        <div className={styles.divider} />

        <div className={styles.sectionLabel}>История версий</div>
        <div style={{ color: '#8B939C', fontSize: 13, padding: '8px 0' }}>
          {versions.length === 0
            ? 'Снимки появляются автоматически при редактировании описания.'
            : `Версий: ${versions.length}. Список и откат — под описанием задачи.`}
        </div>
      </aside>
    </div>
  );
}
