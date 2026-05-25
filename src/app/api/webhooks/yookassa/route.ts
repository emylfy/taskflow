import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/yookassa';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type YooNotification = {
  type: string;
  event: string;
  object: {
    id: string;
    status: string;
    paid?: boolean;
    metadata?: { organizationId?: string; planId?: string };
  };
};

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get('x-yoomoney-sha256') ?? req.headers.get('x-yookassa-signature');
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: 'bad signature' }, { status: 403 });
  }

  let body: YooNotification;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const providerId = body.object.id;
  const existing = await prisma.payment.findUnique({ where: { providerId } });
  if (!existing) {
    return NextResponse.json({ error: 'unknown payment' }, { status: 404 });
  }

  if (existing.status === 'SUCCESS') {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  if (body.event === 'payment.succeeded' && body.object.paid) {
    const sub = await prisma.subscription.findUnique({
      where: { id: existing.subscriptionId },
      include: { organization: { include: { members: { where: { role: 'OWNER' } } } } },
    });
    if (!sub) {
      return NextResponse.json({ error: 'subscription gone' }, { status: 410 });
    }

    // Активация подписки + продление expiresAt на 30 дней от max(now, expiresAt).
    // Если у организации уже есть активная подписка — переводим её в EXPIRED.
    const newExpiresAt = new Date(Math.max(Date.now(), sub.expiresAt.getTime()) + 30 * 24 * 60 * 60 * 1000);
    const ownerId = sub.organization.members[0]?.userId;

    await prisma.$transaction([
      prisma.payment.update({
        where: { providerId },
        data: { status: 'SUCCESS', paidAt: new Date() },
      }),
      prisma.subscription.updateMany({
        where: {
          organizationId: sub.organizationId,
          status: 'ACTIVE',
          NOT: { id: sub.id },
        },
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
  } else if (body.event === 'payment.canceled') {
    const sub = await prisma.subscription.findUnique({ where: { id: existing.subscriptionId } });
    await prisma.$transaction([
      prisma.payment.update({
        where: { providerId },
        data: { status: 'FAILED' },
      }),
      ...(sub && sub.status === 'PENDING'
        ? [prisma.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELLED' } })]
        : []),
    ]);
  }

  return NextResponse.json({ ok: true });
}
