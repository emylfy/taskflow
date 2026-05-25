'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { broadcast } from '@/server/ws-broadcast';
import { sendEmail } from '@/lib/email';
import type { TaskStatus, Priority } from '@prisma/client';

async function assertProjectAccess(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, organizationId: true },
  });
  if (!project) throw new Error('Проект не найден');
  const member = await prisma.member.findUnique({
    where: {
      userId_organizationId: { userId, organizationId: project.organizationId },
    },
  });
  if (!member) throw new Error('Нет прав на проект');
  return { project, member };
}

export async function createTask(input: {
  projectId: string;
  title: string;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string;
  dueDate?: Date | null;
}) {
  const user = await requireUser();
  const { project } = await assertProjectAccess(user.id, input.projectId);

  const status = input.status ?? 'TODO';
  const last = await prisma.task.findFirst({
    where: { projectId: input.projectId, status },
    orderBy: { orderIndex: 'desc' },
    select: { orderIndex: true },
  });
  const orderIndex = (last?.orderIndex ?? -1) + 1;

  const task = await prisma.task.create({
    data: {
      title: input.title,
      projectId: input.projectId,
      status,
      priority: input.priority ?? 'MEDIUM',
      assigneeId: input.assigneeId,
      dueDate: input.dueDate ?? null,
      orderIndex,
    },
  });

  await prisma.activityLog.create({
    data: {
      organizationId: project.organizationId,
      actorId: user.id,
      action: 'task.create',
      targetType: 'task',
      targetId: task.id,
    },
  });

  broadcast(`project-${input.projectId}`, { type: 'task:created', payload: task });
  revalidatePath(`/projects/${input.projectId}`);
  return task;
}

export async function moveTask(input: {
  taskId: string;
  status: TaskStatus;
  orderIndex: number;
}) {
  const user = await requireUser();
  const task = await prisma.task.findUnique({
    where: { id: input.taskId },
    select: { id: true, projectId: true, status: true, orderIndex: true, assigneeId: true },
  });
  if (!task) throw new Error('Задача не найдена');
  const { project } = await assertProjectAccess(user.id, task.projectId);

  const updated = await prisma.$transaction(async (tx) => {
    if (task.status !== input.status) {
      await tx.task.updateMany({
        where: { projectId: task.projectId, status: task.status, orderIndex: { gt: task.orderIndex } },
        data: { orderIndex: { decrement: 1 } },
      });
      await tx.task.updateMany({
        where: { projectId: task.projectId, status: input.status, orderIndex: { gte: input.orderIndex } },
        data: { orderIndex: { increment: 1 } },
      });
    } else {
      if (input.orderIndex < task.orderIndex) {
        await tx.task.updateMany({
          where: {
            projectId: task.projectId,
            status: task.status,
            orderIndex: { gte: input.orderIndex, lt: task.orderIndex },
          },
          data: { orderIndex: { increment: 1 } },
        });
      } else if (input.orderIndex > task.orderIndex) {
        await tx.task.updateMany({
          where: {
            projectId: task.projectId,
            status: task.status,
            orderIndex: { gt: task.orderIndex, lte: input.orderIndex },
          },
          data: { orderIndex: { decrement: 1 } },
        });
      }
    }

    const result = await tx.task.update({
      where: { id: input.taskId },
      data: { status: input.status, orderIndex: input.orderIndex },
    });

    if (task.status !== input.status) {
      await tx.activityLog.create({
        data: {
          organizationId: project.organizationId,
          actorId: user.id,
          action: `task.status.${input.status.toLowerCase()}`,
          targetType: 'task',
          targetId: input.taskId,
        },
      });
      // Если статус сменился на DONE и задача назначена на кого-то
      // отличного от текущего юзера — уведомим автора назначения.
      if (input.status === 'DONE' && task.assigneeId && task.assigneeId !== user.id) {
        await tx.notification.create({
          data: {
            userId: task.assigneeId,
            type: 'task.completed',
            payload: { taskId: input.taskId, projectId: task.projectId, by: user.name ?? user.email },
          },
        });
      }
    }
    return result;
  });

  broadcast(`project-${task.projectId}`, { type: 'task:moved', payload: updated });
  revalidatePath(`/projects/${task.projectId}`);
  return updated;
}

