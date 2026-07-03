import { NextResponse } from 'next/server';
import { confirmPaymentById } from '@/server/payments';

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

  // ЮKassa НЕ подписывает уведомления — телу доверять нельзя. Боевая проверка
  // (перезапрос платежа из API) и активация подписки выполняются в общем
  // хелпере confirmPaymentById — тот же код использует обработчик возврата на
  // /admin/billing. IP-фильтра на эндпоинте нет — целостность обеспечивает
  // именно перезапрос из API: подделанное тело не активирует подписку.
  let result;
  try {
    result = await confirmPaymentById(paymentId);
  } catch (e) {
    console.error('ЮKassa getPayment не удался:', e);
    return NextResponse.json({ error: 'cannot verify payment' }, { status: 502 });
  }

  if (result.status === 'unknown') {
    return NextResponse.json({ error: 'unknown payment' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, status: result.status });
}
