import * as React from 'react';
import { prisma } from '@/lib/prisma';
import { Board } from '@/components/kanban/Board';
import type { ColumnData } from '@/components/kanban/Column';
import type { PrioKey } from '@/components/ui/Badge';
import type { TaskStatus, Priority } from '@prisma/client';

export const metadata = { title: 'Канбан — TaskFlow' };

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
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

const DEMO_COLUMNS: ColumnData[] = [
  {
    id: 'TODO',
    title: 'Сделать',
    color: '#8B939C',
    tasks: [
      {
        id: 'demo-1',
        title: 'Согласовать техническое задание с заказчиком',
        priority: 'urgent',
        assignees: ['Иван Соколов', 'Мария Петрова'],
        tags: ['планирование'],
        dueLabel: 'Вчера',
        comments: 5,
        attachments: 2,
      },
      {
        id: 'demo-2',
        title: 'Обновить схему базы данных под отчёты',
        priority: 'normal',
        assignees: ['Сергей Николаев'],
        tags: ['архитектура', 'бэкенд'],
        dueLabel: '7 мая',
        comments: 1,
      },
    ],
  },
  {
    id: 'IN_PROGRESS',
    title: 'В работе',
    color: '#2B5FA4',
    tasks: [
      {
        id: 'demo-3',
        title: 'Подготовить макеты главной страницы',
        priority: 'high',
        assignees: ['Мария Петрова', 'Иван Соколов'],
        tags: ['дизайн'],
        dueLabel: 'Сегодня',
        comments: 8,
        attachments: 4,
      },
    ],
  },
  {
    id: 'IN_REVIEW',
    title: 'На проверке',
    color: '#D4A017',
    tasks: [
      {
        id: 'demo-4',
        title: 'Вёрстка страницы тарифов',
        priority: 'normal',
        assignees: ['Елена Куликова', 'Мария Петрова'],
        tags: ['вёрстка'],
        dueLabel: 'Сегодня',
        comments: 3,
      },
    ],
  },
  {
    id: 'DONE',
    title: 'Готово',
    color: '#2E7D3E',
    tasks: [
      {
        id: 'demo-5',
        title: 'Подключение ЮKassa: боевая среда',
        priority: 'normal',
        assignees: ['Сергей Николаев'],
        tags: ['платежи'],
        dueLabel: '3 мая',
        comments: 4,
      },
    ],
  },
];

export default async function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let columns: ColumnData[] = DEMO_COLUMNS;
  let projectName = 'Редизайн сайта';
  let taskCount = 48;
  let members: string[] = ['Иван Соколов', 'Мария Петрова', 'Сергей Николаев', 'Елена Куликова', 'Тимур Белов'];

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          include: { assignee: true },
          orderBy: [{ status: 'asc' }, { orderIndex: 'asc' }],
        },
        organization: { include: { members: { include: { user: true } } } },
      },
    });

    if (project) {
      projectName = project.name;
      taskCount = project.tasks.length;
      members = project.organization.members.map((m) => m.user.name);

      columns = COLUMN_MAP.map((cm) => ({
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
            comments: 0,
            attachments: 0,
          })),
      }));
    }
  } catch {
    // БД недоступна — остаются демо-данные.
  }

  return (
    <Board
      projectId={id}
      projectName={projectName}
      dueLabel="30 июня"
      taskCount={taskCount}
      members={members}
      initialColumns={columns}
    />
  );
}
