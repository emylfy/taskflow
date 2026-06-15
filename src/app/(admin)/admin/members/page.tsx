import * as React from 'react';
import { redirect } from 'next/navigation';
import { I } from '@/components/icons/Icons';
import { Avatar } from '@/components/ui/Avatar';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getActivePlan } from '@/lib/plan-limits';
import { InviteForm } from './InviteForm';
import { RoleSelect, RemoveButton } from './RoleSelect';
import styles from './members.module.css';

export const metadata = { title: 'Участники — TaskFlow' };
export const dynamic = 'force-dynamic';

function relTime(d: Date): string {
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} дн назад`;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

export default async function MembersPage() {
  const user = await requireUser();
  const myMember = await prisma.member.findFirst({ where: { userId: user.id } });
  if (!myMember) redirect('/onboarding');

  const orgId = myMember.organizationId;
  const isAdmin = myMember.role === 'OWNER' || myMember.role === 'ADMIN';

  const [members, active, subscription, projectCount, recentLogs] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    }),
    getActivePlan(orgId),
    prisma.subscription.findFirst({
      where: { organizationId: orgId, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { expiresAt: 'desc' },
    }),
    prisma.project.count({ where: { organizationId: orgId } }),
    prisma.activityLog.findMany({
      where: { organizationId: orgId },
      select: { actorId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const planName = active?.planName ?? 'Бесплатный';
  const memberLimit = active?.features.limits.maxMembers ?? -1;
  const projectLimit = active?.features.limits.maxProjects ?? -1;
  const priceRub = subscription?.plan.priceRub ?? 0;

  // Последняя активность по каждому пользователю — из журнала действий.
  const lastActivity = new Map<string, Date>();
  for (const l of recentLogs) if (!lastActivity.has(l.actorId)) lastActivity.set(l.actorId, l.createdAt);

  return (
    <div className={styles.main}>
      <div className={styles.head}>
        <div>
          <h1>Участники и подписка</h1>
          <p className={styles.sub}>
            {members.length} участников
            {memberLimit === -1
              ? ` · без лимита по тарифу «${planName}»`
              : ` · занято ${members.length} из ${memberLimit} мест по тарифу «${planName}»`}
          </p>
        </div>
        <div style={{ flex: 1 }} />
      </div>

      {isAdmin ? (
        <div style={{ marginBottom: 24 }}>
          <InviteForm organizationId={orgId} />
        </div>
      ) : null}

      <div className={styles.table}>
        <div className={styles.tableHead}>
          <div>Участник</div>
          <div>Роль</div>
          <div>Присоединился</div>
          <div>Активность</div>
          <div />
        </div>
        {members.map((m) => {
          const isYou = m.user.id === user.id;
          return (
            <div key={m.id} className={styles.row}>
              <div className={styles.memberCell}>
                <Avatar name={m.user.name} size={32} />
                <div className={styles.memberInfo}>
                  <div className={styles.memberName}>
                    {m.user.name}
                    {isYou ? <span className={styles.badgeYou}>ВЫ</span> : null}
                  </div>
                  <div className={styles.memberEmail}>{m.user.email}</div>
                </div>
              </div>
              <div>
                {isAdmin ? (
                  <RoleSelect memberId={m.id} role={m.role} isOwner={m.role === 'OWNER'} isCurrentUser={isYou} />
                ) : (
                  <span style={{ color: '#5B6670' }}>{m.role}</span>
                )}
              </div>
              <div className={styles.cellText}>
                {m.joinedAt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div className={styles.cellText}>
                {lastActivity.has(m.user.id) ? relTime(lastActivity.get(m.user.id)!) : 'нет активности'}
              </div>
              <div>
                {isAdmin ? (
                  <RemoveButton
                    memberId={m.id}
                    memberName={m.user.name}
                    isOwner={m.role === 'OWNER'}
                    isCurrentUser={isYou}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.subSection}>
        <div className={styles.subHead}>Подписка</div>
        <div className={styles.subGrid}>
          <div className={styles.subCard}>
            <div className={styles.subLabel}>Текущий тариф</div>
            <div className={styles.subValueRow}>
              <span className={styles.subPlan}>{planName}</span>
              {subscription ? <span className={styles.subActive}>АКТИВЕН</span> : null}
            </div>
            <div className={styles.subPrice}>
              {priceRub === 0 ? 'Бесплатно' : `${priceRub.toLocaleString('ru-RU')} ₽ в месяц`}
            </div>
          </div>
          <div className={styles.subCard}>
            <div className={styles.subLabel}>Мест использовано</div>
            <div className={styles.subBig}>
              {members.length}
              {memberLimit === -1 ? '' : ` / ${memberLimit}`}
            </div>
            <div className={styles.subMeta}>
              {memberLimit === -1 ? 'без лимита' : `${Math.max(0, memberLimit - members.length)} свободно`}
            </div>
          </div>
          <div className={styles.subCard}>
            <div className={styles.subLabel}>Проектов</div>
            <div className={styles.subBig}>
              {projectCount}
              {projectLimit === -1 ? '' : ` / ${projectLimit}`}
            </div>
            <div className={styles.subMeta}>{projectLimit === -1 ? 'без лимита' : 'по тарифу'}</div>
          </div>
          <div className={styles.subCard}>
            <div className={styles.subLabel}>Способ оплаты</div>
            <div className={styles.subValueRow}>
              <span className={styles.subPlan} style={{ fontSize: 16 }}>ЮKassa</span>
            </div>
            <div className={styles.subMeta}>Автосписание ежемесячно</div>
          </div>
        </div>
        {subscription ? (
          <div className={styles.nextPay}>
            <div className={styles.nextPayIcon}>
              <I.Shield size={18} />
            </div>
            <div>
              <div className={styles.nextPayTitle}>Следующий платёж</div>
              <div className={styles.nextPayMeta}>
                {subscription.expiresAt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}
                {priceRub === 0 ? '' : ` · ${priceRub.toLocaleString('ru-RU')} ₽`}
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <a href="/admin/billing" className={styles.nextPayLink}>Управление →</a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
