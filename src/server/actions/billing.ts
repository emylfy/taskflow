'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { createPayment } from '@/lib/yookassa';

export async function startCheckout(input: { organizationId: string; planId: string }) {
  const user = await requireUser();
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: input.organizationId } },
  });
  if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
    throw new Error('Оплату проводит владелец или администратор организации');
  }

  const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
  if (!plan) throw new Error('Тариф не найден');

  // Бесплатный тариф активируем напрямую — без обращения в ЮKassa.
  if (plan.priceRub === 0) {
    const freeSubId = `${input.organizationId}-free`;
    await prisma.$transaction([
      prisma.subscription.updateMany({
        where: { organizationId: input.organizationId, status: 'ACTIVE', NOT: { id: freeSubId } },
        data: { status: 'EXPIRED' },
      }),
      prisma.subscription.upsert({
        where: { id: freeSubId },
        create: {
          id: freeSubId,
          organizationId: input.organizationId,
          planId: plan.id,
          status: 'ACTIVE',
          expiresAt: new Date('2099-01-01'),
        },
        update: { planId: plan.id, status: 'ACTIVE', expiresAt: new Date('2099-01-01') },
      }),
      prisma.activityLog.create({
        data: {
          organizationId: input.organizationId,
          actorId: user.id,
          action: 'subscription.activate.free',
          targetType: 'plan',
          targetId: plan.id,
        },
      }),
    ]);
    revalidatePath('/admin/billing');
    redirect('/admin/billing?status=free-activated');
  }

  const returnUrl = `${process.env.BETTER_AUTH_URL}/admin/billing?return=1`;
  const payment = await createPayment({
    amountRub: plan.priceRub,
    description: `TaskFlow · тариф «${plan.name}»`,
    returnUrl,
    metadata: { organizationId: input.organizationId, planId: plan.id, userId: user.id },
  });

  // Создаём подписку в статусе PENDING. Активируется только после
  // подтверждения оплаты в webhook /api/webhooks/yookassa.
  await prisma.$transaction(async (tx) => {
    // Снимаем предыдущие PENDING-подписки этой организации, чтобы
    // не накапливать «висящие» попытки оплаты.
    await tx.subscription.updateMany({
      where: { organizationId: input.organizationId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    const subscription = await tx.subscription.create({
      data: {
        organizationId: input.organizationId,
        planId: plan.id,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await tx.payment.create({
      data: {
        subscriptionId: subscription.id,
        amountRub: plan.priceRub,
        providerId: payment.id,
        status: 'PENDING',
      },
    });

    await tx.activityLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: user.id,
        action: 'subscription.checkout',
        targetType: 'plan',
        targetId: plan.id,
      },
    });
  });

  const confirmationUrl = payment.confirmation.confirmation_url;
  if (confirmationUrl) redirect(confirmationUrl);
  return { paymentId: payment.id };
}

// Текущая активная подписка организации — для рендера /admin/billing.
export async function getCurrentSubscription(organizationId: string) {
  return prisma.subscription.findFirst({
    where: { organizationId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    include: { plan: true },
    orderBy: { expiresAt: 'desc' },
  });
}

// Обёртка для использования в form action (которое требует Promise<void>).
// Биндим через .bind(null, input) и forms передают formData как _fd.
export async function startCheckoutForm(input: { organizationId: string; planId: string }) {
  await startCheckout(input);
}
