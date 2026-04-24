'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
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

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  let target = existing;
  if (!target) {
    target = await prisma.user.create({
      data: {
        email: input.email,
        name: input.email.split('@')[0],
      },
    });
  }

  const member = await prisma.member.upsert({
    where: { userId_organizationId: { userId: target.id, organizationId: input.organizationId } },
    create: {
      userId: target.id,
      organizationId: input.organizationId,
      role: input.role,
    },
    update: { role: input.role },
  });

  await prisma.activityLog.create({
    data: {
      organizationId: input.organizationId,
      actorId: user.id,
      action: 'member.invite',
      targetType: 'member',
      targetId: member.id,
    },
  });

  revalidatePath('/admin/members');
  return member;
}

export async function changeMemberRole(input: { memberId: string; role: MemberRole }) {
  const user = await requireUser();
  const member = await prisma.member.findUnique({ where: { id: input.memberId } });
  if (!member) throw new Error('Участник не найден');
  await requireAdmin(user.id, member.organizationId);

  const updated = await prisma.member.update({
    where: { id: input.memberId },
    data: { role: input.role },
  });
  revalidatePath('/admin/members');
  return updated;
}

export async function removeMember(memberId: string) {
  const user = await requireUser();
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw new Error('Участник не найден');
  await requireAdmin(user.id, member.organizationId);
  if (member.role === 'OWNER') throw new Error('Владельца удалить нельзя');
  await prisma.member.delete({ where: { id: memberId } });
  revalidatePath('/admin/members');
}
