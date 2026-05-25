import * as React from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getActivePlan } from '@/lib/plan-limits';
import { InviteForm } from './InviteForm';
import { RoleSelect, RemoveButton } from './RoleSelect';
import styles from './members.module.css';

export const metadata = { title: 'Участники — TaskFlow' };
export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const user = await requireUser();
  const myMember = await prisma.member.findFirst({ where: { userId: user.id } });
  if (!myMember) throw new Error('Нет организации');

  const orgId = myMember.organizationId;
  const isAdmin = myMember.role === 'OWNER' || myMember.role === 'ADMIN';

  const [members, active] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    }),
    getActivePlan(orgId),
  ]);

  const planName = active?.planName ?? 'Бесплатный';
  const memberLimit = active?.features.limits.maxMembers ?? -1;

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
          <div>Email</div>
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
              <div className={styles.cellText}>{m.user.email}</div>
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
    </div>
  );
}
