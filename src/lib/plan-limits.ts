import { prisma } from './prisma';

// Структура `features` в Plan — JSON со следующими полями.
// Поле display оставлено для обратной совместимости с UI карточек тарифов.
// Поля limits и flags — реальные лимиты, проверяемые в server actions.

export type PlanLimits = {
  maxMembers: number; // -1 = безлимит
  maxProjects: number;
  versionRetentionDays: number;
};

export type PlanFlags = {
  sso: boolean;
  activityLog: boolean;
  auditExport: boolean;
  prioritySupport: boolean;
};

export type PlanFeatures = {
  display: string[];
  limits: PlanLimits;
  flags: PlanFlags;
};

export const FREE_FEATURES: PlanFeatures = {
  display: ['До 3 пользователей', 'До 2 проектов', 'История версий 7 дней', 'Канбан и комментарии'],
  limits: { maxMembers: 3, maxProjects: 2, versionRetentionDays: 7 },
  flags: { sso: false, activityLog: false, auditExport: false, prioritySupport: false },
};

export const TEAM_FEATURES: PlanFeatures = {
  display: [
    'До 20 пользователей',
    'Безлимит проектов',
    'История версий 90 дней',
    'Журнал действий',
    'Совместное редактирование',
  ],
  limits: { maxMembers: 20, maxProjects: -1, versionRetentionDays: 90 },
  flags: { sso: false, activityLog: true, auditExport: false, prioritySupport: false },
};

export const BUSINESS_FEATURES: PlanFeatures = {
  display: [
    'Безлимит пользователей и проектов',
    'История версий бессрочно',
    'SSO через Яндекс ID',
    'Экспорт журнала (152-ФЗ)',
    'Приоритетная поддержка',
  ],
  limits: { maxMembers: -1, maxProjects: -1, versionRetentionDays: -1 },
  flags: { sso: true, activityLog: true, auditExport: true, prioritySupport: true },
};

export function parseFeatures(raw: unknown): PlanFeatures {
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'limits' in raw && 'flags' in raw) {
    return raw as PlanFeatures;
  }
  // Старая схема: массив строк — трактуем как Free.
  if (Array.isArray(raw)) {
    return { ...FREE_FEATURES, display: (raw as unknown[]).map(String) };
  }
  return FREE_FEATURES;
}

export type ActivePlan = {
  subscriptionId: string;
  planId: string;
  planName: string;
  expiresAt: Date;
  features: PlanFeatures;
};

export async function getActivePlan(organizationId: string): Promise<ActivePlan | null> {
  const sub = await prisma.subscription.findFirst({
    where: {
      organizationId,
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
    },
    include: { plan: true },
    orderBy: { expiresAt: 'desc' },
  });
  if (!sub) return null;
  return {
    subscriptionId: sub.id,
    planId: sub.planId,
    planName: sub.plan.name,
    expiresAt: sub.expiresAt,
    features: parseFeatures(sub.plan.features),
  };
}

export class LimitExceededError extends Error {
  kind: 'projects' | 'members';
  limit: number;
  currentPlanName: string;

  constructor(kind: 'projects' | 'members', limit: number, currentPlanName: string) {
    const subject = kind === 'projects' ? 'проектов' : 'участников';
    super(
      `Достигнут лимит ${subject} (${limit}) для тарифа «${currentPlanName}». ` +
        `Перейдите на тариф выше в разделе «Подписка».`
    );
    this.kind = kind;
    this.limit = limit;
    this.currentPlanName = currentPlanName;
    this.name = 'LimitExceededError';
  }
}

export async function assertCanCreateProject(organizationId: string) {
  const active = await getActivePlan(organizationId);
  const features = active?.features ?? FREE_FEATURES;
  const cap = features.limits.maxProjects;
  if (cap === -1) return;
  const count = await prisma.project.count({ where: { organizationId } });
  if (count >= cap) {
    throw new LimitExceededError('projects', cap, active?.planName ?? 'Бесплатный');
  }
}

export async function assertCanInviteMember(organizationId: string) {
  const active = await getActivePlan(organizationId);
  const features = active?.features ?? FREE_FEATURES;
  const cap = features.limits.maxMembers;
  if (cap === -1) return;
  const count = await prisma.member.count({ where: { organizationId } });
  if (count >= cap) {
    throw new LimitExceededError('members', cap, active?.planName ?? 'Бесплатный');
  }
}
