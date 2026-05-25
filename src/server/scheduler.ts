import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

const HOUR = 60 * 60 * 1000;
const WINDOW_MS = 24 * HOUR; // напоминаем за сутки до срока

// Один проход: задачи со сроком в ближайшие 24ч, с исполнителем и не DONE,
// которым ещё не отправляли напоминание (дедуп по существующему уведомлению).
async function runDueReminders(): Promise<void> {
  const now = new Date();
  const soon = new Date(now.getTime() + WINDOW_MS);

  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: now, lte: soon },
      assigneeId: { not: null },
      status: { not: 'DONE' },
    },
    select: {
      id: true,
      title: true,
      projectId: true,
      dueDate: true,
      assigneeId: true,
      assignee: { select: { email: true } },
    },
  });

  for (const t of tasks) {
    if (!t.assigneeId) continue;
    const already = await prisma.notification.findFirst({
      where: { userId: t.assigneeId, type: 'task.due_soon', payload: { path: ['taskId'], equals: t.id } },
      select: { id: true },
    });
    if (already) continue;

    await prisma.notification.create({
      data: {
        userId: t.assigneeId,
        type: 'task.due_soon',
        payload: { taskId: t.id, projectId: t.projectId, dueDate: t.dueDate?.toISOString() ?? null },
      },
    });

    if (t.assignee?.email) {
      const url = `${process.env.BETTER_AUTH_URL ?? ''}/projects/${t.projectId}/tasks/${t.id}`;
      const due = t.dueDate ? t.dueDate.toLocaleString('ru-RU') : '';
      await sendEmail({
        to: t.assignee.email,
        subject: 'Срок задачи приближается — TaskFlow',
        text: `Приближается срок задачи «${t.title}» (${due}).\n\nОткрыть: ${url}`,
      }).catch((e) => console.error('due-reminder email error:', e));
    }
  }
}

let started = false;

export function startDueReminderScheduler(): void {
  if (started) return;
  started = true;
  // Первый прогон через минуту после старта, далее — раз в час.
  setTimeout(() => {
    runDueReminders().catch((e) => console.error('due reminders error:', e));
    setInterval(() => {
      runDueReminders().catch((e) => console.error('due reminders error:', e));
    }, HOUR);
  }, 60 * 1000).unref?.();
}
