'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { broadcast } from '@/server/ws-broadcast';

async function assertProjectAccess(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, organizationId: true },
  });
  if (!project) throw new Error('Проект не найден');
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId: project.organizationId } },
  });
  if (!member) throw new Error('Нет прав на этот проект');
  return project;
}

export async function sendChatMessage(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get('projectId') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();

  if (!projectId) throw new Error('Не указан проект');
  if (!content) throw new Error('Сообщение не может быть пустым');
  if (content.length > 4000) throw new Error('Сообщение слишком длинное (макс. 4000 символов)');

  await assertProjectAccess(user.id, projectId);

  const message = await prisma.chatMessage.create({
    data: { projectId, authorId: user.id, content },
    include: { author: { select: { id: true, name: true } } },
  });

  broadcast(`chat-${projectId}`, { type: 'chat:message', payload: message });
  revalidatePath(`/chat/${projectId}`);
  return message;
}

export async function listChatMessages(projectId: string, limit = 50) {
  const user = await requireUser();
  await assertProjectAccess(user.id, projectId);

  return prisma.chatMessage.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { author: { select: { id: true, name: true } } },
  });
}
