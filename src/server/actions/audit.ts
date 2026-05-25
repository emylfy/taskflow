'use server';

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getActivePlan } from '@/lib/plan-limits';

export type AuditFilter = {
  action?: string;
  actorId?: string;
  from?: Date;
  to?: Date;
};

async function assertOrgAdmin(userId: string, organizationId: string) {
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
    throw new Error('Журнал доступен только администраторам');
  }
}

export async function listActivityLogs(organizationId: string, filter: AuditFilter = {}, take = 100) {
  const user = await requireUser();
  await assertOrgAdmin(user.id, organizationId);

  return prisma.activityLog.findMany({
    where: {
      organizationId,
      action: filter.action ? { contains: filter.action } : undefined,
      actorId: filter.actorId,
      createdAt: {
        gte: filter.from,
        lte: filter.to,
      },
    },
    include: { actor: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

// Возвращает CSV строку для скачивания. Доступно только если у организации
// активная подписка с flags.auditExport === true (тариф «Бизнес»).
export async function exportActivityCsv(organizationId: string): Promise<string> {
  const user = await requireUser();
  await assertOrgAdmin(user.id, organizationId);

  const plan = await getActivePlan(organizationId);
  if (!plan?.features.flags.auditExport) {
    throw new Error('Экспорт журнала доступен только на тарифе «Бизнес»');
  }

  const rows = await prisma.activityLog.findMany({
    where: { organizationId },
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10000, // hard cap для безопасности
  });

  const lines = [['createdAt', 'actorName', 'actorEmail', 'action', 'targetType', 'targetId'].join(',')];
  for (const r of rows) {
    const cells = [
      r.createdAt.toISOString(),
      r.actor.name,
      r.actor.email,
      r.action,
      r.targetType,
      r.targetId,
    ].map((s) => {
      const v = String(s ?? '');
      // CSV-эскейп: оборачиваем в кавычки и удваиваем существующие.
      return `"${v.replace(/"/g, '""')}"`;
    });
    lines.push(cells.join(','));
  }
  return lines.join('\n');
}
