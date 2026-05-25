'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

export type NotificationFilter = 'all' | 'unread' | 'mentions';

export async function listNotifications(filter: NotificationFilter = 'all') {
  const user = await requireUser();
  const where: { userId: string; readAt?: null; type?: { in: string[] } } = { userId: user.id };
  if (filter === 'unread') where.readAt = null;
  if (filter === 'mentions') where.type = { in: ['mention', 'comment.mention'] };

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function getUnreadCount(): Promise<number> {
  const user = await requireUser();
  return prisma.notification.count({ where: { userId: user.id, readAt: null } });
}

export async function getCounts(): Promise<{ all: number; unread: number; mentions: number }> {
  const user = await requireUser();
  const [all, unread, mentions] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id } }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.notification.count({
      where: { userId: user.id, type: { in: ['mention', 'comment.mention'] } },
    }),
  ]);
  return { all, unread, mentions };
}

export async function markAsRead(notificationId: string) {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath('/notifications');
}

export async function markAllAsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath('/notifications');
}
