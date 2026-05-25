import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPayment } from '@/lib/yookassa';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type YooNotification = {
  type?: string;
  event?: string;
  object?: { id?: string };
};

export async function POST(req: Request) {
  const raw = await req.text();

  let body: YooNotification;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const paymentId = body.object?.id;
  if (!paymentId) {
    return NextResponse.json({ error: 'no payment id' }, { status: 400 });
  }

  // ЮKassa НЕ подписывает уведомления — телу доверять нельзя. Боевая проверка:
  // перезапрашиваем платёж напрямую из API (запрос авторизован нашим секретным
  // ключом, подделать ответ невозможно). Дополнительно ограничение по IP
  // отправителя настраивается на уровне Caddy (адреса ЮKassa публичны).
  let payment;
  try {
    payment = await getPayment(paymentId);
  } catch (e) {
    console.error('ЮKassa getPayment не удался:', e);
    return NextResponse.json({ error: 'cannot verify payment' }, { status: 502 });
  }

  const existing = await prisma.payment.findUnique({ where: { providerId: paymentId } });
  if (!existing) {
    return NextResponse.json({ error: 'unknown payment' }, { status: 404 });
  }

  // Идемпотентность: повторное уведомление по уже проведённому платежу.
  if (existing.status === 'SUCCESS') {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  if (payment.status === 'succeeded' && payment.paid) {
    const sub = await prisma.subscription.findUnique({
      where: { id: existing.subscriptionId },
      include: { organization: { include: { members: { where: { role: 'OWNER' } } } } },
    });
    if (!sub) {
      return NextResponse.json({ error: 'subscription gone' }, { status: 410 });
    }

    // Активация подписки + продление expiresAt на 30 дней от max(now, expiresAt).
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
  } else if (payment.status === 'canceled') {
    const sub = await prisma.subscription.findUnique({ where: { id: existing.subscriptionId } });
    await prisma.$transaction([
      prisma.payment.update({
        where: { providerId: paymentId },
        data: { status: 'FAILED' },
      }),
      ...(sub && sub.status === 'PENDING'
        ? [prisma.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELLED' } })]
        : []),
    ]);
  }

  return NextResponse.json({ ok: true });
}
