import { prisma } from '@/lib/prisma';

/**
 * Журнал действий (ActivityLog) хранит только тип объекта (targetType) и его id
 * (targetId) — без человекочитаемого имени. Чтобы и журнал, и виджет «Последние
 * действия» показывали название задачи/проекта/имя участника, а не литерал «task»
 * с сырым cuid, имена резолвим пакетными запросами на момент отображения.
 */

export const TARGET_TYPE_RU: Record<string, string> = {
  task: 'задача',
  project: 'проект',
  member: 'участник',
  subscription: 'подписка',
  organization: 'организация',
};

type Labelable = { targetType: string; targetId: string };

export async function withTargetLabels<T extends Labelable>(
  logs: T[],
): Promise<(T & { targetLabel: string | null })[]> {
  const taskIds = new Set<string>();
  const projectIds = new Set<string>();
  const memberIds = new Set<string>();
  for (const l of logs) {
    if (l.targetType === 'task') taskIds.add(l.targetId);
    else if (l.targetType === 'project') projectIds.add(l.targetId);
    else if (l.targetType === 'member') memberIds.add(l.targetId);
  }

  const [tasks, projects, members] = await Promise.all([
    taskIds.size
      ? prisma.task.findMany({ where: { id: { in: [...taskIds] } }, select: { id: true, title: true } })
      : Promise.resolve([]),
    projectIds.size
      ? prisma.project.findMany({ where: { id: { in: [...projectIds] } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    memberIds.size
      ? prisma.member.findMany({
          where: { id: { in: [...memberIds] } },
          select: { id: true, user: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const labels = new Map<string, string>();
  for (const t of tasks) labels.set(t.id, t.title);
  for (const p of projects) labels.set(p.id, p.name);
  for (const m of members) labels.set(m.id, m.user.name);

  return logs.map((l) => ({ ...l, targetLabel: labels.get(l.targetId) ?? null }));
}
