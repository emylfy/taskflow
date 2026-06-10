import * as React from 'react';
import Link from 'next/link';
import { I } from '@/components/icons/Icons';
import { Avatar } from '@/components/ui/Avatar';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getActivePlan } from '@/lib/plan-limits';
import { withTargetLabels } from '@/lib/activity-labels';
import styles from './admin.module.css';

export const metadata = { title: 'Администрирование — TaskFlow' };
export const dynamic = 'force-dynamic';

const ACTION_LABEL: Record<string, string> = {
  'project.create': 'создал(а) проект',
  'project.delete': 'удалил(а) проект',
  'task.create': 'создал(а) задачу',
  'task.delete': 'удалил(а) задачу',
  'task.assignee.change': 'изменил(а) исполнителя',
  'task.status.todo': 'вернул(а) задачу в «Сделать»',
  'task.status.in_progress': 'взял(а) задачу в работу',
  'task.status.in_review': 'отправил(а) задачу на проверку',
  'task.status.done': 'завершил(а) задачу',
  'member.invite': 'пригласил(а) участника',
  'member.role.change': 'изменил(а) роль участника',
  'member.remove': 'удалил(а) участника',
  'subscription.checkout': 'оформил(а) оплату подписки',
  'subscription.payment.succeeded': 'оплатил(а) подписку',
  'subscription.activate.free': 'активировал(а) бесплатный тариф',
  'organization.create': 'создал(а) организацию',
};

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

export default async function AdminDashboardPage() {
  const user = await requireUser();
  const member = await prisma.member.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  });
  if (!member) throw new Error('Вы не состоите ни в одной организации');

  const orgId = member.organizationId;
  const orgName = member.organization.name;
  const active = await getActivePlan(orgId);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [members, projects, tasksThisWeek, tasksLastWeek, completedThisWeek, recentLogsRaw] = await Promise.all([
    prisma.member.count({ where: { organizationId: orgId } }),
    prisma.project.count({ where: { organizationId: orgId } }),
    prisma.task.count({
      where: { project: { organizationId: orgId }, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.task.count({
      where: {
        project: { organizationId: orgId },
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
    }),
    prisma.task.count({
      where: {
        project: { organizationId: orgId },
        status: 'DONE',
        updatedAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.activityLog.findMany({
      where: { organizationId: orgId },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  // Подставляем название объекта к записям журнала (вместо литерала «task»).
  const recentLogs = await withTargetLabels(recentLogsRaw);

  const tasksDelta = tasksThisWeek - tasksLastWeek;
  const planName = active?.planName ?? 'Бесплатный';
  const memberLimit = active?.features.limits.maxMembers ?? -1;
  const projectLimit = active?.features.limits.maxProjects ?? -1;

  // Простой график: считаем созданные задачи за последние 30 дней.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentTasks = await prisma.task.findMany({
    where: { project: { organizationId: orgId }, createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const dayBuckets = new Array(30).fill(0) as number[];
  for (const t of recentTasks) {
    const dayIdx = Math.floor((t.createdAt.getTime() - since.getTime()) / (24 * 60 * 60 * 1000));
    if (dayIdx >= 0 && dayIdx < 30) dayBuckets[dayIdx]++;
  }
  const mx = Math.max(1, ...dayBuckets);
  const mn = 0;
  const pts = dayBuckets
    .map((v, i) => `${(i / Math.max(1, dayBuckets.length - 1)) * 100},${100 - ((v - mn) / (mx - mn || 1)) * 90 - 5}`)
    .join(' ');

  return (
    <div className={styles.main}>
      <h1>Администрирование TaskFlow</h1>
      <p className={styles.lead}>
        Организация «{orgName}» · Тариф «{planName}»
        {active && active.features.limits.maxProjects !== -1 ? null : ' · без лимитов'}
      </p>

      <div className={styles.metrics}>
        <Metric
          icon={<I.Users size={16} />}
          label="Активных участников"
          value={String(members)}
          delta={memberLimit === -1 ? 'без ограничений' : `из ${memberLimit} мест по тарифу`}
          color="#2B5FA4"
        />
        <Metric
          icon={<I.Folder size={16} />}
          label="Проектов"
          value={String(projects)}
          delta={projectLimit === -1 ? 'без ограничений' : `из ${projectLimit} по тарифу`}
          color="#2E7D3E"
        />
        <Metric
          icon={<I.CheckCircle size={16} />}
          label="Задач за неделю"
          value={String(tasksThisWeek)}
          delta={tasksDelta >= 0 ? `+${tasksDelta} к прошлой` : `${tasksDelta} к прошлой`}
          color="#8A6A12"
        />
        <Metric
          icon={<I.Archive size={16} />}
          label="Завершено за неделю"
          value={String(completedThisWeek)}
          delta="по статусу DONE"
          color="#7B3F6B"
        />
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.cardTitle}>Создание задач за 30 дней</div>
              <div className={styles.cardSub}>Количество созданных задач по дням</div>
            </div>
            <div style={{ flex: 1 }} />
            <div className={styles.legend}>
              <span>
                <span className={styles.legendLine} style={{ background: '#2B5FA4' }} />
                Создано
              </span>
            </div>
          </div>
          <div className={styles.chart}>
            <svg width="100%" height="220" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gd" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#2B5FA4" stopOpacity="0.22" />
                  <stop offset="1" stopColor="#2B5FA4" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={`0,100 ${pts} 100,100`} fill="url(#gd)" />
              <polyline
                points={pts}
                fill="none"
                stroke="#2B5FA4"
                strokeWidth="0.6"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className={styles.chartX}>
              <span>30 дней назад</span>
              <span>сегодня</span>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div className={styles.cardTitle}>Последние действия</div>
            <div style={{ flex: 1 }} />
            <Link href="/admin/journal" className={styles.link}>
              Журнал →
            </Link>
          </div>
          <div className={styles.logs}>
            {recentLogs.length === 0 ? (
              <div style={{ color: '#5B6670', padding: 16 }}>Пока нет записей в журнале действий.</div>
            ) : null}
            {recentLogs.map((l) => (
              <div key={l.id} className={styles.log}>
                <Avatar name={l.actor.name} size={26} />
                <div className={styles.logInfo}>
                  <div className={styles.logTop}>
                    <span className={styles.logWho}>{l.actor.name}</span>{' '}
                    <span className={styles.logAction}>{ACTION_LABEL[l.action] ?? l.action}</span>
                  </div>
                  <div className={styles.logTarget}>{l.targetLabel ?? l.targetType}</div>
                </div>
                <div className={styles.logTime}>{formatRelative(l.createdAt)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  delta,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  color: string;
}) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricHead}>
        <div className={styles.metricIcon} style={{ background: color + '1a', color }}>
          {icon}
        </div>
        <div className={styles.metricLabel}>{label}</div>
      </div>
      <div className={styles.metricValue}>{value}</div>
      <div className={styles.metricDelta}>
        <I.TrendUp size={13} stroke="#2E7D3E" />
        {delta}
      </div>
    </div>
  );
}
