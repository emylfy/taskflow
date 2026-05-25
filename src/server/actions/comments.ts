'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { broadcast } from '@/server/ws-broadcast';
import { sendEmail } from '@/lib/email';

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

  // Резолвим упоминания по участникам организации (по локальной части email,
  // полному имени без пробелов или первому слову имени) — а не по фиктивному
  // адресу вида @имя@taskflow.ru.
  const tokens = Array.from(new Set(Array.from(content.matchAll(MENTION_RE)).map((m) => m[1].toLowerCase())));
  if (tokens.length) {
    const orgMembers = await prisma.member.findMany({
      where: { organizationId: task.project.organizationId },
      select: { user: { select: { id: true, name: true, email: true } } },
    });
    const matched = orgMembers
      .map((m) => m.user)
      .filter((u) => {
        const local = u.email.split('@')[0].toLowerCase();
        const nameKey = u.name.toLowerCase().replace(/\s+/g, '');
        const firstName = u.name.toLowerCase().split(/\s+/)[0];
        return tokens.some((t) => t === local || t === nameKey || t === firstName);
      })
      .filter((u) => u.id !== user.id);

    if (matched.length) {
      await prisma.notification.createMany({
        data: matched.map((u) => ({
          userId: u.id,
          type: 'mention',
          payload: { taskId: input.taskId, commentId: comment.id, actorId: user.id, projectId: task.projectId },
        })),
      });
      const url = `${process.env.BETTER_AUTH_URL ?? ''}/projects/${task.projectId}/tasks/${input.taskId}`;
      await Promise.all(
        matched.map((u) =>
          sendEmail({
            to: u.email,
            subject: 'Вас упомянули в задаче — TaskFlow',
            text: `${user.name ?? user.email} упомянул(а) вас в комментарии:\n\n«${content}»\n\nОткрыть задачу: ${url}`,
          }).catch((e) => console.error('mention email error:', e)),
        ),
      );
    }
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
