'use server';

import { redirect } from 'next/navigation';
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

  if (plan.priceRub === 0) {
    await prisma.subscription.upsert({
      where: { id: `${input.organizationId}-free` },
      create: {
        id: `${input.organizationId}-free`,
        organizationId: input.organizationId,
        planId: plan.id,
        status: 'ACTIVE',
        expiresAt: new Date('2099-01-01'),
      },
      update: { planId: plan.id, status: 'ACTIVE' },
    });
    redirect('/admin/billing');
  }

  const returnUrl = `${process.env.BETTER_AUTH_URL}/admin/billing?return=1`;
  const payment = await createPayment({
    amountRub: plan.priceRub,
    description: `TaskFlow · тариф «${plan.name}»`,
    returnUrl,
    metadata: { organizationId: input.organizationId, planId: plan.id, userId: user.id },
  });

  const subscription = await prisma.subscription.create({
    data: {
      organizationId: input.organizationId,
      planId: plan.id,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.payment.create({
    data: {
      subscriptionId: subscription.id,
      amountRub: plan.priceRub,
      providerId: payment.id,
      status: 'PENDING',
    },
  });

  const confirmationUrl = payment.confirmation.confirmation_url;
  if (confirmationUrl) redirect(confirmationUrl);
  return { paymentId: payment.id };
}
