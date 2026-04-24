'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { broadcast } from '@/server/ws-broadcast';

const MENTION_RE = /@([а-яА-ЯёЁa-zA-Z0-9_-]+)/g;

export async function addComment(input: { taskId: string; content: string }) {
  const user = await requireUser();
  const content = input.content.trim();
  if (!content) throw new Error('Пустой комментарий');

  const task = await prisma.task.findUnique({
    where: { id: input.taskId },
    select: { projectId: true, project: { select: { organizationId: true } } },
  });
  if (!task) throw new Error('Задача не найдена');

  const member = await prisma.member.findUnique({
    where: {
      userId_organizationId: { userId: user.id, organizationId: task.project.organizationId },
    },
  });
  if (!member) throw new Error('Нет прав на задачу');

  const comment = await prisma.comment.create({
    data: { taskId: input.taskId, authorId: user.id, content },
  });

  const mentions = Array.from(content.matchAll(MENTION_RE)).map((m) => m[1]);
  if (mentions.length) {
    const mentioned = await prisma.user.findMany({
      where: { email: { in: mentions.map((m) => m + '@taskflow.ru') } },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: mentioned.map((u) => ({
        userId: u.id,
        type: 'mention',
        payload: { taskId: input.taskId, commentId: comment.id, actorId: user.id },
      })),
    });
  }

  broadcast(`task-${input.taskId}`, { type: 'comment:added', payload: comment });
  revalidatePath(`/projects/${task.projectId}/tasks/${input.taskId}`);
  return comment;
}

export async function deleteComment(commentId: string) {
  const user = await requireUser();
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, taskId: true, task: { select: { projectId: true } } },
  });
  if (!comment) throw new Error('Комментарий не найден');
  if (comment.authorId !== user.id) throw new Error('Комментарий можно удалить только автору');

  await prisma.comment.delete({ where: { id: commentId } });
  revalidatePath(`/projects/${comment.task.projectId}/tasks/${comment.taskId}`);
}
