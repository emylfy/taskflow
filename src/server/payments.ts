import { prisma } from '@/lib/prisma';
import { getPayment } from '@/lib/yookassa';

export type ConfirmResult =
  | { status: 'activated' }
  | { status: 'already-active' }
  | { status: 'canceled' }
  | { status: 'pending' }
  | { status: 'unknown' };

// Боевая проверка платежа: перезапрашиваем статус напрямую из API ЮKassa
// (запрос авторизован секретным ключом — подделать ответ нельзя) и при успехе
// активируем подписку. Идемпотентно по providerId. Один источник правды для
// двух вызывающих: вебхука /api/webhooks/yookassa и обработчика возврата на
// /admin/billing (локально вебхук не может достучаться до localhost — там
// активацию выполняет именно возврат).
export async function confirmPaymentById(paymentId: string): Promise<ConfirmResult> {
  const existing = await prisma.payment.findUnique({ where: { providerId: paymentId } });
  if (!existing) return { status: 'unknown' };
  // Идемпотентность: повторная проверка уже проведённого платежа.
  if (existing.status === 'SUCCESS') return { status: 'already-active' };

  const payment = await getPayment(paymentId);

  if (payment.status === 'succeeded' && payment.paid) {
    const sub = await prisma.subscription.findUnique({
      where: { id: existing.subscriptionId },
      include: { organization: { include: { members: { where: { role: 'OWNER' } } } } },
    });
    if (!sub) return { status: 'unknown' };

    // Активация + продление expiresAt на 30 дней от max(now, expiresAt).
    // Прежняя активная подписка организации переводится в EXPIRED.
    const newExpiresAt = new Date(Math.max(Date.now(), sub.expiresAt.getTime()) + 30 * 24 * 60 * 60 * 1000);
    const ownerId = sub.organization.members[0]?.userId;

    await prisma.$transaction([
      prisma.payment.update({
        where: { providerId: paymentId },
        data: { status: 'SUCCESS', paidAt: new Date() },
      }),
      prisma.subscription.updateMany({
        where: { organizationId: sub.organizationId, status: 'ACTIVE', NOT: { id: sub.id } },
        data: { status: 'EXPIRED' },
      }),
      prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'ACTIVE', expiresAt: newExpiresAt },
      }),
      prisma.activityLog.create({
        data: {
          organizationId: sub.organizationId,
          actorId: ownerId ?? sub.organizationId,
          action: 'subscription.payment.succeeded',
          targetType: 'subscription',
          targetId: sub.id,
        },
      }),
      ...(ownerId
        ? [
            prisma.notification.create({
              data: {
                userId: ownerId,
                type: 'subscription.activated',
                payload: {
                  subscriptionId: sub.id,
                  planId: sub.planId,
                  amountRub: existing.amountRub,
                  expiresAt: newExpiresAt.toISOString(),
                },
              },
            }),
          ]
        : []),
    ]);
    return { status: 'activated' };
  }

  if (payment.status === 'canceled') {
    const sub = await prisma.subscription.findUnique({ where: { id: existing.subscriptionId } });
    await prisma.$transaction([
      prisma.payment.update({ where: { providerId: paymentId }, data: { status: 'FAILED' } }),
      ...(sub && sub.status === 'PENDING'
        ? [prisma.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELLED' } })]
        : []),
    ]);
    return { status: 'canceled' };
  }

  return { status: 'pending' };
}

// Находит последний ожидающий платёж организации и проверяет его. Нужно для
// обработки возврата с ЮKassa, когда id платежа в URL отсутствует. При запуске
// оплаты прежние PENDING-подписки отменяются, поэтому ожидающий платёж в норме
// один. Безопасно/идемпотентно: если платежей нет — возвращает 'unknown'.
export async function confirmPendingPaymentForOrg(organizationId: string): Promise<ConfirmResult> {
  const payment = await prisma.payment.findFirst({
    where: { status: 'PENDING', subscription: { organizationId, status: 'PENDING' } },
    orderBy: { id: 'desc' }, // cuid лексикографически сортируется по времени создания
  });
  if (!payment) return { status: 'unknown' };
  return confirmPaymentById(payment.providerId);
}
