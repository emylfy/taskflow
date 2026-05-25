'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { FREE_FEATURES } from '@/lib/plan-limits';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ёЁ]/g, 'е')
    .replace(/[а-я]/g, (c) => {
      const map: Record<string, string> = {
        а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z',
        и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
        р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch',
        ш: 'sh', щ: 'sch', ы: 'y', э: 'e', ю: 'yu', я: 'ya', ь: '', ъ: '',
      };
      return map[c] ?? c;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

// Создаёт организацию для текущего пользователя если у него ещё нет членства.
// Используется как первичная регистрация: пользователь нажал «Создать организацию»,
// получил magic-link, после клика по ссылке мы попадаем сюда.
export async function ensureOwnerOrganization(input: { orgName: string; userName?: string }) {
  const user = await requireUser();

  const existing = await prisma.member.findFirst({ where: { userId: user.id } });
  if (existing) return { organizationId: existing.organizationId, created: false };

  const baseName = input.orgName.trim() || `Организация ${user.name ?? user.email}`;
  let slug = slugify(baseName) || 'org';
  // На случай конфликтов — добавляем суффикс.
  let attempt = 0;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${slugify(baseName) || 'org'}-${attempt}`;
    if (attempt > 30) throw new Error('Не удалось подобрать уникальный slug организации');
  }

  // Также правим имя пользователя, если оно пришло из формы регистрации.
  if (input.userName && (!user.name || user.name === user.email.split('@')[0])) {
    await prisma.user.update({ where: { id: user.id }, data: { name: input.userName } });
  }

  const freePlan = await prisma.plan.findFirst({ where: { priceRub: 0 } });

  const org = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: baseName,
        slug,
        members: { create: { userId: user.id, role: 'OWNER' } },
      },
    });
    if (freePlan) {
      await tx.subscription.create({
        data: {
          id: `${org.id}-free`,
          organizationId: org.id,
          planId: freePlan.id,
          status: 'ACTIVE',
          expiresAt: new Date('2099-01-01'),
        },
      });
    }
    await tx.activityLog.create({
      data: {
        organizationId: org.id,
        actorId: user.id,
        action: 'organization.create',
        targetType: 'organization',
        targetId: org.id,
      },
    });
    return org;
  });

  // Если features используется только для UI — display нам не нужен здесь, но
  // выводим в лог в DEMO_MODE для удобства разработки.
  if (process.env.DEMO_MODE === 'true') {
    console.log(
      `[org:create] "${org.name}" (slug=${org.slug}) для ${user.email}, тариф «Бесплатный» (лимит ${FREE_FEATURES.limits.maxProjects} проектов)`
    );
  }

  revalidatePath('/projects');
  return { organizationId: org.id, created: true };
}
