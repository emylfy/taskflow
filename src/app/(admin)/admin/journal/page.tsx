import * as React from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { I } from '@/components/icons/Icons';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getActivePlan } from '@/lib/plan-limits';
import { listActivityLogs } from '@/server/actions/audit';
import styles from './journal.module.css';

export const metadata = { title: 'Журнал действий — TaskFlow' };
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

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const filterAction = typeof sp.action === 'string' ? sp.action : undefined;
  const filterActorId = typeof sp.actor === 'string' ? sp.actor : undefined;

  const member = await prisma.member.findFirst({ where: { userId: user.id } });
  if (!member) throw new Error('Нет организации');
  const orgId = member.organizationId;

  const [logs, plan, members] = await Promise.all([
    listActivityLogs(orgId, { action: filterAction, actorId: filterActorId }, 200),
    getActivePlan(orgId),
    prisma.member.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  const canExport = !!plan?.features.flags.auditExport;
  const planName = plan?.planName ?? 'Бесплатный';

  // Список уникальных action-кодов в журнале — для селекта фильтра.
  const uniqueActions = Array.from(new Set(logs.map((l) => l.action))).sort();

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1>Журнал действий</h1>
          <p className={styles.sub}>
            Все события организации — для compliance и аудита (152-ФЗ).
            Тариф: <b>«{planName}»</b>.
          </p>
        </div>
        <div style={{ flex: 1 }} />
        {canExport ? (
          <a href={`/admin/journal/export.csv?org=${orgId}`} download>
            <Button variant="primary" leading={<I.Archive size={14} stroke="#fff" />}>
              Экспорт CSV
            </Button>
          </a>
        ) : (
          <div className={styles.exportLock} title="Доступно на тарифе «Бизнес»">
            <I.Shield size={14} stroke="#8B939C" />
            Экспорт CSV — на тарифе «Бизнес»
            <Link href="/admin/billing" className={styles.upgradeLink}>
              Сменить тариф
            </Link>
          </div>
        )}
      </div>

      <form className={styles.filters} action="/admin/journal" method="get">
        <label>
          <span className={styles.filterLabel}>Действие</span>
          <select name="action" defaultValue={filterAction ?? ''} className={styles.select}>
            <option value="">— все —</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABEL[a] ?? a}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={styles.filterLabel}>Участник</span>
          <select name="actor" defaultValue={filterActorId ?? ''} className={styles.select}>
            <option value="">— все —</option>
            {members.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="secondary" size="sm">
          Применить
        </Button>
        {(filterAction || filterActorId) && (
          <Link href="/admin/journal" className={styles.resetLink}>
            Сбросить фильтры
          </Link>
        )}
      </form>

      <div className={styles.table}>
        <div className={styles.tableHead}>
          <div>Время</div>
          <div>Участник</div>
          <div>Действие</div>
          <div>Объект</div>
        </div>
        {logs.length === 0 ? (
          <div className={styles.empty}>Записей не найдено по выбранным фильтрам.</div>
        ) : null}
        {logs.map((l) => (
          <div key={l.id} className={styles.row}>
            <div className={styles.cellTime}>
              {l.createdAt.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className={styles.cellActor}>
              <Avatar name={l.actor.name} size={24} />
              <span>{l.actor.name}</span>
            </div>
            <div className={styles.cellAction}>{ACTION_LABEL[l.action] ?? l.action}</div>
            <div className={styles.cellTarget}>
              <span className={styles.targetType}>{l.targetType}</span>
              <span className={styles.targetId}>{l.targetId.slice(0, 12)}…</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
