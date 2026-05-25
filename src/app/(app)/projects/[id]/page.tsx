import * as React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Board } from '@/components/kanban/Board';
import type { ColumnData } from '@/components/kanban/Column';
import type { PrioKey } from '@/components/ui/Badge';
import type { TaskStatus, Priority } from '@prisma/client';
import { requireUser } from '@/lib/session';

export const metadata = { title: 'Канбан — TaskFlow' };
export const dynamic = 'force-dynamic';

const COLUMN_MAP: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'TODO', title: 'Сделать', color: '#8B939C' },
  { id: 'IN_PROGRESS', title: 'В работе', color: '#2B5FA4' },
  { id: 'IN_REVIEW', title: 'На проверке', color: '#D4A017' },
  { id: 'DONE', title: 'Готово', color: '#2E7D3E' },
];

const PRIORITY_TO_KEY: Record<Priority, PrioKey> = {
  LOW: 'low',
  MEDIUM: 'normal',
  HIGH: 'high',
  CRITICAL: 'urgent',
};

function formatDue(d: Date | null): string | null {
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Завтра';
  if (diffDays === -1) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export default async function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tasks: {
        include: {
          assignee: true,
          _count: { select: { comments: true } },
        },
        orderBy: [{ status: 'asc' }, { orderIndex: 'asc' }],
      },
      organization: { include: { members: { include: { user: true } } } },
    },
  });
  if (!project) notFound();

  const access = project.organization.members.find((m) => m.userId === user.id);
  if (!access) notFound();

  const projectName = project.name;
  const taskCount = project.tasks.length;
  const members = project.organization.members.map((m) => m.user.name);

  const columns: ColumnData[] = COLUMN_MAP.map((cm) => ({
    id: cm.id,
    title: cm.title,
    color: cm.color,
    tasks: project.tasks
      .filter((t) => t.status === cm.id)
      .map((t) => ({
        id: t.id,
        title: t.title,
        priority: PRIORITY_TO_KEY[t.priority],
        assignees: t.assignee ? [t.assignee.name] : [],
        tags: [],
        dueLabel: formatDue(t.dueDate),
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        comments: t._count.comments,
        attachments: 0,
      })),
  }));

  // Самая ближайшая открытая дедлайн-дата по проекту — для подзаголовка.
  const earliestOpenDue = project.tasks
    .filter((t) => t.status !== 'DONE' && t.dueDate)
    .map((t) => t.dueDate as Date)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const dueLabel = earliestOpenDue
    ? earliestOpenDue.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    : undefined;

  return (
    <Board
      projectId={id}
      projectName={projectName}
      dueLabel={dueLabel}
      taskCount={taskCount}
      members={members}
      initialColumns={columns}
    />
  );
}