export async function updateTask(input: {
  taskId: string;
  title?: string;
  description?: string | null;
  priority?: Priority;
  assigneeId?: string | null;
  dueDate?: Date | null;
}) {
  const user = await requireUser();
  const existing = await prisma.task.findUnique({
    where: { id: input.taskId },
    select: { projectId: true, assigneeId: true, project: { select: { organizationId: true } } },
  });
  if (!existing) throw new Error('Задача не найдена');
  await assertProjectAccess(user.id, existing.projectId);

  const { taskId, ...data } = input;
  const task = await prisma.task.update({ where: { id: taskId }, data });

  // Если сменился исполнитель — лог + уведомление новому исполнителю.
  if (input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId) {
    await prisma.activityLog.create({
      data: {
        organizationId: existing.project.organizationId,
        actorId: user.id,
        action: 'task.assignee.change',
        targetType: 'task',
        targetId: taskId,
      },
    });
    if (input.assigneeId && input.assigneeId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: input.assigneeId,
          type: 'task.assigned',
          payload: { taskId, projectId: existing.projectId, by: user.name ?? user.email },
        },
      });
      const assignee = await prisma.user.findUnique({
        where: { id: input.assigneeId },
        select: { email: true },
      });
      if (assignee) {
        const url = `${process.env.BETTER_AUTH_URL ?? ''}/projects/${existing.projectId}/tasks/${taskId}`;
        await sendEmail({
          to: assignee.email,
          subject: 'Вам назначена задача — TaskFlow',
          text: `${user.name ?? user.email} назначил(а) вам задачу «${task.title}».\n\nОткрыть: ${url}`,
        }).catch((e) => console.error('assignment email error:', e));
      }
    }
  }

  broadcast(`project-${existing.projectId}`, { type: 'task:updated', payload: task });
  revalidatePath(`/projects/${existing.projectId}/tasks/${taskId}`);
  return task;
}

export async function deleteTask(taskId: string) {
  const user = await requireUser();
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true, project: { select: { organizationId: true } } },
  });
  if (!existing) throw new Error('Задача не найдена');
  await assertProjectAccess(user.id, existing.projectId);
  await prisma.$transaction([
    prisma.task.delete({ where: { id: taskId } }),
    prisma.activityLog.create({
      data: {
        organizationId: existing.project.organizationId,
        actorId: user.id,
        action: 'task.delete',
        targetType: 'task',
        targetId: taskId,
      },
    }),
  ]);
  broadcast(`project-${existing.projectId}`, { type: 'task:deleted', payload: { id: taskId } });
  revalidatePath(`/projects/${existing.projectId}`);
}

// Новая версия нарезается не чаще, чем раз в VERSION_INTERVAL_MS; частые правки
// внутри интервала коалесцируются в текущую версию. Храним последние MAX_VERSIONS.
const VERSION_INTERVAL_MS = 90_000;
const MAX_VERSIONS = 20;

export async function saveYjsSnapshot(taskId: string, snapshot: Uint8Array) {
  const user = await requireUser();
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  if (!existing) throw new Error('Задача не найдена');
  await assertProjectAccess(user.id, existing.projectId);

  const buf = Buffer.from(snapshot);
  const latest = await prisma.yjsSnapshot.findFirst({
    where: { taskId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, updatedAt: true },
  });

  if (latest && Date.now() - latest.updatedAt.getTime() < VERSION_INTERVAL_MS) {
    await prisma.yjsSnapshot.update({ where: { id: latest.id }, data: { snapshot: buf } });
  } else {
    await prisma.yjsSnapshot.create({ data: { taskId, snapshot: buf } });
    const stale = await prisma.yjsSnapshot.findMany({
      where: { taskId },
      orderBy: { updatedAt: 'desc' },
      skip: MAX_VERSIONS,
      select: { id: true },
    });
    if (stale.length) {
      await prisma.yjsSnapshot.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
    }
  }
}

// Возвращает байты выбранной версии (base64) и логирует откат. Само применение
// (замена содержимого описания) происходит на клиенте через BlockNote, чтобы
// корректно распространиться остальным участникам совместного редактирования.
export async function restoreVersion(taskId: string, versionId: string): Promise<string> {
  const user = await requireUser();
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true, project: { select: { organizationId: true } } },
  });
  if (!task) throw new Error('Задача не найдена');
  await assertProjectAccess(user.id, task.projectId);

  const version = await prisma.yjsSnapshot.findFirst({ where: { id: versionId, taskId } });
  if (!version) throw new Error('Версия не найдена');

  await prisma.activityLog.create({
    data: {
      organizationId: task.project.organizationId,
      actorId: user.id,
      action: 'task.version.restore',
      targetType: 'task',
      targetId: taskId,
    },
  });

  return Buffer.from(version.snapshot).toString('base64');
}
