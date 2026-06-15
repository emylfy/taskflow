'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { assertCanInviteMember } from '@/lib/plan-limits';
import { sendEmail } from '@/lib/email';
import type { MemberRole } from '@prisma/client';

async function requireAdmin(userId: string, organizationId: string) {
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
    throw new Error('Требуются права администратора');
  }
  return member;
}

export async function inviteMember(input: { organizationId: string; email: string; role: MemberRole }) {
  const user = await requireUser();
  await requireAdmin(user.id, input.organizationId);

  const email = input.email.trim().toLowerCase();
  if (!/^.+@.+\..+$/.test(email)) {
    throw new Error('Некорректный email');
  }

  // Лимит участников проверяется до создания, но только если приглашение —
  // действительно новый Member (а не повторный апгрейд роли существующего).
  const alreadyMember = await prisma.member.findFirst({
    where: { organizationId: input.organizationId, user: { email } },
  });
  if (!alreadyMember) {
    await assertCanInviteMember(input.organizationId);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  let target = existing;
  if (!target) {
    target = await prisma.user.create({
      data: { email, name: email.split('@')[0] },
    });
  }

  // Статус для подсказки в форме: уже в команде / реально зарегистрирован /
  // приглашали ранее, но не входил / совсем новый. emailVerified=true значит,
  // что человек хотя бы раз входил (better-auth выставляет его при входе);
  // placeholder от прошлого приглашения остаётся с emailVerified=false.
  const inviteStatus = alreadyMember
    ? ('already' as const)
    : existing
      ? existing.emailVerified
        ? ('registered' as const)
        : ('pending' as const)
      : ('new' as const);

  const org = await prisma.organization.findUnique({ where: { id: input.organizationId } });
  const member = await prisma.member.upsert({
    where: { userId_organizationId: { userId: target.id, organizationId: input.organizationId } },
    create: { userId: target.id, organizationId: input.organizationId, role: input.role },
    update: { role: input.role },
  });

  await prisma.activityLog.create({
    data: {
      organizationId: input.organizationId,
      actorId: user.id,
      action: alreadyMember ? 'member.role.change' : 'member.invite',
      targetType: 'member',
      targetId: member.id,
    },
  });

  // Уведомление в системе.
  await prisma.notification.create({
    data: {
      userId: target.id,
      type: 'member.invited',
      payload: {
        organizationId: input.organizationId,
        organizationName: org?.name ?? '',
        invitedBy: user.name ?? user.email,
        role: input.role,
      },
    },
  });

  // Best-effort отправка приглашения по email. Если SMTP не настроен —
  // тихо логируем и продолжаем (Notification всё равно создан выше).
  const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
  await sendEmail({
    to: email,
    subject: `Вас пригласили в TaskFlow${org ? ` · ${org.name}` : ''}`,
    text:
      `Здравствуйте!\n\n` +
      `${user.name ?? user.email} пригласил(а) вас в организацию ` +
      `«${org?.name ?? 'TaskFlow'}» как ${input.role}.\n\n` +
      `Войдите по ссылке: ${baseUrl}/login\n` +
      `(используйте этот email — ${email} — для входа)\n\n` +
      `Команда TaskFlow`,
  });

  revalidatePath('/admin/members');
  return { member, status: inviteStatus };
}

export async function changeMemberRole(input: { memberId: string; role: MemberRole }) {
  const user = await requireUser();
  const member = await prisma.member.findUnique({ where: { id: input.memberId } });
  if (!member) throw new Error('Участник не найден');
  await requireAdmin(user.id, member.organizationId);
  if (member.role === 'OWNER' && input.role !== 'OWNER') {
    throw new Error('Нельзя понизить владельца. Сначала передайте роль владельца.');
  }

  const [updated] = await prisma.$transaction([
    prisma.member.update({ where: { id: input.memberId }, data: { role: input.role } }),
    prisma.activityLog.create({
      data: {
        organizationId: member.organizationId,
        actorId: user.id,
        action: 'member.role.change',
        targetType: 'member',
        targetId: member.id,
      },
    }),
    prisma.notification.create({
      data: {
        userId: member.userId,
        type: 'member.role.changed',
        payload: { organizationId: member.organizationId, role: input.role },
      },
    }),
  ]);
  revalidatePath('/admin/members');
  return updated;
}

export async function removeMember(memberId: string) {
  const user = await requireUser();
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw new Error('Участник не найден');
  await requireAdmin(user.id, member.organizationId);
  if (member.role === 'OWNER') throw new Error('Владельца удалить нельзя');

  await prisma.$transaction([
    prisma.member.delete({ where: { id: memberId } }),
    prisma.activityLog.create({
      data: {
        organizationId: member.organizationId,
        actorId: user.id,
        action: 'member.remove',
        targetType: 'member',
        targetId: member.id,
      },
    }),
    prisma.notification.create({
      data: {
        userId: member.userId,
        type: 'member.removed',
        payload: { organizationId: member.organizationId },
      },
    }),
  ]);
  revalidatePath('/admin/members');
}
