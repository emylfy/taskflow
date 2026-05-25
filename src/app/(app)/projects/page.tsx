import * as React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { I } from '@/components/icons/Icons';
import { Button } from '@/components/ui/Button';
import { ProjectIcon } from '@/components/ui/ProjectIcon';
import { AvatarStack } from '@/components/ui/AvatarStack';
import { requireUser } from '@/lib/session';
import { ensureOwnerOrganization } from '@/server/actions/organizations';
import styles from './projects.module.css';

export const metadata = { title: 'Проекты — TaskFlow' };
export const dynamic = 'force-dynamic';

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const orgParam = typeof sp.org === 'string' ? sp.org : undefined;
  const nameParam = typeof sp.name === 'string' ? sp.name : undefined;
  const planIdParam = typeof sp.planId === 'string' ? sp.planId : undefined;

  const user = await requireUser();

  // Если у пользователя ещё нет организации, но в URL пришли параметры
  // регистрации — создаём организацию и делаем его OWNER. Это покрывает
  // флоу из RegisterForm: после magic-link redirect ведёт сюда.
  let memberships = await prisma.member.findMany({
    where: { userId: user.id },
    select: { organizationId: true },
  });
  if (memberships.length === 0 && orgParam) {
    await ensureOwnerOrganization({ orgName: orgParam, userName: nameParam });
    memberships = await prisma.member.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    // Если в URL также передан planId платного тарифа — отправляем сразу
    // в /admin/billing, чтобы оформить оплату.
    if (planIdParam) {
      redirect(`/admin/billing?focus=${encodeURIComponent(planIdParam)}`);
    }
  }

  const orgIds = memberships.map((m) => m.organizationId);

  const rows = orgIds.length
    ? await prisma.project.findMany({
        where: { organizationId: { in: orgIds } },
        include: {
          tasks: { select: { status: true } },
          organization: { include: { members: { include: { user: true } }, _count: { select: { members: true } } } },
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: 'asc' },
      })
    : [];

  // Считаем количество комментариев батчем по всем задачам видимых проектов.
  const projectIds = rows.map((p) => p.id);
  const commentCounts = projectIds.length
    ? await prisma.comment.groupBy({
        by: ['taskId'],
        where: { task: { projectId: { in: projectIds } } },
        _count: true,
      })
    : [];
  // Преобразуем в карту projectId → суммарное число комментариев.
  const taskToProject = new Map<string, string>();
  if (projectIds.length) {
    const tasks = await prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true, projectId: true },
    });
    for (const t of tasks) taskToProject.set(t.id, t.projectId);
  }
  const projectComments = new Map<string, number>();
  for (const c of commentCounts) {
    const pid = taskToProject.get(c.taskId);
    if (!pid) continue;
    projectComments.set(pid, (projectComments.get(pid) ?? 0) + (c._count as unknown as number));
  }

  const projects = rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? '',
    tasks: {
      total: p.tasks.length,
      done: p.tasks.filter((t) => t.status === 'DONE').length,
    },
    members: p.organization.members.map((m) => m.user.name).slice(0, 5),
    membersCount: p.organization._count.members,
    comments: projectComments.get(p.id) ?? 0,
  }));

  // Берём первую организацию пользователя для кнопки «Новый проект».
  const primaryOrgId = orgIds[0] ?? null;

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1>Проекты</h1>
          <div className={styles.sub}>{projects.length} проектов · обновлено сегодня</div>
        </div>
        <div style={{ flex: 1 }} />
        <div className={styles.actions}>
          {primaryOrgId ? (
            <Link href={`/projects/new?orgId=${primaryOrgId}`}>
              <Button variant="primary" leading={<I.Plus size={15} stroke="#fff" />}>
                Новый проект
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {projects.length === 0 ? (
        <div style={{ padding: 32, color: '#5B6670', textAlign: 'center' }}>
          У вас пока нет проектов. Нажмите «Новый проект», чтобы создать первый.
        </div>
      ) : null}

      <div className={styles.grid}>
        {projects.map((p) => {
          const pct = p.tasks.total === 0 ? 0 : Math.round((p.tasks.done / p.tasks.total) * 100);
          return (
            <Link key={p.id} href={`/projects/${p.id}`} className={styles.card}>
              <div className={styles.cardHead}>
                <ProjectIcon name={p.name} size={40} />
                <div className={styles.cardTitleWrap}>
                  <div className={styles.cardTitle}>{p.name}</div>
                  <div className={styles.cardActive}>
                    <span className={styles.cardActiveDot} />
                    {p.tasks.total} задач
                  </div>
                </div>
              </div>
              <p className={styles.cardDesc}>{p.description}</p>
              <div className={styles.progressRow}>
                <div className={styles.progressText}>
                  {p.tasks.done} из {p.tasks.total}
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                </div>
                <div className={styles.progressPct}>{pct}%</div>
              </div>
              <div className={styles.cardFoot}>
                <AvatarStack names={p.members} size={24} max={4} />
                <div style={{ flex: 1 }} />
                <span className={styles.cardComments}>
                  <I.Message size={14} stroke="#8B939C" />
                  {p.comments}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
