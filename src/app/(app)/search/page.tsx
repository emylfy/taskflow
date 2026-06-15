import * as React from 'react';
import Link from 'next/link';
import { I } from '@/components/icons/Icons';
import { Avatar } from '@/components/ui/Avatar';
import { ProjectIcon } from '@/components/ui/ProjectIcon';
import { StatusPill } from '@/components/ui/Badge';
import type { StatusKey } from '@/components/ui/Badge';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import type { TaskStatus } from '@prisma/client';
import styles from './search.module.css';

export const metadata = { title: 'Поиск — TaskFlow' };
export const dynamic = 'force-dynamic';

const STATUS_KEY: Record<TaskStatus, StatusKey> = {
  TODO: 'todo',
  IN_PROGRESS: 'doing',
  IN_REVIEW: 'review',
  DONE: 'done',
};

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className={styles.hl}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = (typeof sp.q === 'string' ? sp.q : '').trim();

  // Узнаём организации пользователя — поиск ограничен ими.
  const memberships = await prisma.member.findMany({
    where: { userId: user.id },
    select: { organizationId: true, organization: { select: { name: true } } },
  });
  const orgIds = memberships.map((m) => m.organizationId);
  const orgName = memberships[0]?.organization.name ?? 'TaskFlow';

  let tasks: Awaited<ReturnType<typeof findTasks>> = [];
  let projects: Awaited<ReturnType<typeof findProjects>> = [];
  let people: Awaited<ReturnType<typeof findPeople>> = [];
  let comments: Awaited<ReturnType<typeof findComments>> = [];

  async function findTasks() {
    if (!q || orgIds.length === 0) return [];
    return prisma.task.findMany({
      where: {
        project: { organizationId: { in: orgIds } },
        title: { contains: q, mode: 'insensitive' },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
      take: 10,
    });
  }
  async function findProjects() {
    if (!q || orgIds.length === 0) return [];
    return prisma.project.findMany({
      where: {
        organizationId: { in: orgIds },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { _count: { select: { tasks: true } } },
      take: 10,
    });
  }
  async function findPeople() {
    if (!q || orgIds.length === 0) return [];
    return prisma.user.findMany({
      where: {
        members: { some: { organizationId: { in: orgIds } } },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, email: true },
      take: 10,
    });
  }
  async function findComments() {
    if (!q || orgIds.length === 0) return [];
    return prisma.comment.findMany({
      where: {
        task: { project: { organizationId: { in: orgIds } } },
        content: { contains: q, mode: 'insensitive' },
      },
      include: {
        author: { select: { name: true } },
        task: { select: { id: true, title: true, projectId: true } },
      },
      take: 10,
    });
  }

  if (q) {
    [tasks, projects, people, comments] = await Promise.all([
      findTasks(),
      findProjects(),
      findPeople(),
      findComments(),
    ]);
  }

  const totalFound = tasks.length + projects.length + people.length + comments.length;
  // Первый результат подсвечиваем как активный (как в command-palette).
  const firstId = tasks[0]?.id ?? projects[0]?.id ?? people[0]?.id ?? comments[0]?.id ?? null;

  return (
    <div className={styles.page}>
      <div className={styles.modal}>
        <form className={styles.input} action="/search" method="get">
          <I.Search size={20} stroke="#5B6670" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Поиск по задачам, проектам, участникам…"
            autoFocus
          />
        </form>
        <div className={styles.results}>
          {!q ? (
            <div style={{ padding: 24, color: '#5B6670' }}>
              Введите запрос — найдём задачи, проекты и участников вашей организации.
            </div>
          ) : null}

          {q && totalFound === 0 ? (
            <div style={{ padding: 24, color: '#5B6670' }}>
              Ничего не найдено по запросу «{q}». Попробуйте другую формулировку.
            </div>
          ) : null}

          {tasks.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupHead}>
                <span>Задачи</span>
                <span className={styles.groupCount}>· {tasks.length}</span>
              </div>
              {tasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/projects/${t.projectId}/tasks/${t.id}`}
                  className={`${styles.row} ${t.id === firstId ? styles.rowActive : ''}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <I.CheckCircle size={16} stroke="#5B6670" />
                  <div className={styles.rowInfo}>
                    <div className={styles.rowTitle}>{highlight(t.title, q)}</div>
                    <div className={styles.rowSub}>
                      {t.project.name} {t.assignee ? `· ${t.assignee.name}` : ''}
                    </div>
                  </div>
                  <StatusPill status={STATUS_KEY[t.status]} size="sm" />
                </Link>
              ))}
            </div>
          )}

          {projects.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupHead}>
                <span>Проекты</span>
                <span className={styles.groupCount}>· {projects.length}</span>
              </div>
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className={`${styles.row} ${p.id === firstId ? styles.rowActive : ''}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <ProjectIcon name={p.name} size={22} />
                  <div className={styles.rowInfo}>
                    <div className={styles.rowTitle}>{highlight(p.name, q)}</div>
                    <div className={styles.rowSub}>{p._count.tasks} задач</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {people.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupHead}>
                <span>Участники</span>
                <span className={styles.groupCount}>· {people.length}</span>
              </div>
              {people.map((u) => (
                <div key={u.id} className={`${styles.row} ${u.id === firstId ? styles.rowActive : ''}`}>
                  <Avatar name={u.name} size={24} />
                  <div className={styles.rowInfo}>
                    <div className={styles.rowTitle}>{highlight(u.name, q)}</div>
                    <div className={styles.rowSub}>{u.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {comments.length > 0 && (
            <div className={styles.group}>
              <div className={styles.groupHead}>
                <span>Комментарии</span>
                <span className={styles.groupCount}>· {comments.length}</span>
              </div>
              {comments.map((c) => (
                <Link
                  key={c.id}
                  href={`/projects/${c.task.projectId}/tasks/${c.task.id}`}
                  className={`${styles.row} ${c.id === firstId ? styles.rowActive : ''}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <I.Message size={16} stroke="#5B6670" />
                  <div className={styles.rowInfo}>
                    <div className={styles.rowTitle}>{highlight(c.content, q)}</div>
                    <div className={styles.rowSub}>
                      {c.author.name} · {c.task.title}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className={styles.foot}>
          <span>Поиск по организации «{orgName}»</span>
        </div>
      </div>
    </div>
  );
}
