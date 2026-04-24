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
    await prisma.$transaction([
      prisma.payment.update({
        where: { providerId },
        data: { status: 'SUCCESS', paidAt: new Date() },
      }),
      prisma.subscription.update({
        where: { id: existing.subscriptionId },
        data: { status: 'ACTIVE' },
      }),
    ]);
  } else if (body.event === 'payment.canceled') {
    await prisma.payment.update({
      where: { providerId },
      data: { status: 'FAILED' },
    });
  }

  return NextResponse.json({ ok: true });
}
